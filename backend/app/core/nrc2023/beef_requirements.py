"""
NRC 2023 Besi Sığırı Besin İhtiyaçları
Referans: NRC Beef Cattle (2023 güncel değerler)
"""

from dataclasses import dataclass

from app.core.nrc2023.formulas import NutrientRequirements, body_weight_metabolic, estimate_beef_dmi


@dataclass
class BeefCattleInput:
    live_weight_kg: float
    target_adg_kg: float = 1.2    # Günlük kazanım hedefi (kg)
    sex: str = "steer"            # steer / heifer / bull
    days_on_feed: int = 100


def beef_requirements(cattle: BeefCattleInput) -> NutrientRequirements:
    """
    Besi sığırı için NRC 2023 günlük besin ihtiyaçlarını hesapla.
    """
    req = NutrientRequirements()
    bw = cattle.live_weight_kg
    adg = cattle.target_adg_kg
    bwm = body_weight_metabolic(bw)

    # ─── KM Alımı ─────────────────────────────────────────────────────
    req.dmi_kg_day = round(estimate_beef_dmi(bw, adg), 2)

    # ─── Net Enerji Bakım (NEm) ───────────────────────────────────────
    # NEm = 0.077 × BW^0.75 (Mcal/gün)
    nem_base = 0.077 * bwm

    # Cinsiyet düzeltmesi
    sex_factor = 1.0
    if cattle.sex == "bull":
        sex_factor = 1.15
    elif cattle.sex == "heifer":
        sex_factor = 0.90

    req.nem_mcal_day = round(nem_base * sex_factor, 2)

    # ─── Net Enerji Büyüme (NEg) ──────────────────────────────────────
    # RE (Retained Energy) = 0.0360 × EBW^0.75 × EBG^1.097 (Mcal/gün)
    # Kaynak: NRC 2016 Beef tablolarıyla doğrulanmış; 0.0635 katsayısı 2× fazla verir.
    # EBW ≈ 0.96 × BW (fasting shrink), EBG ≈ 0.96 × ADG
    ebw = 0.96 * bw
    ebg = 0.96 * adg
    ebwm = body_weight_metabolic(ebw)
    neg = 0.0360 * ebwm * (ebg ** 1.097)
    req.neg_mcal_day = round(neg * sex_factor, 2)

    req.nel_mcal_day = 0.0  # Besi sığırı için NEL kullanılmaz

    # ─── Metabolize Protein ───────────────────────────────────────────
    # MP_bakım = 3.8 × BW^0.75 / 0.67
    mp_maintenance = 3.8 * bwm / 0.67

    # MP_büyüme: (268 - 29.4 × RE/ADG) × ADG / 0.49
    re_per_adg = neg / adg if adg > 0 else 0
    mp_growth = (268 - 29.4 * re_per_adg) * adg / 0.49

    req.mp_g_day = round(mp_maintenance + mp_growth, 1)

    # RDP/RUP: MCP bazlı hesaplama (NRC 2023 yaklaşımı)
    # MCP = 0.13 kg/kg_TDN × TDN_intake; TDN ≈ 0.72 × DMI (besi yemi rasyonu)
    rumen_microbial_cp = 0.13 * req.dmi_kg_day * 0.72 * 1000  # g/gün
    req.rdp_g_day = round(rumen_microbial_cp / 0.85, 1)
    req.rup_g_day = round(max((req.mp_g_day - rumen_microbial_cp * 0.64) / 0.80, 0), 1)

    # ─── Mineraller ───────────────────────────────────────────────────
    # Kalsiyum: bakım (15.4 mg/kg BW = 0.0154 g/kg) + büyüme (NRC 2016: ~14 g/kg EBG)
    ca_maintenance_g = 0.0154 * bw          # g/gün
    ca_retention = 13.5 * (0.96 * adg)     # g/gün — ~14 g/kg EBG × EBG
    req.ca_g_day = round((ca_maintenance_g + ca_retention) / 0.50, 1)  # %50 emilim

    # Fosfor: bakım (16 mg/kg BW) + büyüme (~7.1 g/kg EBG)
    p_maintenance_g = 0.016 * bw           # g/gün
    p_retention = 7.1 * (0.96 * adg)       # g/gün
    req.p_g_day = round((p_maintenance_g + p_retention) / 0.68, 1)     # %68 emilim

    req.mg_g_day = round(0.20 * req.dmi_kg_day * 10, 1)
    req.k_g_day = round(0.65 * req.dmi_kg_day * 10, 1)
    req.na_g_day = round(0.08 * req.dmi_kg_day * 10, 1)
    req.cl_g_day = round(0.10 * req.dmi_kg_day * 10, 1)
    req.s_g_day = round(0.15 * req.dmi_kg_day * 10, 1)

    # ─── Vitaminler ───────────────────────────────────────────────────
    # NRC 2016 Beef: Vit A = 2200 IU/kg DM, Vit D = 275 IU/kg DM, Vit E = 15-50 IU/kg DM
    req.vit_a_iu_day = round(2200 * req.dmi_kg_day, 0)    # 2200 IU/kg KM
    req.vit_d_iu_day = round(275 * req.dmi_kg_day, 0)     # 275 IU/kg KM
    req.vit_e_iu_day = round(15 * req.dmi_kg_day, 0)      # 15 IU/kg KM (minimum)

    # ─── TDN ve Nişasta ──────────────────────────────────────────────
    # Besi sığırı için TDN: bakım + büyüme enerjisi toplamından
    total_ne_per_kg_dm = (req.nem_mcal_day + req.neg_mcal_day) / req.dmi_kg_day if req.dmi_kg_day > 0 else 0
    req.tdn_pct_dm = round((total_ne_per_kg_dm + 0.12) / 0.0245, 1)

    # Nişasta önerisi: NRC 2016 Beef
    # Büyütme/orta besi: 15-30% KM; bitiş besi: 35-45% KM
    if cattle.target_adg_kg >= 1.5:
        req.starch_pct_dm_min = 35.0
        req.starch_pct_dm_max = 45.0
    else:
        req.starch_pct_dm_min = 15.0
        req.starch_pct_dm_max = 30.0

    # NDF minimum: besi sığırında %15 KM (asidoz önleme)
    req.ndf_pct_dm_min = 15.0

    # ─── Uyarılar ─────────────────────────────────────────────────────
    if adg > 2.0:
        req.notes.append("Yüksek ADG hedefi (> 2.0 kg): Rumen asidozu riskini izleyin.")
    if req.dmi_kg_day / bw > 0.03:
        req.notes.append("KM alımı beklentisi > %3 BW: Gerçekçi bir hedef mi kontrol edin.")

    return req
