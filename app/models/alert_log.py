from beanie import Document
from datetime import date


class AlertLog(Document):
    metric: str  # "storage" | "bandwidth"
    threshold: float  # 0.7 | 0.85 | 0.95
    alertDate: date  # Prevents duplicate daily alerts
    message: str  # Human-readable alert text
    severity: str = "warning"  # "warning" | "critical"

    class Settings:
        name = "alert_logs"
        indexes = [("metric", "threshold", "alertDate")]
