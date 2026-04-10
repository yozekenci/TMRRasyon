from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IngredientSource(str, PyEnum):
    builtin = "builtin"
    user = "user"


class IngredientCategory(str, PyEnum):
    roughage = "roughage"          # Kaba yem
    concentrate = "concentrate"    # Kesif yem
    byproduct = "byproduct"        # Yan ürün
    mineral = "mineral"            # Mineral
    vitamin = "vitamin"            # Vitamin
    additive = "additive"          # Katkı maddesi


class AnimalSpecies(str, PyEnum):
    beef = "beef"      # Besi sığırı


class OptimizationMode(str, PyEnum):
    manual = "manual"
    lp = "lp"


class FeedIngredient(Base):
    __tablename__ = "feed_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_tr: Mapped[str | None] = mapped_column(String(200))  # Türkçe ad
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Kuru madde ve enerji (kuru madde bazında)
    dm_pct: Mapped[float | None] = mapped_column(Float)        # Kuru madde %
    nel_mcal_kg: Mapped[float | None] = mapped_column(Float)   # NEL Mcal/kg KM
    nem_mcal_kg: Mapped[float | None] = mapped_column(Float)   # NEm Mcal/kg KM
    neg_mcal_kg: Mapped[float | None] = mapped_column(Float)   # NEg Mcal/kg KM

    # Protein fraksiyonları (KM bazında %)
    cp_pct: Mapped[float | None] = mapped_column(Float)        # Ham protein
    rup_pct: Mapped[float | None] = mapped_column(Float)       # RUP (% CP)
    rdp_pct: Mapped[float | None] = mapped_column(Float)       # RDP (% CP)

    # Yapısal karbonhidratlar (KM bazında %)
    ndf_pct: Mapped[float | None] = mapped_column(Float)       # NDF
    adf_pct: Mapped[float | None] = mapped_column(Float)       # ADF
    nfc_pct: Mapped[float | None] = mapped_column(Float)       # NFC

    # Mineraller (KM bazında %)
    ca_pct: Mapped[float | None] = mapped_column(Float)        # Kalsiyum
    p_pct: Mapped[float | None] = mapped_column(Float)         # Fosfor
    mg_pct: Mapped[float | None] = mapped_column(Float)        # Magnezyum
    k_pct: Mapped[float | None] = mapped_column(Float)         # Potasyum
    na_pct: Mapped[float | None] = mapped_column(Float)        # Sodyum
    cl_pct: Mapped[float | None] = mapped_column(Float)        # Klor
    s_pct: Mapped[float | None] = mapped_column(Float)         # Kükürt

    # Vitaminler (IU/kg KM)
    vit_a_iu_kg: Mapped[float | None] = mapped_column(Float)
    vit_d_iu_kg: Mapped[float | None] = mapped_column(Float)
    vit_e_iu_kg: Mapped[float | None] = mapped_column(Float)

    # Fiyat ve notlar
    price_per_kg_tl: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    ration_items: Mapped[list["RationItem"]] = relationship(back_populates="ingredient")


class AnimalProfile(Base):
    __tablename__ = "animal_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    species: Mapped[str] = mapped_column(String(20), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(100))
    sex: Mapped[str | None] = mapped_column(String(20))
    live_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)

    # Besi sığırı alanları
    target_adg_kg: Mapped[float | None] = mapped_column(Float)   # Günlük kazanım hedefi
    days_on_feed: Mapped[int | None] = mapped_column(Integer)

    # Sürü büyüklüğü
    herd_size: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    rations: Mapped[list["Ration"]] = relationship(back_populates="animal_profile")


class Ration(Base):
    __tablename__ = "rations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    animal_profile_id: Mapped[int] = mapped_column(ForeignKey("animal_profiles.id"), nullable=False)
    optimization_mode: Mapped[str] = mapped_column(String(20), default="manual")

    total_dm_kg: Mapped[float | None] = mapped_column(Float)
    total_fresh_kg: Mapped[float | None] = mapped_column(Float)
    total_cost_tl: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    animal_profile: Mapped["AnimalProfile"] = relationship(back_populates="rations")
    items: Mapped[list["RationItem"]] = relationship(back_populates="ration", cascade="all, delete-orphan")


class RationItem(Base):
    __tablename__ = "ration_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ration_id: Mapped[int] = mapped_column(ForeignKey("rations.id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("feed_ingredients.id"), nullable=False)

    fresh_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    dm_weight_kg: Mapped[float | None] = mapped_column(Float)

    ration: Mapped["Ration"] = relationship(back_populates="items")
    ingredient: Mapped["FeedIngredient"] = relationship(back_populates="ration_items")
