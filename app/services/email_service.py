import logging

logger = logging.getLogger("dit_forms.email")


def send_usage_alert(
    alert_type: str,
    severity: str,
    current_pct: float,
    used_value: float,
    limit_value: float,
):
    """Send email alert for Cloudinary usage. Logs for now; integrate SMTP/SendGrid later."""
    msg = (
        f"[DIT Forms] Cloudinary {severity.upper()}: {alert_type} "
        f"at {current_pct:.0%} ({used_value:.1f}GB / {limit_value}GB)"
    )
    logger.warning(msg)
    return True
