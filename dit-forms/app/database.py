from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import get_settings
from app.models import (
    User, Student, FormDefinition, FormVersion,
    FormSubmission, SubmissionFile, HandoutOrder, Payment,
)
from app.models.group import StudentGroup


async def init_db() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    await init_beanie(
        database=db,
        document_models=[
            User,
            Student,
            StudentGroup,
            FormDefinition,
            FormVersion,
            FormSubmission,
            SubmissionFile,
            HandoutOrder,
            Payment,
        ],
    )
