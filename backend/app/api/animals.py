from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.nrc2023.beef_requirements import BeefCattleInput, beef_requirements
from app.core.nrc2023.formulas import NutrientRequirements
from app.database import get_db
from app.models import AnimalProfile

router = APIRouter()


class AnimalCreate(BaseModel):
    name: str
    species: str = "beef"
    breed: str | None = None
    sex: str | None = None
    live_weight_kg: float

    # Besi sığırı
    target_adg_kg: float | None = None

    # Sürü büyüklüğü
    herd_size: int = 1


class AnimalOut(AnimalCreate):
    id: int

    model_config = {"from_attributes": True}


class RequirementsOut(BaseModel):
    nel_mcal_day: float
    nem_mcal_day: float
    neg_mcal_day: float
    mp_g_day: float
    rdp_g_day: float
    rup_g_day: float
    dmi_kg_day: float
    ca_g_day: float
    p_g_day: float
    mg_g_day: float
    k_g_day: float
    na_g_day: float
    cl_g_day: float
    s_g_day: float
    vit_a_iu_day: float
    vit_d_iu_day: float
    vit_e_iu_day: float
    tdn_pct_dm: float
    starch_pct_dm_min: float
    starch_pct_dm_max: float
    ndf_pct_dm_min: float
    notes: list[str]


@router.get("/", response_model=list[AnimalOut])
def list_animals(db: Session = Depends(get_db)):
    return db.query(AnimalProfile).order_by(AnimalProfile.name).all()


@router.get("/{animal_id}", response_model=AnimalOut)
def get_animal(animal_id: int, db: Session = Depends(get_db)):
    animal = db.get(AnimalProfile, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")
    return animal


@router.post("/", response_model=AnimalOut, status_code=201)
def create_animal(data: AnimalCreate, db: Session = Depends(get_db)):
    animal = AnimalProfile(**data.model_dump())
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal


@router.put("/{animal_id}", response_model=AnimalOut)
def update_animal(animal_id: int, data: AnimalCreate, db: Session = Depends(get_db)):
    animal = db.get(AnimalProfile, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(animal, key, val)
    db.commit()
    db.refresh(animal)
    return animal


@router.delete("/{animal_id}", status_code=204)
def delete_animal(animal_id: int, db: Session = Depends(get_db)):
    animal = db.get(AnimalProfile, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")
    db.delete(animal)
    db.commit()


@router.get("/{animal_id}/requirements", response_model=RequirementsOut)
def get_requirements(animal_id: int, db: Session = Depends(get_db)):
    """NRC 2016'ya göre besi sığırı günlük besin ihtiyaçlarını hesapla."""
    animal = db.get(AnimalProfile, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Hayvan profili bulunamadı")

    inp = BeefCattleInput(
        live_weight_kg=animal.live_weight_kg,
        target_adg_kg=animal.target_adg_kg or 1.2,
        sex=animal.sex or "steer",
    )
    req = beef_requirements(inp)
    return RequirementsOut(**req.__dict__)
