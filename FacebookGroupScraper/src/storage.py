import json
from pathlib import Path
from typing import Dict, Any, List, Set

from src.logger import logger

CONFIG_FILE = "config.json"
DATA_DIR = Path("data")
POSTS_FILE = DATA_DIR / "posts.json"


def load_config() -> Dict[str, Any]:
    """Load config.json and return as dict."""
    path = Path(CONFIG_FILE)
    if not path.exists():
        logger.error(f"{CONFIG_FILE} not found")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_seen_urls() -> Set[str]:
    """Read posts.json and return a set of all post_url values for dedup."""
    if not POSTS_FILE.exists():
        return set()
    try:
        with open(POSTS_FILE, "r", encoding="utf-8") as f:
            posts = json.load(f)
        return {p["post_url"] for p in posts if p.get("post_url")}
    except (json.JSONDecodeError, KeyError):
        return set()


def load_posts() -> List[Dict]:
    """Load existing posts from JSON file."""
    if not POSTS_FILE.exists():
        return []
    try:
        with open(POSTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []


def append_posts(new_posts: List[Dict]) -> int:
    """Append new posts to posts.json. Returns number of posts actually added."""
    if not new_posts:
        return 0

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing = load_posts()
    existing.extend(new_posts)

    with open(POSTS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    return len(new_posts)
