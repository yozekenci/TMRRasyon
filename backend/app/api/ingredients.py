from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FeedIngredient

router = APIRouter()


class IngredientCreate(BaseModel):
    name: str
    name_tr: str | None = None
    category: str
    dm_pct: float | None = None
    nel_mcal_kg: float | None = None
    nem_mcal_kg: float | None = None
    neg_mcal_kg: float | None = None
    cp_pct: float | None = None
    rup_pct: float | None = None
    rdp_pct: float | None = None
    ndf_pct: float | None = None
    adf_pct: float | None = None
    nfc_pct: float | None = None
    ca_pct: float | None = None
    p_pct: float | None = None
    mg_pct: float | None = None
    k_pct: float | None = None
    na_pct: float | None = None
    cl_pct: float | None = None
    s_pct: float | None = None
    vit_a_iu_kg: float | None = None
    vit_d_iu_kg: float | None = None
    vit_e_iu_kg: float | None = None
    price_per_kg_tl: float | None = None
    notes: str | None = None


class IngredientUpdate(IngredientCreate):
    pass


class IngredientOut(IngredientCreate):
    id: int
    source: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[IngredientOut])
def list_ingredients(
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(FeedIngredient).filter(FeedIngredient.is_active == True)  # noqa: E712
    if category:
        q = q.filter(FeedIngredient.category == category)
    if search:
        q = q.filter(FeedIngredient.name.ilike(f"%{search}%"))
    return q.order_by(FeedIngredient.category, FeedIngredient.name).all()


@router.get("/{ingredient_id}", response_model=IngredientOut)
def get_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    ing = db.get(FeedIngredient, ingredient_id)
    if not ing:
        raise HTTPException(status_code=404, detail="Hammadde bulunamadı")
    return ing


@router.post("/", response_model=IngredientOut, status_code=201)
def create_ingredient(data: IngredientCreate, db: Session = Depends(get_db)):
    ing = FeedIngredient(**data.model_dump(), source="user")
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return ing


@router.put("/{ingredient_id}", response_model=IngredientOut)
def update_ingredient(ingredient_id: int, data: IngredientUpdate, db: Session = Depends(get_db)):
    ing = db.get(FeedIngredient, ingredient_id)
    if not ing:
        raise HTTPException(status_code=404, detail="Hammadde bulunamadı")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(ing, key, val)
    db.commit()
    db.refresh(ing)
    return ing


class BulkPriceItem(BaseModel):
    id: int
    price_per_kg_tl: float


@router.put("/prices/bulk", response_model=dict)
def bulk_update_prices(items: list[BulkPriceItem], db: Session = Depends(get_db)):
    """Toplu fiyat güncelleme — birden fazla hammaddenin fiyatını tek seferde güncelle."""
    updated = 0
    for item in items:
        ing = db.get(FeedIngredient, item.id)
        if ing:
            ing.price_per_kg_tl = item.price_per_kg_tl
            updated += 1
    db.commit()
    return {"updated": updated}


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    ing = db.get(FeedIngredient, ingredient_id)
    if not ing:
        raise HTTPException(status_code=404, detail="Hammadde bulunamadı")
    if ing.source == "builtin":
        raise HTTPException(status_code=403, detail="Yerleşik hammaddeler silinemez")
    ing.is_active = False
    db.commit()
