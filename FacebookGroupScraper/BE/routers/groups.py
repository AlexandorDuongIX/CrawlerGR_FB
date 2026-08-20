"""Group management routes: list, add, remove, activate."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.database import get_groups, add_group, remove_group, activate_group, delete_group

router = APIRouter(prefix="/groups", tags=["Groups"])


class GroupCreate(BaseModel):
    url: str
    name: str = ""


@router.get("")
def list_groups():
    """Get all groups."""
    groups = get_groups()
    return {"groups": groups, "total": len(groups)}


@router.post("")
def create_group(body: GroupCreate):
    """Add a new group URL to scrape."""
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL không được để trống")
    if "facebook.com/groups/" not in url:
        raise HTTPException(status_code=400, detail="URL phải là link nhóm Facebook")

    group = add_group(url, body.name)
    if not group:
        raise HTTPException(status_code=500, detail="Không thể thêm nhóm")

    return {"message": "Đã thêm nhóm", "group": group}


@router.patch("/{group_id}/activate")
def reactivate_group(group_id: int):
    """Reactivate a paused group (set active=TRUE)."""
    success = activate_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    return {"message": "Đã kích hoạt nhóm", "group_id": group_id}


@router.delete("/{group_id}")
def deactivate_group(group_id: int):
    """Soft-delete a group (set active=FALSE). Posts are kept."""
    success = remove_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    return {"message": "Đã tắt nhóm", "group_id": group_id}


@router.delete("/{group_id}/permanent")
def hard_delete_group(group_id: int):
    """Permanently delete a group from DB. Posts are kept."""
    success = delete_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    return {"message": "Đã xóa nhóm vĩnh viễn", "group_id": group_id}
