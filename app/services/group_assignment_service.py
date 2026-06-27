import random
from typing import List, Dict, Optional
from app.models.student import Student
from app.models.group import StudentGroup


class GroupAssignmentService:
    MAX_GROUP_SIZE = 50
    MIN_GROUP_SIZE = 5

    @staticmethod
    async def assign_students_randomly(
        program_class_id: str,
        term_id: str,
        target_size: int = 25,
        exclude_grouped: bool = True,
    ) -> Dict:
        query: dict = {"programClassId": program_class_id, "termId": term_id}
        if exclude_grouped:
            query["groups"] = {"$size": 0}

        students = await Student.find(query).to_list()
        if not students:
            return {"created_groups": [], "assigned_count": 0, "remaining": 0}

        random.shuffle(students)

        created_groups: List[str] = []
        assigned_count = 0
        idx = 0

        while idx < len(students):
            group_name = f"group-{len(created_groups) + 1:02d}"
            new_group = StudentGroup(
                programClassId=program_class_id,
                termId=term_id,
                name=group_name,
                color=f"#{random.randint(0x4F46E5, 0x8B5CF6):06x}",
            )
            await new_group.insert()
            created_groups.append(group_name)

            fill_count = min(target_size, len(students) - idx)
            for i in range(fill_count):
                student = students[idx]
                student.groups.append(group_name)
                await student.save()
                assigned_count += 1
                idx += 1

        return {
            "created_groups": created_groups,
            "assigned_count": assigned_count,
            "remaining": len(students) - assigned_count,
        }

    @staticmethod
    async def validate_group_edit(group: StudentGroup, action: str) -> Optional[str]:
        if action == "delete":
            count = await Student.find(
                {
                    "programClassId": group.programClassId,
                    "termId": group.termId,
                    "groups": group.name,
                }
            ).count()
            if count > 0:
                return f"Cannot delete group with {count} active students. Reassign first."

        elif action == "rename":
            exists = await StudentGroup.find_one(
                {
                    "programClassId": group.programClassId,
                    "termId": group.termId,
                    "name": group.name,
                }
            )
            if exists and exists.id != group.id:
                return "Group name already exists in this class/term."

        return None
