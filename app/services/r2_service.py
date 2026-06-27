import uuid
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import get_settings


def get_r2_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_ACCESS_KEY,
        aws_secret_access_key=settings.R2_SECRET_KEY,
        region_name="auto",
        config=BotoConfig(signature_version="s3v4"),
    )


def build_r2_key(submission_id: str, field_key: str, original_name: str) -> str:
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ".-_ ").strip()
    unique = uuid.uuid4().hex[:10]
    return f"submissions/{submission_id}/{field_key}/{unique}-{safe_name}"


def generate_presigned_upload(
    r2_key: str,
    content_type: str,
    expires_in: Optional[int] = None,
) -> dict:
    settings = get_settings()
    client = get_r2_client()
    expires = expires_in or settings.R2_PRESIGN_EXPIRES

    url = client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.R2_BUCKET,
            "Key": r2_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )
    return {"uploadUrl": url, "r2Key": r2_key, "expiresIn": expires}


def generate_presigned_download(
    r2_key: str,
    filename: Optional[str] = None,
    expires_in: Optional[int] = None,
) -> str:
    settings = get_settings()
    client = get_r2_client()
    expires = expires_in or settings.R2_PRESIGN_EXPIRES

    params: dict = {
        "Bucket": settings.R2_BUCKET,
        "Key": r2_key,
    }
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

    return client.generate_presigned_url(
        ClientMethod="get_object",
        Params=params,
        ExpiresIn=expires,
    )


def delete_r2_object(r2_key: str) -> bool:
    settings = get_settings()
    client = get_r2_client()
    try:
        client.delete_object(Bucket=settings.R2_BUCKET, Key=r2_key)
        return True
    except ClientError:
        return False
