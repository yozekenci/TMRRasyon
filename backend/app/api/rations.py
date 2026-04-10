from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.optimizer import LPConstraints, optimize_ration
from app.core.reports import generate_excel, generate_pdf, generate_mixing_list
from app.database import get_db
from app.models import AnimalProfile, FeedIngredient, Ration, RationItem

router = APIRouter()


# ─── Pydantic Şemaları ────────────────────────────────────────────────────────

class RationItemIn(BaseModel):
    ingredient_id: int
    fresh_weight_kg: float


class RationCreate(BaseModel):
    name: str
    animal_profile_id: int
    items: list[RationItemIn]
    notes: str | None = None
    phase: str | None = None  # başlangıç / geliştirme / bitirme


class RationItemOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    ingredient_name_tr: str | None
    category: str | None
    fresh_weight_kg: float
    dm_weight_kg: float | None
    nel_mcal: float | None
    cp_g: float | None
    ca_g: float | None
    p_g: float | None
    mg_g: float | None
    na_g: float | None
    k_g: float | None
    ndf_g: float | None
    nfc_g: float | None
    cost_tl: float | None

    model_config = {"from_attributes": True}


class RationOut(BaseModel):
    id: int
    name: str
    animal_profile_id: int
    optimization_mode: str
    phase: str | None
    total_dm_kg: float | None
    total_fresh_kg: float | None
    total_cost_tl: float | None
    notes: str | None
    items: list[RationItemOut]

    model_config = {"from_attributes": True}


class RationSummary(BaseModel):
    id: int
    name: str
    animal_profile_id: int
    animal_name: str
    optimization_mode: str
    phase: str | None
    total_dm_kg: float | None
    total_cost_tl: float | None

    model_config = {"from_attributes": True}


class LPIngredientConstraint(BaseModel):
    ingredient_id: int
    min_kg: float = 0.0
    max_kg: float | None = None


class LPOptimizeRequest(BaseModel):
    name: str
    animal_profile_id: int
    ingredient_constraints: list[LPIngredientConstraint]
    notes: str | None = None
    phase: str | None = None


# ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

def _compute_item_nutrients(item: RationItem, ing: FeedIngredient) -> RationItemOut:
    dm_kg = item.fresh_weight_kg * (ing.dm_pct or 100) / 100
    nel = dm_kg * (ing.nel_mcal_kg or 0)
    cp_g = dm_kg * (ing.cp_pct or 0) * 10   # % of DM → g
    ca_g = dm_kg * (ing.ca_pct or 0) * 10
    p_g = dm_kg * (ing.p_pct or 0) * 10
    mg_g = dm_kg * (ing.mg_pct or 0) * 10
    na_g = dm_kg * (ing.na_pct or 0) * 10
    k_g = dm_kg * (ing.k_pct or 0) * 10
    ndf_g = dm_kg * (ing.ndf_pct or 0) * 10
    nfc_g = dm_kg * (ing.nfc_pct or 0) * 10
    cost = item.fresh_weight_kg * (ing.price_per_kg_tl or 0)

    return RationItemOut(
        id=item.id,
        ingredient_id=item.ingredient_id,
        ingredient_name=ing.name,
        ingredient_name_tr=ing.name_tr,
        category=ing.category,
        fresh_weight_kg=item.fresh_weight_kg,
        dm_weight_kg=round(dm_kg, 3),
        nel_mcal=round(nel, 2) if ing.nel_mcal_kg else None,
        cp_g=round(cp_g, 1) if ing.cp_pct else None,
        ca_g=round(ca_g, 1) if ing.ca_pct else None,
        p_g=round(p_g, 1) if ing.p_pct else None,
        mg_g=round(mg_g, 1) if ing.mg_pct else None,
        na_g=round(na_g, 1) if ing.na_pct else None,
        k_g=round(k_g, 1) if ing.k_pct else None,
        ndf_g=round(ndf_g, 1) if ing.ndf_pct else None,
        nfc_g=round(nfc_g, 1) if ing.nfc_pct else None,
        cost_tl=round(cost, 2) if ing.price_per_kg_tl else None,
    )


def _build_ration_out(ration: Ration) -> RationOut:
    items_out = [
        _compute_item_nutrients(item, item.ingredient)
        for item in ration.items
    ]
    return RationOut(
        id=ration.id,
        name=ration.name,
        animal_profile_id=ration.animal_profile_id,
        optimization_mode=ration.optimization_mode,
        phase=ration.phase,
        total_dm_kg=ration.total_dm_kg,
        total_fresh_kg=ration.total_fresh_kg,
        total_cost_tl=ration.total_cost_tl,
        notes=ration.notes,
        items=items_out,
    )


def _save_ration(db: Session, name: str, animal_id: int, mode: str,
                  items: list[tuple[FeedIngredient, float]], notes: str | None,
                  phase: str | None = None) -> Ration:
    """Ration + items kaydet, toplamları hesapla."""
    total_dm = 0.0
    total_fresh = 0.0
    total_cost = 0.0

    ration = Ration(
        name=name,
        animal_profile_id=animal_id,
        optimization_mode=mode,
        phase=phase,
        notes=notes,
    )
    db.add(ration)
    db.flush()  # ID al

    for ing, fresh_kg in items:
        dm_kg = fresh_kg * (ing.dm_pct or 100) / 100
        total_dm += dm_kg
        total_fresh += fresh_kg
        total_cost += fresh_kg * (ing.price_per_kg_tl or 0)
        db.add(RationItem(
            ration_id=ration.id,
            ingredient_id=ing.id,
            fresh_weight_kg=fresh_kg,
            dm_weight_kg=dm_kg,
        ))

    ration.total_dm_kg = round(total_dm, 3)
    ration.total_fresh_kg = round(total_fresh, 3)
    ration.total_cost_tl = round(total_cost, 2)

    db.commit()
    db.refresh(ration)
    return ration


# ─── Endpoint'ler ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[RationSummary])
def list_rations(db: Session = Depends(get_db)):
    rations = db.query(Ration).order_by(Ration.created_at.desc()).all()
    result = []
    for r in rations:
        result.append(RationSummary(
            id=r.id,
            name=r.name,
            animal_profile_id=r.animal_profile_id,
            animal_name=r.animal_profile.name,
            optimization_mode=r.optimization_mode,
            phase=r.phase,
            total_dm_kg=r.total_dm_kg,
            total_cost_tl=r.total_cost_tl,
        ))
    return result


@router.get("/{ration_id}", response_model=RationOut)
def get_ration(ration_id: int, db: Session = Depends(get_db)):
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    return _build_ration_out(ration)


@router.post("/", response_model=RationOut, status_code=201)
def create_ration(data: RationCreate, db: Session = Depends(get_db)):
    animal = db.get(AnimalProfile, data.animal_profile_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")

    ing_items: list[tuple[FeedIngredient, float]] = []
    for item in data.items:
        ing = db.get(FeedIngredient, item.ingredient_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Hammadde {item.ingredient_id} bulunamadı")
        ing_items.append((ing, item.fresh_weight_kg))

    ration = _save_ration(db, data.name, data.animal_profile_id, "manual", ing_items, data.notes, data.phase)
    return _build_ration_out(ration)


@router.post("/optimize", response_model=RationOut, status_code=201)
def optimize(data: LPOptimizeRequest, db: Session = Depends(get_db)):
    """LP ile minimum maliyetli rasyon hesapla."""
    from app.core.nrc2023.beef_requirements import BeefCattleInput, beef_requirements

    animal = db.get(AnimalProfile, data.animal_profile_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")

    # NRC 2016 besi sığırı ihtiyaçları
    inp = BeefCattleInput(
        live_weight_kg=animal.live_weight_kg,
        target_adg_kg=animal.target_adg_kg or 1.2,
        sex=animal.sex or "steer",
    )
    req = beef_requirements(inp)

    # Hammaddeleri yükle
    ingredients = []
    constraints_map = {c.ingredient_id: c for c in data.ingredient_constraints}
    for c in data.ingredient_constraints:
        ing = db.get(FeedIngredient, c.ingredient_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Hammadde {c.ingredient_id} bulunamadı")
        ingredients.append(ing)

    lp_constraints = LPConstraints(
        min_nel_mcal=req.nem_mcal_day + req.neg_mcal_day,
        min_mp_g=req.mp_g_day,
        min_ca_g=req.ca_g_day,
        min_p_g=req.p_g_day,
        min_dm_kg=req.dmi_kg_day * 0.9,
        max_dm_kg=req.dmi_kg_day * 1.1,
        ingredient_min={c.ingredient_id: c.min_kg for c in data.ingredient_constraints},
        ingredient_max={c.ingredient_id: c.max_kg for c in data.ingredient_constraints if c.max_kg},
    )

    try:
        result = optimize_ration(ingredients, lp_constraints)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    ing_items = [(db.get(FeedIngredient, ing_id), kg) for ing_id, kg in result.items()]
    ration = _save_ration(db, data.name, data.animal_profile_id, "lp", ing_items, data.notes, data.phase)
    return _build_ration_out(ration)


@router.put("/{ration_id}", response_model=RationOut)
def update_ration(ration_id: int, data: RationCreate, db: Session = Depends(get_db)):
    """Rasyonu güncelle: tüm kalemleri sil, yenilerini ekle, toplamları yeniden hesapla."""
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")

    animal = db.get(AnimalProfile, data.animal_profile_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")

    # İsim, not ve dönem güncelle
    ration.name = data.name
    ration.animal_profile_id = data.animal_profile_id
    ration.notes = data.notes
    ration.phase = data.phase

    # Mevcut kalemleri sil
    for item in list(ration.items):
        db.delete(item)
    db.flush()

    # Yeni kalemleri ekle ve toplamları hesapla
    total_dm = total_fresh = total_cost = 0.0
    for item_in in data.items:
        ing = db.get(FeedIngredient, item_in.ingredient_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Hammadde {item_in.ingredient_id} bulunamadı")
        dm_kg = item_in.fresh_weight_kg * (ing.dm_pct or 100) / 100
        total_dm += dm_kg
        total_fresh += item_in.fresh_weight_kg
        total_cost += item_in.fresh_weight_kg * (ing.price_per_kg_tl or 0)
        db.add(RationItem(
            ration_id=ration.id,
            ingredient_id=ing.id,
            fresh_weight_kg=item_in.fresh_weight_kg,
            dm_weight_kg=dm_kg,
        ))

    ration.total_dm_kg = round(total_dm, 3)
    ration.total_fresh_kg = round(total_fresh, 3)
    ration.total_cost_tl = round(total_cost, 2)

    db.commit()
    db.refresh(ration)
    return _build_ration_out(ration)


@router.delete("/{ration_id}", status_code=204)
def delete_ration(ration_id: int, db: Session = Depends(get_db)):
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    db.delete(ration)
    db.commit()


@router.post("/{ration_id}/copy", response_model=RationOut, status_code=201)
def copy_ration(ration_id: int, db: Session = Depends(get_db)):
    """Rasyonu kopyala — aynı hayvan, aynı kalemler, '(kopya)' eki ile yeni isim."""
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    ing_items = [(item.ingredient, item.fresh_weight_kg) for item in ration.items]
    new_ration = _save_ration(
        db,
        name=f"{ration.name} (kopya)",
        animal_id=ration.animal_profile_id,
        mode=ration.optimization_mode,
        items=ing_items,
        notes=ration.notes,
        phase=ration.phase,
    )
    return _build_ration_out(new_ration)


@router.get("/{ration_id}/pdf")
def download_pdf(ration_id: int, db: Session = Depends(get_db)):
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    pdf_bytes = generate_pdf(ration)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rasyon_{ration_id}.pdf"},
    )


@router.get("/{ration_id}/excel")
def download_excel(ration_id: int, db: Session = Depends(get_db)):
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    excel_bytes = generate_excel(ration)
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=rasyon_{ration_id}.xlsx"},
    )


@router.get("/{ration_id}/shadow-prices")
def get_shadow_prices(ration_id: int, db: Session = Depends(get_db)):
    """LP ile rasyon için gölge fiyatlarını hesapla (sadece LP rasyonlar)."""
    from app.core.nrc2023.beef_requirements import BeefCattleInput, beef_requirements

    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    if ration.optimization_mode != "lp":
        raise HTTPException(status_code=400, detail="Gölge fiyatları sadece LP rasyonlar için hesaplanır")

    animal = ration.animal_profile
    inp = BeefCattleInput(
        live_weight_kg=animal.live_weight_kg,
        target_adg_kg=animal.target_adg_kg or 1.2,
        sex=animal.sex or "steer",
    )
    req = beef_requirements(inp)

    ingredients = [item.ingredient for item in ration.items]
    constraints = LPConstraints(
        min_nel_mcal=req.nem_mcal_day + req.neg_mcal_day,
        min_mp_g=req.mp_g_day,
        min_ca_g=req.ca_g_day,
        min_p_g=req.p_g_day,
        min_dm_kg=req.dmi_kg_day * 0.9,
        max_dm_kg=req.dmi_kg_day * 1.1,
        ingredient_min={item.ingredient_id: 0.0 for item in ration.items},
    )

    try:
        _, shadow = optimize_ration(ingredients, constraints, return_shadow_prices=True)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Kullanıcı dostu açıklama: negatif = bu kısıtı 1 birim gevşetirsen X TL tasarruf
    result = []
    for label, pi in shadow.items():
        result.append({
            "kisit": label,
            "golge_fiyat": round(abs(pi), 4),
            "yön": "tasarruf" if pi < 0 else "maliyet",
            "aciklama": f"Bu kısıtı 1 birim gevşetmek maliyeti {abs(pi):.4f} ₺ {'düşürür' if pi < 0 else 'artırır'}",
        })
    result.sort(key=lambda x: x["golge_fiyat"], reverse=True)
    return result


@router.get("/{ration_id}/mixing-list")
def mixing_list(ration_id: int, herd_size: int = 1, db: Session = Depends(get_db)):
    """Karma talimatı: herd_size hayvana göre günlük/haftalık miktarlar."""
    ration = db.get(Ration, ration_id)
    if not ration:
        raise HTTPException(status_code=404, detail="Rasyon bulunamadı")
    return generate_mixing_list(ration, herd_size)
