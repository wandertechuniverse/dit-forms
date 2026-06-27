import cloudinary.api
from datetime import datetime

from app.config import get_settings

FREE_TIER_LIMITS = {
    "storage_gb": 25,
    "bandwidth_gb": 25,
    "transformations": 25000,
}

ALERT_THRESHOLDS = [0.7, 0.85, 0.95]


async def check_cloudinary_usage() -> list[dict]:
    """Check current usage against free tier limits. Returns active alerts."""
    try:
        usage = cloudinary.api.usage()
        alerts = []

        storage_info = usage.get("plan", {}).get("storage", {})
        storage_used_bytes = storage_info.get("used", 0) if isinstance(storage_info, dict) else 0
        storage_used_gb = storage_used_bytes / (1024**3)
        storage_pct = storage_used_gb / FREE_TIER_LIMITS["storage_gb"]

        for threshold in ALERT_THRESHOLDS:
            if storage_pct >= threshold:
                alerts.append(
                    {
                        "type": "storage",
                        "severity": "critical" if threshold >= 0.95 else "warning",
                        "message": f"Storage at {storage_pct:.0%} ({storage_used_gb:.1f}GB / {FREE_TIER_LIMITS['storage_gb']}GB)",
                        "threshold": threshold,
                        "current_pct": round(storage_pct, 4),
                    }
                )

        bw_info = usage.get("plan", {}).get("bandwidth", {})
        bw_used_bytes = bw_info.get("used", 0) if isinstance(bw_info, dict) else 0
        bw_used_gb = bw_used_bytes / (1024**3)
        bw_pct = bw_used_gb / FREE_TIER_LIMITS["bandwidth_gb"]

        for threshold in ALERT_THRESHOLDS:
            if bw_pct >= threshold:
                alerts.append(
                    {
                        "type": "bandwidth",
                        "severity": "critical" if threshold >= 0.95 else "warning",
                        "message": f"Bandwidth at {bw_pct:.0%} ({bw_used_gb:.1f}GB / {FREE_TIER_LIMITS['bandwidth_gb']} this month)",
                        "threshold": threshold,
                        "current_pct": round(bw_pct, 4),
                    }
                )

        return alerts

    except Exception as e:
        print(f"[CLOUDINARY MONITOR] Failed to check usage: {e}")
        return []


async def get_usage_summary() -> dict:
    """Return a human-readable usage summary for dashboard display."""
    try:
        usage = cloudinary.api.usage()

        storage_info = usage.get("plan", {}).get("storage", {})
        storage_used_bytes = storage_info.get("used", 0) if isinstance(storage_info, dict) else 0

        bw_info = usage.get("plan", {}).get("bandwidth", {})
        bw_used_bytes = bw_info.get("used", 0) if isinstance(bw_info, dict) else 0

        return {
            "storage": {
                "used_gb": round(storage_used_bytes / (1024**3), 2),
                "limit_gb": FREE_TIER_LIMITS["storage_gb"],
                "pct": round(storage_used_bytes / (1024**3) / FREE_TIER_LIMITS["storage_gb"] * 100, 1),
            },
            "bandwidth": {
                "used_gb": round(bw_used_bytes / (1024**3), 2),
                "limit_gb": FREE_TIER_LIMITS["bandwidth_gb"],
                "pct": round(bw_used_bytes / (1024**3) / FREE_TIER_LIMITS["bandwidth_gb"] * 100, 1),
            },
            "checked_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e)}
