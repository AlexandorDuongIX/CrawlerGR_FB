import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from typing import List, Dict, Set, Optional

from src.logger import logger

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "GR_Crawler",
    "user": "postgres",
    "password": "postgres",
}

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    group_url TEXT NOT NULL,
    group_name TEXT NOT NULL,
    author TEXT NOT NULL,
    caption TEXT NOT NULL,
    post_url TEXT UNIQUE NOT NULL,
    scraped_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_post_url ON posts (post_url);
CREATE INDEX IF NOT EXISTS idx_posts_group_url ON posts (group_url);
CREATE INDEX IF NOT EXISTS idx_posts_scraped_at ON posts (scraped_at);

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_groups_url ON groups (url);
"""


def get_connection():
    """Create and return a new database connection."""
    return psycopg2.connect(**DB_CONFIG)


def init_db():
    """Create tables if they don't exist."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(CREATE_TABLES_SQL)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Database initialized")
        return True
    except Exception as e:
        logger.error(f"Database init failed: {e}")
        return False


# ────────────────────────────────────────────
# Posts
# ────────────────────────────────────────────

def load_seen_urls_from_db() -> Set[str]:
    """Load all existing post_url values from DB for dedup."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT post_url FROM posts")
        urls = {row[0] for row in cur.fetchall()}
        cur.close()
        conn.close()
        return urls
    except Exception as e:
        logger.error(f"Failed to load seen URLs from DB: {e}")
        return set()


def insert_posts_to_db(posts: List[Dict]) -> int:
    """Insert new posts into PostgreSQL. Returns count of inserted rows."""
    if not posts:
        return 0
    try:
        conn = get_connection()
        cur = conn.cursor()
        values = [
            (
                p["group_url"], p["group_name"], p["author"],
                p["caption"], p["post_url"], p["scraped_at"],
            )
            for p in posts
        ]
        sql = """
            INSERT INTO posts (group_url, group_name, author, caption, post_url, scraped_at)
            VALUES %s
            ON CONFLICT (post_url) DO UPDATE 
            SET caption = EXCLUDED.caption, scraped_at = EXCLUDED.scraped_at
        """
        execute_values(cur, sql, values)
        inserted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return inserted
    except Exception as e:
        logger.error(f"Failed to insert posts to DB: {e}")
        return 0


def get_post_count() -> int:
    """Get total number of posts in DB."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM posts")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return count
    except Exception:
        return 0


def get_posts(
    page: int = 1,
    per_page: int = 20,
    group_url: Optional[str] = None,
    search: Optional[str] = None,
) -> Dict:
    """Get paginated posts from DB.
    
    Returns dict with: posts, total, page, per_page, total_pages
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        where_clauses = []
        params = []

        if group_url:
            where_clauses.append("group_url = %s")
            params.append(group_url)
        if search:
            where_clauses.append("(caption ILIKE %s OR author ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)

        # Count total
        cur.execute(f"SELECT COUNT(*) as cnt FROM posts {where_sql}", params)
        total = cur.fetchone()["cnt"]

        # Fetch page
        offset = (page - 1) * per_page
        cur.execute(
            f"SELECT id, group_url, group_name, author, caption, post_url, "
            f"scraped_at FROM posts {where_sql} "
            f"ORDER BY scraped_at DESC LIMIT %s OFFSET %s",
            params + [per_page, offset],
        )
        rows = cur.fetchall()

        # Convert datetime to string
        posts = []
        for row in rows:
            post = dict(row)
            post["scraped_at"] = post["scraped_at"].isoformat()
            posts.append(post)

        cur.close()
        conn.close()

        total_pages = (total + per_page - 1) // per_page

        return {
            "posts": posts,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
    except Exception as e:
        logger.error(f"Failed to get posts: {e}")
        return {"posts": [], "total": 0, "page": 1, "per_page": per_page, "total_pages": 0}


def cleanup_old_posts(days: int = 5) -> int:
    """Delete posts older than specified days."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM posts WHERE scraped_at < NOW() - INTERVAL '{days} days'")
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        if affected > 0:
            logger.info(f"Cleaned up {affected} posts older than {days} days.")
        return affected
    except Exception as e:
        logger.error(f"Failed to cleanup old posts: {e}")
        return 0


# ────────────────────────────────────────────
# Groups
# ────────────────────────────────────────────

def get_groups() -> List[Dict]:
    """Get all groups from DB."""
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, url, name, added_at, active FROM groups ORDER BY id"
        )
        rows = cur.fetchall()
        groups = []
        for row in rows:
            g = dict(row)
            g["added_at"] = g["added_at"].isoformat()
            groups.append(g)
        cur.close()
        conn.close()
        return groups
    except Exception as e:
        logger.error(f"Failed to get groups: {e}")
        return []


def get_active_group_urls() -> List[str]:
    """Get URLs of all active groups."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT url FROM groups WHERE active = TRUE ORDER BY id")
        urls = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
        return urls
    except Exception as e:
        logger.error(f"Failed to get active groups: {e}")
        return []


def add_group(url: str, name: str = "") -> Optional[Dict]:
    """Add a new group. Returns the group dict or None if already exists."""
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "INSERT INTO groups (url, name) VALUES (%s, %s) "
            "ON CONFLICT (url) DO UPDATE SET active = TRUE "
            "RETURNING id, url, name, added_at, active",
            (url, name),
        )
        row = dict(cur.fetchone())
        row["added_at"] = row["added_at"].isoformat()
        conn.commit()
        cur.close()
        conn.close()
        return row
    except Exception as e:
        logger.error(f"Failed to add group: {e}")
        return None


def remove_group(group_id: int) -> bool:
    """Remove a group by ID (soft delete — set active=FALSE)."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE groups SET active = FALSE WHERE id = %s", (group_id,))
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return affected > 0
    except Exception as e:
        logger.error(f"Failed to remove group: {e}")
        return False


def activate_group(group_id: int) -> bool:
    """Reactivate a group by ID (set active=TRUE)."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE groups SET active = TRUE WHERE id = %s", (group_id,))
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return affected > 0
    except Exception as e:
        logger.error(f"Failed to activate group: {e}")
        return False


def delete_group(group_id: int) -> bool:
    """Hard delete a group by ID."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM groups WHERE id = %s", (group_id,))
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return affected > 0
    except Exception as e:
        logger.error(f"Failed to delete group: {e}")
        return False
