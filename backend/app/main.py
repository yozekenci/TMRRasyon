import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import FeedIngredient


def seed_ingredients(db):
    """Builtin yem veritabanını yükle (sadece boşsa)."""
    if db.query(FeedIngredient).filter(FeedIngredient.source == "builtin").count() > 0:
        return

    seed_path = os.path.join(os.path.dirname(__file__), "..", "seed", "ingredients_nrc2023.json")
    if not os.path.exists(seed_path):
        return

    with open(seed_path, encoding="utf-8") as f:
        ingredients = json.load(f)

    for item in ingredients:
        db.add(FeedIngredient(**item, source="builtin"))
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tabloları oluştur
    Base.metadata.create_all(bind=engine)
    # Seed data yükle
    db = SessionLocal()
    try:
        seed_ingredients(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="TMR Rasyon Programı API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları ekle
from app.api import animals, ingredients, rations  # noqa: E402

app.include_router(ingredients.router, prefix="/api/ingredients", tags=["ingredients"])
app.include_router(animals.router, prefix="/api/animals", tags=["animals"])
app.include_router(rations.router, prefix="/api/rations", tags=["rations"])


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "TMR Rasyon Programı"}
