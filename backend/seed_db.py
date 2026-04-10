"""
Bağımsız seed scripti — backend başlamadan DB'ye hammadde yükler.
Çalıştır: cd backend && python3.11 seed_db.py
"""
import json
import os
import sys

# app/ klasörünü path'e ekle
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, SessionLocal, engine
from app.models import FeedIngredient


def run():
    # Tabloları oluştur
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(FeedIngredient).filter(FeedIngredient.source == "builtin").count()
        if existing > 0:
            print(f"✓ Zaten {existing} builtin hammadde mevcut. Silinip yeniden yükleniyor...")
            db.query(FeedIngredient).filter(FeedIngredient.source == "builtin").delete()
            db.commit()

        seed_path = os.path.join(os.path.dirname(__file__), "seed", "ingredients_nrc2023.json")
        with open(seed_path, encoding="utf-8") as f:
            ingredients = json.load(f)

        for item in ingredients:
            db.add(FeedIngredient(**item, source="builtin"))
        db.commit()

        total = db.query(FeedIngredient).filter(FeedIngredient.source == "builtin").count()
        print(f"✅ {total} hammadde başarıyla yüklendi.")

        # Liste
        for ing in db.query(FeedIngredient).filter(FeedIngredient.source == "builtin").all():
            print(f"  {ing.id:3d}. {ing.name_tr or ing.name:<40} [{ing.category}]")

    finally:
        db.close()


if __name__ == "__main__":
    run()
