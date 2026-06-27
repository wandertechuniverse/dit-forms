import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import init_db
from app.models.student import Student

async def cleanup_duplicates():
    await init_db()
    
    print("Scanning for duplicate students...")
    
    pipeline = [
        {
            "$group": {
                "_id": {
                    "programClassId": "$programClassId",
                    "termId": "$termId",
                    "idNumber": "$idNumber"
                },
                "count": {"$sum": 1},
                "ids": {"$push": "$_id"}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    
    duplicates_cursor = Student.aggregate(pipeline)
    total_removed = 0
    
    async for doc in duplicates_cursor:
        ids = doc["ids"]
        students = await Student.find({"_id": {"$in": ids}}).to_list()
        
        if len(students) > 1:
            students.sort(key=lambda x: x.createdAt, reverse=True)
            to_keep = students[0]
            to_delete = students[1:]
            
            print(f"  Keeping: {to_keep.fullName} ({to_keep.idNumber}) - {to_keep.createdAt}")
            for s in to_delete:
                print(f"  Removing: {s.fullName} ({s.idNumber}) - {s.createdAt}")
                await s.delete()
                total_removed += 1
                
    print(f"Cleanup complete. Removed {total_removed} duplicate student records.")
    print("IMPORTANT: Restart your backend server now so Beanie can create the unique index.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
