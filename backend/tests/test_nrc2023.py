"""
NRC 2023 Hesap Motoru Birim Testleri
Referans hayvan: 650 kg süt sığırı, 35 kg/gün süt, %3.5 yağ, %3.2 protein, 10. laktasyon haftası
Beklenen değerler NRC 2023 Dairy (8th Ed.) Tablo değerlerinden türetilmiştir.
"""

import pytest
from app.core.nrc2023.dairy_requirements import DairyCowInput, dairy_requirements
from app.core.nrc2023.beef_requirements import BeefCattleInput, beef_requirements
from app.core.nrc2023.formulas import fat_corrected_milk, estimate_dairy_dmi, estimate_beef_dmi


class TestFormulas:
    """Temel formül doğrulamaları."""

    def test_fcm_formula(self):
        """FCM = milk × (0.4 + 0.15 × fat%) — NRC 2023 Eq. 3-1."""
        fcm = fat_corrected_milk(35, 3.5)
        # 35 × (0.4 + 0.15 × 3.5) = 35 × 0.925 = 32.375
        assert abs(fcm - 32.375) < 0.01, f"FCM={fcm}, beklenen ≈32.375"

    def test_fcm_standard_fat(self):
        """4.0% yağda FCM = milk × 1.0 (standart)."""
        fcm = fat_corrected_milk(35, 4.0)
        # 35 × (0.4 + 0.15 × 4.0) = 35 × 1.0 = 35.0
        assert abs(fcm - 35.0) < 0.01

    def test_dairy_dmi_reasonable(self):
        """Yüksek üretimli inek için KM tahmini 18-25 kg arasında olmalı."""
        dmi = estimate_dairy_dmi(650, 35, 3.5, 10)
        assert 18.0 < dmi < 25.0, f"DMI={dmi}"

    def test_beef_dmi_metabolic_scaling(self):
        """Besi KM alımı metabolik canlı ağırlıkla orantılı artmalı."""
        dmi_400 = estimate_beef_dmi(400, 1.5)
        dmi_500 = estimate_beef_dmi(500, 1.5)
        assert dmi_500 > dmi_400, "500 kg hayvan daha fazla KM yemeli"

    def test_beef_dmi_higher_adg_higher_dmi(self):
        """Daha yüksek ADG → daha yüksek KM alımı."""
        dmi_low = estimate_beef_dmi(400, 1.0)
        dmi_high = estimate_beef_dmi(400, 2.0)
        assert dmi_high > dmi_low

    def test_beef_dmi_bounds(self):
        """KM alımı %1.8 - %3.2 BW sınırları içinde kalmalı."""
        bw = 400
        dmi = estimate_beef_dmi(bw, 1.5)
        assert bw * 0.018 <= dmi <= bw * 0.032, f"DMI={dmi} sınır dışı"


class TestDairyRequirements:

    def setup_method(self):
        """NRC 2023 referans ineği: 650 kg, 35 kg süt, %3.5 yağ, 10. hafta."""
        self.cow = DairyCowInput(
            live_weight_kg=650,
            milk_yield_kg_day=35,
            fat_pct=3.5,
            protein_pct=3.2,
            lactation_week=10,
            pregnant_week=0,
            bcs=3.0,
        )

    def test_nel_in_range(self):
        """NEL ihtiyacı 28-37 Mcal/gün arasında olmalı (650 kg, 35 kg süt)."""
        req = dairy_requirements(self.cow)
        assert 28.0 < req.nel_mcal_day < 37.0, f"NEL={req.nel_mcal_day} aralık dışı"

    def test_nel_components(self):
        """NEL bakım bileşeni BW^0.75 × 0.080 olmalı."""
        req = dairy_requirements(self.cow)
        expected_nem = 0.080 * (650 ** 0.75)
        assert abs(req.nem_mcal_day - round(expected_nem, 2)) < 0.05

    def test_bcs_does_not_affect_nel(self):
        """BCS, NEL gereksinimini değiştirmemeli (sadece uyarı)."""
        req_bcs_low = dairy_requirements(DairyCowInput(
            live_weight_kg=650, milk_yield_kg_day=35, fat_pct=3.5,
            protein_pct=3.2, lactation_week=10, bcs=2.0,
        ))
        req_bcs_high = dairy_requirements(DairyCowInput(
            live_weight_kg=650, milk_yield_kg_day=35, fat_pct=3.5,
            protein_pct=3.2, lactation_week=10, bcs=4.0,
        ))
        assert req_bcs_low.nel_mcal_day == req_bcs_high.nel_mcal_day, (
            "BCS NEL'i etkilememeli; sadece uyarı olarak gösterilmeli"
        )

    def test_bcs_low_generates_warning(self):
        """Düşük BCS uyarı üretmeli."""
        req = dairy_requirements(DairyCowInput(
            live_weight_kg=650, milk_yield_kg_day=35, fat_pct=3.5,
            protein_pct=3.2, lactation_week=10, bcs=2.2,
        ))
        assert len(req.notes) > 0, "Düşük BCS uyarı vermeli"

    def test_mp_in_range(self):
        """MP ihtiyacı 2000-2800 g/gün arasında olmalı (650 kg, 35 kg süt)."""
        req = dairy_requirements(self.cow)
        assert 2000 < req.mp_g_day < 2800, f"MP={req.mp_g_day} aralık dışı"

    def test_rdp_positive(self):
        """RDP ihtiyacı pozitif olmalı."""
        req = dairy_requirements(self.cow)
        assert req.rdp_g_day > 0

    def test_rup_nonnegative(self):
        """RUP ihtiyacı negatif olamaz."""
        req = dairy_requirements(self.cow)
        assert req.rup_g_day >= 0

    def test_rup_formula_uses_digestibility(self):
        """RUP = (MP - MCP×0.64) / 0.80 — intestinal digestibility (0.80) uygulanmalı.
        MCP = 0.13 × TDN_kg = 0.13 × DMI × 0.72 × 1000."""
        req = dairy_requirements(self.cow)
        mcp = 0.13 * req.dmi_kg_day * 0.72 * 1000   # DMI bazlı MCP
        rup_expected = max((req.mp_g_day - mcp * 0.64) / 0.80, 0)
        assert abs(req.rup_g_day - round(rup_expected, 1)) < 0.5, (
            f"RUP={req.rup_g_day}, beklenen≈{round(rup_expected, 1)}"
        )

    def test_dmi_in_range(self):
        """KM alımı tahmini 18-25 kg/gün olmalı (yüksek üretimli inek)."""
        req = dairy_requirements(self.cow)
        assert 18.0 < req.dmi_kg_day < 25.0, f"DMI={req.dmi_kg_day} aralık dışı"

    def test_ca_positive(self):
        """Kalsiyum ihtiyacı pozitif olmalı."""
        req = dairy_requirements(self.cow)
        assert req.ca_g_day > 0

    def test_ca_reasonable_range(self):
        """Ca ihtiyacı 120-200 g/gün arasında olmalı (650 kg, 35 kg süt)."""
        req = dairy_requirements(self.cow)
        assert 120 < req.ca_g_day < 200, f"Ca={req.ca_g_day} g/gün"

    def test_ca_p_ratio(self):
        """Ca:P oranı 1.5-3.0 arasında olmalı (rumen sağlığı)."""
        req = dairy_requirements(self.cow)
        ratio = req.ca_g_day / req.p_g_day
        assert 1.5 < ratio < 3.0, f"Ca:P={ratio:.2f} — normal aralık 1.5-3.0"

    def test_rdp_mp_ratio(self):
        """RDP, MP'nin %70-140'ı arasında olmalı.
        Yüksek enerjili süt sığırı rasyonunda MCP, MP'nin büyük bölümünü karşılar.
        RDP = MCP/0.85 ≈ total MP seviyesine yakın olabilir."""
        req = dairy_requirements(self.cow)
        rdp_to_mp = req.rdp_g_day / req.mp_g_day
        assert 0.70 < rdp_to_mp < 1.40, (
            f"RDP:MP={rdp_to_mp:.2f} — beklenen %70-140 arası"
        )

    def test_gestation_increases_nel(self):
        """Gebelik NEL ihtiyacını artırmalı (≥21. hafta)."""
        req_dry = dairy_requirements(self.cow)
        cow_pregnant = DairyCowInput(
            live_weight_kg=650,
            milk_yield_kg_day=35,
            fat_pct=3.5,
            protein_pct=3.2,
            lactation_week=10,
            pregnant_week=30,
            bcs=3.0,
        )
        req_preg = dairy_requirements(cow_pregnant)
        assert req_preg.nel_mcal_day > req_dry.nel_mcal_day

    def test_early_lactation_warning(self):
        """Erken laktasyon uyarısı verilmeli."""
        cow_early = DairyCowInput(
            live_weight_kg=600,
            milk_yield_kg_day=40,
            fat_pct=3.8,
            protein_pct=3.1,
            lactation_week=2,
            pregnant_week=0,
            bcs=2.8,
        )
        req = dairy_requirements(cow_early)
        assert any("laktasyon" in n.lower() for n in req.notes)

    def test_higher_milk_higher_nel(self):
        """Daha fazla süt üretimi → daha yüksek NEL."""
        req_35 = dairy_requirements(self.cow)
        cow_45 = DairyCowInput(
            live_weight_kg=650, milk_yield_kg_day=45,
            fat_pct=3.5, protein_pct=3.2, lactation_week=10,
        )
        req_45 = dairy_requirements(cow_45)
        assert req_45.nel_mcal_day > req_35.nel_mcal_day

    def test_vitamins_positive(self):
        """Vitamin değerleri pozitif olmalı."""
        req = dairy_requirements(self.cow)
        assert req.vit_a_iu_day > 0
        assert req.vit_d_iu_day > 0
        assert req.vit_e_iu_day > 0


class TestBeefRequirements:

    def setup_method(self):
        """Referans besi sığırı: 400 kg steer, 1.5 kg/gün ADG."""
        self.cattle = BeefCattleInput(
            live_weight_kg=400,
            target_adg_kg=1.5,
            sex="steer",
            days_on_feed=150,
        )

    def test_nem_positive(self):
        req = beef_requirements(self.cattle)
        assert req.nem_mcal_day > 0

    def test_neg_positive(self):
        req = beef_requirements(self.cattle)
        assert req.neg_mcal_day > 0

    def test_nem_in_range(self):
        """NEm 400 kg steer için 4-8 Mcal/gün olmalı."""
        req = beef_requirements(self.cattle)
        assert 4.0 < req.nem_mcal_day < 8.0, f"NEm={req.nem_mcal_day}"

    def test_neg_in_range(self):
        """NEg 400 kg steer, 1.5 kg ADG için 3.5-6 Mcal/gün olmalı (NRC 2016 tablo ≈4.68)."""
        req = beef_requirements(self.cattle)
        assert 3.5 < req.neg_mcal_day < 6.0, f"NEg={req.neg_mcal_day}"

    def test_mp_in_range(self):
        """MP 600-1200 g/gün arasında olmalı (400 kg steer, 1.5 ADG)."""
        req = beef_requirements(self.cattle)
        assert 600 < req.mp_g_day < 1200, f"MP={req.mp_g_day}"

    def test_rdp_rup_mcp_based(self):
        """RDP ve RUP, MCP bazlı hesaplanmalı; RDP > RUP olmalı."""
        req = beef_requirements(self.cattle)
        assert req.rdp_g_day > 0
        assert req.rup_g_day >= 0
        # Yüksek enerjili besi rasyonlarında RDP genellikle RUP'tan büyük olur
        assert req.rdp_g_day > req.rup_g_day, (
            f"RDP={req.rdp_g_day} < RUP={req.rup_g_day}, MCP bazlı hesaplamayı kontrol et"
        )

    def test_ca_p_ratio_beef(self):
        """Ca:P oranı besi hayvanı için 1.5-3.0 olmalı."""
        req = beef_requirements(self.cattle)
        ratio = req.ca_g_day / req.p_g_day
        assert 1.5 < ratio < 3.0, f"Ca:P={ratio:.2f}"

    def test_ca_reasonable(self):
        """Ca ihtiyacı 400 kg steer için 30-80 g/gün olmalı."""
        req = beef_requirements(self.cattle)
        assert 30 < req.ca_g_day < 80, f"Ca={req.ca_g_day}"

    def test_vitamins_per_dmi(self):
        """Vitamin A ve D KM alımına göre hesaplanmalı (BW'ye değil)."""
        req = beef_requirements(self.cattle)
        # Vit A = 2200 × DMI, Vit D = 275 × DMI — DMI ≈ 8-13 kg
        assert 2200 * 8 <= req.vit_a_iu_day <= 2200 * 13, (
            f"Vit A={req.vit_a_iu_day} — KM alımı başına 2200 IU bekleniyor"
        )
        assert 275 * 8 <= req.vit_d_iu_day <= 275 * 13, (
            f"Vit D={req.vit_d_iu_day} — KM alımı başına 275 IU bekleniyor"
        )

    def test_higher_adg_higher_neg(self):
        """Daha yüksek ADG → daha yüksek NEg."""
        req1 = beef_requirements(self.cattle)
        cattle2 = BeefCattleInput(live_weight_kg=400, target_adg_kg=2.0)
        req2 = beef_requirements(cattle2)
        assert req2.neg_mcal_day > req1.neg_mcal_day

    def test_bull_higher_nem_than_heifer(self):
        """Boğa bakım ihtiyacı düve'den yüksek olmalı."""
        bull = BeefCattleInput(live_weight_kg=400, target_adg_kg=1.5, sex="bull")
        heifer = BeefCattleInput(live_weight_kg=400, target_adg_kg=1.5, sex="heifer")
        req_bull = beef_requirements(bull)
        req_heifer = beef_requirements(heifer)
        assert req_bull.nem_mcal_day > req_heifer.nem_mcal_day
