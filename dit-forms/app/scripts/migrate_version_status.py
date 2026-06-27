import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import init_db
from app.config import get_settings
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate():
    await init_db()
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    print("Migrating form_versions: isActive -> status...")
    await db.form_versions.update_many(
        {"isActive": True},
        {"$set": {"status": "published"}, "$unset": {"isActive": ""}}
    )
    await db.form_versions.update_many(
        {"isActive": False},
        {"$set": {"status": "archived"}, "$unset": {"isActive": ""}}
    )
    await db.form_versions.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "draft"}}
    )

    print("Migrating form_definitions: active/inactive -> draft/published/archived...")
    await db.form_definitions.update_many(
        {"status": "active"},
        {"$set": {"status": "published"}}
    )
    await db.form_definitions.update_many(
        {"status": "inactive"},
        {"$set": {"status": "archived"}}
    )
    await db.form_definitions.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "draft"}}
    )

    v_count = await db.form_versions.count_documents({})
    d_count = await db.form_definitions.count_documents({})
    print(f"Migration complete. {d_count} forms, {v_count} versions updated.")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
