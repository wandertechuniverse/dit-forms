import io
from typing import List, Dict, Any, Optional
import pandas as pd
from pymongo.errors import DuplicateKeyError

from app.models.student import Student


def _detect_columns(df: pd.DataFrame) -> Dict[str, Optional[int]]:
    columns = list(df.columns)

    if all(isinstance(c, (int, float)) for c in columns):
        if len(columns) >= 3:
            return {
                "row_number": 0,
                "id_number": 1,
                "full_name": 2,
                "program_class_id": None,
                "term_id": None,
                "groups": None,
            }
        return {}

    ALIASES = {
        "full_name": ["fullname", "student name", "name", "full name", "studentname"],
        "id_number": ["idnumber", "student id", "reg no", "registration number", "id number", "studentid", "regno"],
        "program_class_id": ["programclassid", "class", "program", "class id", "program class", "programclass"],
        "term_id": ["termid", "term", "semester", "term id", "sem"],
        "groups": ["groups", "group", "tag", "tags", "category", "shift", "section"],
    }

    normalized = {str(c).strip().lower().replace(" ", "_"): idx for idx, c in enumerate(columns)}
    result: Dict[str, Optional[int]] = {}

    for key, aliases in ALIASES.items():
        found = None
        for alias in aliases:
            if alias in normalized:
                found = normalized[alias]
                break
        result[key] = found

    return result


def _parse_groups(value) -> List[str]:
    if pd.isna(value) or not value:
        return []
    s = str(value).strip()
    if not s or s == "nan":
        return []
    parts = [g.strip() for g in s.replace(";", ",").split(",") if g.strip()]
    return parts


async def import_students_from_excel(
    file_content: bytes,
    default_program_class_id: Optional[str] = None,
    default_term_id: Optional[str] = None,
) -> Dict[str, Any]:
    df = pd.read_excel(io.BytesIO(file_content), header=None)

    col_map = _detect_columns(df)

    col_full_name = col_map.get("full_name")
    col_id_number = col_map.get("id_number")
    col_program_class = col_map.get("program_class_id")
    col_term = col_map.get("term_id")
    col_groups = col_map.get("groups")

    if col_full_name is None or col_id_number is None:
        raise ValueError(
            f"Could not detect Student Name and ID Number columns. "
            f"Found columns: {list(df.columns)}"
        )

    total_rows = len(df)
    created = 0
    skipped = 0
    errors: List[str] = []

    for index, row in df.iterrows():
        try:
            full_name = str(row.iloc[col_full_name]).strip() if pd.notna(row.iloc[col_full_name]) else None
            id_number = str(row.iloc[col_id_number]).strip() if pd.notna(row.iloc[col_id_number]) else None

            if not full_name or not id_number or full_name == "nan" or id_number == "nan":
                continue

            program_class_id = (
                str(row.iloc[col_program_class]).strip()
                if col_program_class is not None and pd.notna(row.iloc[col_program_class])
                else default_program_class_id
            )
            term_id = (
                str(row.iloc[col_term]).strip()
                if col_term is not None and pd.notna(row.iloc[col_term])
                else default_term_id
            )

            if not program_class_id or not term_id:
                errors.append(f"Row {index + 2} ({id_number}): Missing Program Class or Term.")
                continue

            groups = _parse_groups(row.iloc[col_groups]) if col_groups is not None else []

            student = Student(
                programClassId=program_class_id,
                termId=term_id,
                fullName=full_name,
                idNumber=id_number,
                groups=groups,
            )

            try:
                await student.insert()
                created += 1
            except DuplicateKeyError:
                skipped += 1

        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    return {
        "total_rows": total_rows,
        "created": created,
        "skipped_duplicates": skipped,
        "errors": errors,
    }
