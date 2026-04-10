"""
LP Rasyon Optimizasyonu — PuLP ile minimum maliyet
"""

from dataclasses import dataclass, field

import pulp


@dataclass
class LPConstraints:
    min_nel_mcal: float = 0.0        # Min NEL veya NEm+NEg (Mcal/gün)
    min_mp_g: float = 0.0            # Min MP (g/gün)
    min_ca_g: float = 0.0            # Min Ca (g/gün)
    min_p_g: float = 0.0             # Min P (g/gün)
    min_dm_kg: float = 0.0           # Min KM alımı (kg/gün)
    max_dm_kg: float = 30.0          # Max KM alımı (kg/gün)
    min_ndf_pct_dm: float | None = None   # Min NDF (% KM) — rumen sağlığı
    max_ndf_pct_dm: float | None = None   # Max NDF (% KM)
    ingredient_min: dict[int, float] = field(default_factory=dict)  # id → min kg
    ingredient_max: dict[int, float] = field(default_factory=dict)  # id → max kg


def optimize_ration(
    ingredients: list,
    constraints: LPConstraints,
    return_shadow_prices: bool = False,
) -> dict[int, float] | tuple[dict[int, float], dict[str, float]]:
    """
    LP ile minimum maliyetli rasyon hesapla.

    Args:
        ingredients: FeedIngredient listesi
        constraints: LPConstraints

    Returns:
        {ingredient_id: fresh_weight_kg} sözlüğü

    Raises:
        ValueError: Uygun çözüm bulunamazsa
    """
    prob = pulp.LpProblem("TMR_Minimum_Cost", pulp.LpMinimize)

    # Karar değişkenleri: her hammadde için taze ağırlık (kg/gün)
    vars_fresh = {}
    for ing in ingredients:
        min_kg = constraints.ingredient_min.get(ing.id, 0.0)
        max_kg = constraints.ingredient_max.get(ing.id, None)
        vars_fresh[ing.id] = pulp.LpVariable(
            f"x_{ing.id}",
            lowBound=min_kg,
            upBound=max_kg,
            cat="Continuous",
        )

    # Amaç fonksiyonu: toplam maliyet minimize
    prob += pulp.lpSum(
        vars_fresh[ing.id] * (ing.price_per_kg_tl or 0.0)
        for ing in ingredients
    ), "Toplam_Maliyet"

    # KM başına hesaplamalar için yardımcı (dm_var = fresh × dm%)
    def dm(ing):
        return vars_fresh[ing.id] * ((ing.dm_pct or 100) / 100)

    # KM alımı kısıtları
    total_dm = pulp.lpSum(dm(ing) for ing in ingredients)
    prob += total_dm >= constraints.min_dm_kg, "Min_DM"
    prob += total_dm <= constraints.max_dm_kg, "Max_DM"

    # NEL kısıtı
    if constraints.min_nel_mcal > 0:
        prob += pulp.lpSum(
            dm(ing) * (ing.nel_mcal_kg or 0)
            for ing in ingredients
        ) >= constraints.min_nel_mcal, "Min_NEL"

    # MP kısıtı — hammadde başına RDP/RUP bazlı hesaplama (NRC 2023)
    # MP_i = DM_i × CP_i × [(RDP_i/100 × 0.85 × 0.64) + (RUP_i/100 × 0.80)]
    # RDP/RUP verisi yoksa: CP × 0.67 fallback
    if constraints.min_mp_g > 0:
        def mp_factor(ing) -> float:
            cp = (ing.cp_pct or 0) / 100
            rdp = ing.rdp_pct
            rup = ing.rup_pct
            if rdp is not None and rup is not None and (rdp + rup) > 0:
                # RDP ve RUP % CP cinsinden
                rdp_frac = rdp / 100
                rup_frac = rup / 100
                return cp * (rdp_frac * 0.85 * 0.64 + rup_frac * 0.80) * 1000  # g/kg DM
            # Fallback: genel MP/CP = 0.67
            return cp * 0.67 * 1000  # g/kg DM

        prob += pulp.lpSum(
            dm(ing) * mp_factor(ing)
            for ing in ingredients
        ) >= constraints.min_mp_g, "Min_MP"

    # Kalsiyum kısıtı
    if constraints.min_ca_g > 0:
        prob += pulp.lpSum(
            dm(ing) * (ing.ca_pct or 0) * 10
            for ing in ingredients
        ) >= constraints.min_ca_g, "Min_Ca"

    # Fosfor kısıtı
    if constraints.min_p_g > 0:
        prob += pulp.lpSum(
            dm(ing) * (ing.p_pct or 0) * 10
            for ing in ingredients
        ) >= constraints.min_p_g, "Min_P"

    # NDF kısıtları — oransal kısıt: toplam_NDF_kg = NDF% × toplam_DM_kg
    total_ndf = pulp.lpSum(
        dm(ing) * (ing.ndf_pct or 0) / 100
        for ing in ingredients
    )
    # Minimum NDF (rumen sağlığı): süt sığırı ≥ %28, besi ≥ %20 tavsiye
    if constraints.min_ndf_pct_dm:
        prob += total_ndf >= constraints.min_ndf_pct_dm / 100 * total_dm, "Min_NDF"

    if constraints.max_ndf_pct_dm:
        prob += total_ndf <= constraints.max_ndf_pct_dm / 100 * total_dm, "Max_NDF"

    # Çöz
    prob.solve(pulp.PULP_CBC_CMD(msg=0))

    status = pulp.LpStatus[prob.status]
    if status != "Optimal":
        raise ValueError(
            f"LP çözüm bulunamadı (durum: {status}). "
            "Kısıtları gevşetin veya daha fazla hammadde ekleyin."
        )

    solution = {
        ing.id: round(pulp.value(vars_fresh[ing.id]), 3)
        for ing in ingredients
        if pulp.value(vars_fresh[ing.id]) > 0.001
    }

    if not return_shadow_prices:
        return solution

    # Gölge fiyatları (dual değerler): her kısıt için TL/birim
    LABELS = {
        "Min_DM":  "Min KM (kg/gün)",
        "Max_DM":  "Max KM (kg/gün)",
        "Min_NEL": "Min Enerji (Mcal/gün)",
        "Min_MP":  "Min MP (g/gün)",
        "Min_Ca":  "Min Ca (g/gün)",
        "Min_P":   "Min P (g/gün)",
        "Min_NDF": "Min NDF (% KM)",
        "Max_NDF": "Max NDF (% KM)",
    }
    shadow: dict[str, float] = {}
    for name, con in prob.constraints.items():
        pi = con.pi  # dual value
        if pi is not None and abs(pi) > 1e-6:
            label = LABELS.get(name, name)
            shadow[label] = round(pi, 4)

    return solution, shadow
