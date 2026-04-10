"""
NRC 2023 Süt Sığırı Besin İhtiyaçları
Referans: NRC 2023 Dairy Cattle, 8th Edition
"""

from dataclasses import dataclass

from app.core.nrc2023.formulas import NutrientRequirements, body_weight_metabolic, estimate_dairy_dmi


@dataclass
class DairyCowInput:
    live_weight_kg: float
    milk_yield_kg_day: float
    fat_pct: float = 3.5
    protein_pct: float = 3.2
    lactation_week: int = 10
    pregnant_week: int = 0        # 0 = gebe değil
    bcs: float = 3.0


def dairy_requirements(cow: DairyCowInput) -> NutrientRequirements:
    """
    Süt sığırı için NRC 2023 günlük besin ihtiyaçlarını hesapla.
    """
    req = NutrientRequirements()
    bw = cow.live_weight_kg
    my = cow.milk_yield_kg_day
    fat = cow.fat_pct
    prot = cow.protein_pct
    wol = cow.lactation_week

    # ─── KM Alımı Tahmini ─────────────────────────────────────────────
    bwm = body_weight_metabolic(bw)
    req.dmi_kg_day = estimate_dairy_dmi(bw, my, fat, wol)

    # ─── Net Enerji Laktasyon (NEL) ───────────────────────────────────
    # NEL_bakım = 0.080 × BW^0.75
    nel_maintenance = 0.080 * bwm

    # NEL_süt = (0.0929 × fat% + 0.0547 × protein% + 0.0395 × laktoz%) × kg süt
    # Laktoz ≈ 4.85% (sabit ortalama)
    laktoz = 4.85
    nel_milk = (0.0929 * fat + 0.0547 * prot + 0.0395 * laktoz) * my

    # NEL_gebelik (NRC 2023, Tablo 10-1)
    nel_gestation = 0.0
    if cow.pregnant_week >= 21:
        nel_gestation = 0.00318 * cow.pregnant_week - 0.0352

    # NOT: BCS ihtiyacı değiştirmez — BCS vücut rezerv durumunu gösterir,
    # biyolojik gereksinim bakım + süt + gebelik bileşenlerinden oluşur.
    req.nel_mcal_day = round(nel_maintenance + nel_milk + nel_gestation, 2)
    req.nem_mcal_day = round(nel_maintenance, 2)

    # ─── Metabolize Protein (MP) ──────────────────────────────────────
    # MP_bakım = 3.8 g × BW^0.75 / 0.67 (absorpsiyon etkinliği)
    mp_maintenance = 3.8 * bwm / 0.67

    # MP_süt = (süt protein g/kg × üretim) / 0.67
    milk_protein_g_kg = prot * 10  # % → g/kg
    mp_milk = (milk_protein_g_kg * my) / 0.67

    # MP_gebelik
    mp_gestation = 0.0
    if cow.pregnant_week >= 21:
        mp_gestation = (0.69 * cow.pregnant_week - 69.2) / 0.67

    req.mp_g_day = round(mp_maintenance + mp_milk + mp_gestation, 1)

    # RDP & RUP tahmini (NRC 2023 yaklaşımı)
    # MCP = 0.13 kg/kg_TDN × TDN_intake; TDN ≈ 0.72 × DMI (karma süt sığırı rasyonu)
    rumen_microbial_cp = 0.13 * req.dmi_kg_day * 0.72 * 1000  # g/gün
    req.rdp_g_day = round(rumen_microbial_cp / 0.85, 1)
    # RUP ihtiyacı: intestinal digestibility (0.80) ile bölünür
    req.rup_g_day = round(max((req.mp_g_day - rumen_microbial_cp * 0.64) / 0.80, 0), 1)

    # ─── Mineraller ───────────────────────────────────────────────────
    # Kalsiyum: bakım + süt (NRC 2023 — 31 mg/kg BW/gün bakım)
    ca_maintenance = 0.031 * bw  # g/gün (0.031 g/kg × BW kg)
    ca_milk = 1.22 * my  # g/kg süt
    ca_gestation = 0.0
    if cow.pregnant_week >= 21:
        ca_gestation = 0.02 * cow.pregnant_week - 0.3
    req.ca_g_day = round((ca_maintenance + ca_milk + ca_gestation) / 0.38, 1)  # %38 emilim

    # Fosfor: bakım + süt (16 mg/kg BW/gün bakım)
    p_maintenance = 0.016 * bw  # g/gün
    p_milk = 0.90 * my
    req.p_g_day = round((p_maintenance + p_milk) / 0.64, 1)

    # Magnezyum
    req.mg_g_day = round(0.20 * req.dmi_kg_day * 10, 1)  # %0.20 KM

    # Potasyum
    req.k_g_day = round(0.90 * req.dmi_kg_day * 10, 1)   # %0.90 KM

    # Sodyum
    req.na_g_day = round(0.18 * req.dmi_kg_day * 10, 1)  # %0.18 KM

    # Klor
    req.cl_g_day = round(0.25 * req.dmi_kg_day * 10, 1)

    # Kükürt
    req.s_g_day = round(0.20 * req.dmi_kg_day * 10, 1)

    # ─── Vitaminler ───────────────────────────────────────────────────
    req.vit_a_iu_day = round(110 * bw, 0)      # 110 IU/kg BW
    req.vit_d_iu_day = round(30 * bw, 0)       # 30 IU/kg BW
    req.vit_e_iu_day = round(0.8 * bw, 0)      # 0.8 IU/kg BW

    # ─── TDN ve Nişasta ──────────────────────────────────────────────
    # TDN% = (NEL Mcal/kg KM + 0.12) / 0.0245  [NRC 2023 Dairy, Eq. 2-5]
    nel_per_kg_dm = req.nel_mcal_day / req.dmi_kg_day if req.dmi_kg_day > 0 else 0
    req.tdn_pct_dm = round((nel_per_kg_dm + 0.12) / 0.0245, 1)

    # Nişasta önerisi: NRC 2023 Dairy
    # Erken laktasyon veya yüksek verim: 23-26% KM
    # Orta/geç laktasyon: 20-23% KM
    if cow.lactation_week <= 12 or cow.milk_yield_kg_day >= 30:
        req.starch_pct_dm_min = 23.0
        req.starch_pct_dm_max = 26.0
    else:
        req.starch_pct_dm_min = 20.0
        req.starch_pct_dm_max = 24.0

    # NDF minimum: %28 KM (süt sığırı için kritik alt sınır)
    req.ndf_pct_dm_min = 28.0

    # ─── Uyarılar ─────────────────────────────────────────────────────
    if cow.lactation_week <= 4:
        req.notes.append("Erken laktasyon: Negatif enerji dengesi olası, izleyin.")
    if cow.bcs < 2.5:
        req.notes.append("BCS çok düşük (< 2.5): Enerji takviyesi gerekli.")
    elif cow.bcs < 3.0:
        req.notes.append("BCS düşük (< 3.0): Vücut rezervleri erken laktasyon stresini artırabilir.")
    elif cow.bcs > 3.75:
        req.notes.append("BCS yüksek (> 3.75): Doğum öncesi enerji kısıtlaması önerin.")
    if cow.pregnant_week > 0 and cow.pregnant_week < 21:
        req.notes.append("Gebelik enerji ihtiyacı 21. haftadan itibaren artmaktadır.")

    return req
