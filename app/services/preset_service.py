"""
Cloudinary Upload Preset Configuration for DIT Forms.

Run this script to create/update upload presets that enforce consistent
IC card formatting across all submissions.

Usage:
    python -m app.services.preset_service
"""
import cloudinary
import cloudinary.api
import json
from app.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

PRESETS = {
    "dit-ic-card": {
        "unsigned": False,
        "folder": "dit-forms/students/ic",
        "resource_type": "image",
        "allowed_formats": ["jpg", "jpeg", "png"],
        "transformation": {
            "width": 400,
            "height": 300,
            "gravity": "auto",
            "crop": "thumb",
            "quality": "auto:good",
            "fetch_format": "auto",
            "effect": "sharpen:100",
            "background": "white",
        },
        "context": "alt=DIT Student IC Card|caption=Auto-cropped student identification",
        "tags": ["dit-forms", "ic-card", "student-id"],
    },
    "dit-document": {
        "unsigned": False,
        "folder": "dit-forms/students/documents",
        "resource_type": "auto",
        "allowed_formats": ["jpg", "jpeg", "png", "pdf"],
        "transformation": {
            "quality": "auto",
            "fetch_format": "auto",
        },
        "context": "alt=DIT Student Document",
        "tags": ["dit-forms", "document"],
    },
    "dit-receipt": {
        "unsigned": False,
        "folder": "dit-forms/receipts",
        "resource_type": "image",
        "allowed_formats": ["jpg", "jpeg", "png"],
        "transformation": {
            "width": 800,
            "height": 1100,
            "gravity": "auto",
            "crop": "limit",
            "quality": "auto:good",
            "fetch_format": "auto",
        },
        "context": "alt=DIT Payment Receipt",
        "tags": ["dit-forms", "receipt", "payment"],
    },
}


def create_presets():
    """Create or update all Cloudinary upload presets."""
    results = {}
    for name, config in PRESETS.items():
        try:
            existing = cloudinary.api.upload_presets()
            preset_list = existing.get("presets", []) if isinstance(existing, dict) else []
            exists = any(p.get("name") == name for p in preset_list)

            if exists:
                cloudinary.api.update_upload_preset(name, **config)
                print(f"  ✅ Updated preset: {name}")
                results[name] = "updated"
            else:
                cloudinary.api.create_upload_preset(name=name, **config)
                print(f"  ✅ Created preset: {name}")
                results[name] = "created"
        except Exception as e:
            print(f"  ❌ Failed {name}: {e}")
            results[name] = f"error: {e}"

    return results


def list_presets():
    """List all existing upload presets."""
    try:
        result = cloudinary.api.upload_presets()
        presets = result.get("presets", []) if isinstance(result, dict) else []
        print(f"\nFound {len(presets)} upload presets:")
        for p in presets:
            print(f"  - {p.get('name')} (unsigned: {p.get('unsigned', False)})")
        return presets
    except Exception as e:
        print(f"Error listing presets: {e}")
        return []


def delete_preset(name: str):
    """Delete a specific upload preset."""
    try:
        cloudinary.api.delete_upload_preset(name)
        print(f"  ✅ Deleted preset: {name}")
    except Exception as e:
        print(f"  ❌ Failed to delete {name}: {e}")


if __name__ == "__main__":
    print("🔧 DIT Forms — Cloudinary Upload Preset Configuration")
    print("=" * 55)
    print(f"\nCloud: {settings.CLOUDINARY_CLOUD_NAME}")
    print(f"\nPresets to configure:")
    for name, config in PRESETS.items():
        print(f"  - {name}: {config['folder']} ({config['resource_type']})")

    print("\nCreating/updating presets...")
    results = create_presets()

    print("\n📋 Current presets:")
    list_presets()

    print("\nDone!")
