import io
from typing import List, Dict, Any, Optional
import pandas as pd
from pymongo.errors import DuplicateKeyError

from app.models.student import Student


def _detect_columns(df: pd.DataFrame) -> Dict[str, Optional[int]]:
    """
    Detect which column index holds which data.
    Handles two cases:
    1. Headerless files: numeric columns (0,1,2) -> map positionally
    2. Headered files: string columns -> match by alias
    """
    columns = list(df.columns)

    # Case 1: Headerless — all columns are integers (0, 1, 2, ...)
    if all(isinstance(c, (int, float)) for c in columns):
        int_cols = [int(c) for c in columns]
        if len(columns) >= 3:
            return {
                "row_number": 0,
                "id_number": 1,
                "full_name": 2,
                "program_class_id": None,
                "term_id": None,
            }
        return {}

    # Case 2: Headered — match by known aliases
    ALIASES = {
        "full_name": ["fullname", "student name", "name", "full name", "studentname"],
        "id_number": ["idnumber", "student id", "reg no", "registration number", "id number", "studentid", "regno"],
        "program_class_id": ["programclassid", "class", "program", "class id", "program class", "programclass"],
        "term_id": ["termid", "term", "semester", "term id", "sem"],
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


async def import_students_from_excel(
    file_content: bytes,
    default_program_class_id: Optional[str] = None,
    default_term_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Parses an Excel file and bulk inserts students.
    If programClassId or termId are missing, uses the provided defaults.
    """
    df = pd.read_excel(io.BytesIO(file_content), header=None)

    col_map = _detect_columns(df)

    col_full_name = col_map.get("full_name")
    col_id_number = col_map.get("id_number")
    col_program_class = col_map.get("program_class_id")
    col_term = col_map.get("term_id")

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

            student = Student(
                programClassId=program_class_id,
                termId=term_id,
                fullName=full_name,
                idNumber=id_number,
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
