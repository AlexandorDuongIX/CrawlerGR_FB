"""Posts display routes: paginated list with search/filter."""
from fastapi import APIRouter, Query
from typing import Optional

from src.database import get_posts

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("")
def list_posts(
    page: int = Query(1, ge=1, description="Trang"),
    per_page: int = Query(20, ge=1, le=100, description="Số bài mỗi trang"),
    group_url: Optional[str] = Query(None, description="Lọc theo URL nhóm"),
    search: Optional[str] = Query(None, description="Tìm trong caption/author"),
):
    """Get paginated posts from database.
    
    - **page**: Page number (default 1)
    - **per_page**: Items per page (default 20, max 100)
    - **group_url**: Filter by specific group URL
    - **search**: Search in caption and author name
    """
    return get_posts(
        page=page,
        per_page=per_page,
        group_url=group_url,
        search=search,
    )
