import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import init_db
from app.models.user import User
from app.core.security import hash_password


async def seed():
    await init_db()

    admin_email = "admin@dit.edu"
    admin_password = "admin123"

    existing = await User.find_one(User.email == admin_email)
    if existing:
        print(f"Admin user already exists: {admin_email}")
        return

    admin_user = User(
        email=admin_email,
        passwordHash=hash_password(admin_password),
        role="admin",
        status="active",
    )
    await admin_user.insert()
    print(f"Admin user created successfully!")
    print(f"   Email: {admin_email}")
    print(f"   Password: {admin_password}")


if __name__ == "__main__":
    asyncio.run(seed())
