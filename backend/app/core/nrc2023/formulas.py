"""
NRC 2023 Dairy & Beef Cattle Nutrient Requirements — Temel Formüller
Referans: Nutrient Requirements of Dairy Cattle, 8th Revised Edition (NRC 2023)
         Nutrient Requirements of Beef Cattle, 8th Revised Edition (NRC 2016/2023)
"""

import math
from dataclasses import dataclass, field


@dataclass
class NutrientRequirements:
    """Hayvanın günlük besin ihtiyaçları (KM bazında)."""

    # Enerji (Mcal/gün)
    nel_mcal_day: float = 0.0      # Net Enerji Laktasyon (süt sığırı)
    nem_mcal_day: float = 0.0      # Net Enerji Bakım (her iki tür)
    neg_mcal_day: float = 0.0      # Net Enerji Büyüme/Kazanım (besi sığırı)

    # Protein (g/gün)
    mp_g_day: float = 0.0          # Metabolize Protein
    rdp_g_day: float = 0.0         # Rumen Degrades Protein (minimum gereksinim)
    rup_g_day: float = 0.0         # Rumen Undegrades Protein (minimum gereksinim)

    # Kuru madde alımı tahmini (kg/gün)
    dmi_kg_day: float = 0.0

    # Mineraller (g/gün)
    ca_g_day: float = 0.0
    p_g_day: float = 0.0
    mg_g_day: float = 0.0
    k_g_day: float = 0.0
    na_g_day: float = 0.0
    cl_g_day: float = 0.0
    s_g_day: float = 0.0

    # Vitaminler (IU/gün)
    vit_a_iu_day: float = 0.0
    vit_d_iu_day: float = 0.0
    vit_e_iu_day: float = 0.0

    # Diyet yoğunluğu (% KM bazında)
    tdn_pct_dm: float = 0.0          # Toplam Sindirilebilir Besin Maddesi (%)
    starch_pct_dm_min: float = 0.0   # Nişasta önerilen minimum (% KM)
    starch_pct_dm_max: float = 0.0   # Nişasta önerilen maksimum (% KM)
    ndf_pct_dm_min: float = 0.0      # NDF minimum (% KM)

    # Notlar / uyarılar
    notes: list[str] = field(default_factory=list)


def body_weight_metabolic(bw_kg: float) -> float:
    """Metabolik canlı ağırlık (BW^0.75). NRC standardı."""
    return bw_kg ** 0.75


def fat_corrected_milk(milk_kg: float, fat_pct: float) -> float:
    """
    4% Yağ Düzeltmeli Süt (FCM) hesabı.
    FCM = milk × (0.4 + 0.15 × fat%)
    Referans: NRC 2023 Dairy, Eq. 3-1
    """
    return milk_kg * (0.4 + 0.15 * fat_pct)


def estimate_dairy_dmi(
    bw_kg: float,
    milk_yield_kg: float,
    fat_pct: float,
    week_of_lactation: int,
) -> float:
    """
    NRC 2023 Süt sığırı KM alımı tahmini (kg/gün).
    DMI = (0.372 × FCM + 0.0968 × BW^0.75) × (1 - e^(-0.192 × (WOL + 3.67)))
    Referans: NRC 2023 Dairy, Eq. 3-2 (Barbano 1994 kökenli, NRC 2023'te korunmuş)
    """
    fcm = fat_corrected_milk(milk_yield_kg, fat_pct)
    bwm = body_weight_metabolic(bw_kg)
    dmi = (0.372 * fcm + 0.0968 * bwm) * (1 - math.exp(-0.192 * (week_of_lactation + 3.67)))
    # Minimum: BW × %1.5 (erken laktasyon için alt sınır)
    return max(dmi, bw_kg * 0.015)


def estimate_beef_dmi(bw_kg: float, adg_kg: float) -> float:
    """
    NRC 2016 Besi sığırı KM alımı tahmini (kg/gün).
    Metabolik ağırlık tabanlı formül; ADG arttıkça DMI artar (sınırlı oranda).

    Yaklaşım: DMI = BW^0.75 × (a + b × ADG)
      a = 0.1 (metabolik ağırlık katsayısı — NRC 2016 Tablo 1 ortalamalarından türetilmiş)
      b = 0.004 (ADG katkısı)

    Örnek çıktılar:
      400 kg, 1.2 kg/gün ADG → DMI ≈ 9.9 kg/gün (%2.5 BW) ✓
      500 kg, 1.5 kg/gün ADG → DMI ≈ 11.8 kg/gün (%2.4 BW) ✓
    """
    bwm = body_weight_metabolic(bw_kg)
    dmi = bwm * (0.1 + 0.004 * adg_kg)
    # Fizyolojik sınırlar
    min_dmi = bw_kg * 0.018   # En az %1.8 BW
    max_dmi = bw_kg * 0.032   # En fazla %3.2 BW
    return round(max(min_dmi, min(dmi, max_dmi)), 2)
