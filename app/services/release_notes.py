import re
from datetime import datetime
from typing import List, Dict

CATEGORIES = {
    "New Features": r"^(feat|feature|new):\s*(.+)",
    "Bug Fixes": r"^(fix|bug|patch):\s*(.+)",
    "Performance": r"^(perf|optimize|speed):\s*(.+)",
    "Security": r"^(sec|security|auth):\s*(.+)",
    "Documentation": r"^(docs|doc|readme):\s*(.+)",
    "Maintenance": r"^(chore|refactor|cleanup):\s*(.+)",
}


def parse_commits(commits: List[Dict]) -> Dict[str, List[str]]:
    categorized: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}
    for commit in commits:
        msg = commit.get("message", "").strip()
        if not msg or msg.startswith("Merge"):
            continue
        matched = False
        for category, pattern in CATEGORIES.items():
            match = re.match(pattern, msg, re.IGNORECASE)
            if match:
                clean_msg = match.group(2).strip().capitalize()
                if clean_msg not in categorized[category]:
                    categorized[category].append(clean_msg)
                matched = True
                break
        if not matched and msg:
            categorized["Maintenance"].append(msg.capitalize())
    return {k: v for k, v in categorized.items() if v}


def generate_release_notes(categorized: Dict[str, List[str]], version: str = None) -> str:
    lines = [f"# DIT Tracker Update - {datetime.utcnow().strftime('%B %d, %Y')}"]
    if version:
        lines.append(f"**Version:** `{version}`\n")
    for category, items in categorized.items():
        lines.append(f"## {category}")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")
    lines.append("---")
    lines.append("_Questions? Visit /rep/dashboard_")
    return "\n".join(lines)
