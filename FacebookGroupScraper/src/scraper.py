import time
import re
from datetime import datetime
from typing import List, Dict, Set, Optional
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError

from src.logger import logger

# Patterns that indicate an anonymous poster
ANONYMOUS_PATTERNS = [
    "anonymous participant",
    "người tham gia ẩn danh",
    "anonymous",
]


def _dismiss_login_popup(page: Page):
    """Close Facebook login/cookie dialogs if they appear."""
    try:
        close_btn = page.locator('div[role="dialog"] >> div[aria-label="Close"]')
        if close_btn.count() > 0:
            close_btn.first.click(timeout=3000)
            page.wait_for_timeout(500)
    except Exception:
        pass


def _click_see_more(page: Page):
    """Expand all 'See more' / 'Xem thêm' buttons to reveal full captions."""
    try:
        page.evaluate('''() => {
            const buttons = document.querySelectorAll('div[role="button"]');
            for (const btn of buttons) {
                const text = btn.innerText ? btn.innerText.trim().toLowerCase() : '';
                if (text === 'xem thêm' || text === 'see more' || text.includes('xem thêm') || text.includes('see more')) {
                    btn.click();
                }
            }
        }''')
        page.wait_for_timeout(300)
    except Exception:
        pass


def _extract_group_name(page: Page) -> str:
    """Try to extract the group name from the page header."""
    try:
        h1 = page.locator("h1").first
        if h1.count() > 0:
            name = h1.inner_text(timeout=3000)
            if name and len(name.strip()) > 0:
                return name.strip()
    except Exception:
        pass
    return "Unknown Group"


def _extract_post_url(article) -> Optional[str]:
    """Extract post permalink URL from an article element.
    Returns None if this is a comment (URL contains comment_id)."""
    try:
        links = article.locator("a[href]").all()
        for link in links:
            href = link.get_attribute("href")
            if not href:
                continue

            # Skip comment URLs
            if "comment_id=" in href:
                continue

            # Match /groups/<id>/posts/<post_id>
            if re.search(r"/groups/\d+/posts/\d+", href):
                return _normalize_url(href)
            if re.search(r"/groups/[^/]+/posts/\d+", href):
                return _normalize_url(href)
            if "/permalink/" in href and "/groups/" in href:
                return _normalize_url(href)
    except Exception:
        pass
    return None


def _normalize_url(href: str) -> str:
    """Ensure URL is absolute and clean for dedup."""
    if href.startswith("/"):
        href = "https://www.facebook.com" + href
    match = re.search(r"(https://www\.facebook\.com/groups/[^/]+/posts/\d+)", href)
    if match:
        return match.group(1) + "/"
    match = re.search(r"(https://www\.facebook\.com/groups/\d+/permalink/\d+)", href)
    if match:
        return match.group(1) + "/"
    return href.split("?")[0]


def _is_comment_article(article) -> bool:
    """Check if this article is actually a comment, not a post.
    
    Comments don't have <h2> tags and their URLs contain comment_id.
    """
    try:
        # Comments typically have no <h2> header
        h2_count = article.locator("h2").count()
        if h2_count == 0:
            return True

        # Also check if all links are comment links
        links = article.locator("a[href]").all()
        has_post_link = False
        for link in links:
            href = link.get_attribute("href") or ""
            if re.search(r"/groups/\d+/posts/\d+", href) and "comment_id" not in href:
                has_post_link = True
                break
        if not has_post_link and links:
            return True
    except Exception:
        pass
    return False


def _extract_author(article, anonymous_name: str) -> str:
    """Extract author name from <h2> tag in article header.
    
    Based on DOM analysis:
    - Facebook puts the poster's name in an <h2> tag
    - Anonymous posts show "Anonymous participant" or localized equivalent
    """
    try:
        h2 = article.locator("h2").first
        if h2.count() > 0:
            name = h2.inner_text(timeout=2000).strip()
            if name:
                # Check if it's an anonymous poster
                name_lower = name.lower()
                for pattern in ANONYMOUS_PATTERNS:
                    if pattern in name_lower:
                        return anonymous_name
                return name
    except Exception:
        pass

    return anonymous_name


def _extract_caption(article, author: str) -> str:
    """Extract the full post caption text.
    
    Uses full article text with intelligent header/footer trimming.
    This is the most robust way because Facebook's DOM splits rich-text into multiple fragmented elements.
    """
    try:
        full_text = article.inner_text(timeout=2000)
        
        # 1. Trim Footer (Comments, Likes, Shares UI)
        cutoff_patterns = [
            r"\nAll comments", r"\nTất cả bình luận",
            r"\nMost relevant", r"\nPhù hợp nhất",
            r"\nWrite a comment", r"\nViết bình luận",
            r"\nView more comments", r"\nXem thêm bình luận",
            r"\nLike\nComment\nShare", r"\nThích\nBình luận\nChia sẻ",
            r"\nThích\n.*?\nChia sẻ", 
            r"\nXem \d+ phản hồi", r"\nView \d+ repl",
            r"\nXem phản hồi", r"\nView replies",
            r"\n\d+ bình luận", r"\n\d+ comments", 
            r"\nChia sẻ", r"\nShare",
            r"\nTất cả cảm xúc", r"\nAll reactions",
            r"\n\d+\s+cảm xúc", r"\n\d+\s+reactions",
            r"\n\d+\s+lượt thích", r"\n\d+\s+likes",
        ]
        
        min_pos = len(full_text)
        for pattern in cutoff_patterns:
            match = re.search(pattern, full_text, flags=re.IGNORECASE)
            if match and match.start() < min_pos:
                min_pos = match.start()
                
        text = full_text[:min_pos].strip()

        # 2. Trim Header (Author, Timestamp, Group Admin badges)
        lines = text.split("\n")
        start_idx = 0
        for i, line in enumerate(lines[:8]):
            l = line.strip().lower()
            if not l:
                start_idx = i + 1
                continue
            
            # Skip author name
            if l == author.lower() or author.lower() in l:
                start_idx = i + 1
                continue
                
            # Skip stray dots
            if l == '·' or l == '.':
                start_idx = i + 1
                continue
                
            # Skip metadata/timestamp lines
            if re.search(r'(\d+\s*[hm]\b|\d+\s*(giờ|phút|ngày|tháng|năm)|vừa xong|just now|hôm qua|yesterday|·)', l) or \
               l in ["admin", "người kiểm duyệt", "moderator", "công khai", "public", "được tài trợ", "sponsored"]:
                start_idx = i + 1
                continue
                
            # If we reach here, this line doesn't match header patterns, so it's likely the start of the post text
            break
            
        remaining = "\n".join(lines[start_idx:]).strip()
        
        # 3. Final validation
        if remaining:
            if re.match(r'^(xem|view).*?(bình luận|phản hồi|comment|repl)', remaining.lower()):
                return ""
            remaining = re.sub(r'(?i)([\n\s]*(ẩn bớt|see less|xem thêm|see more))+[\n\s]*$', '', remaining).strip()
            return remaining
            
        if re.match(r'^(xem|view).*?(bình luận|phản hồi|comment|repl)', text.lower()):
            return ""
        text = re.sub(r'(?i)([\n\s]*(ẩn bớt|see less|xem thêm|see more))+[\n\s]*$', '', text).strip()
        return text
    except Exception:
        pass

    return ""


def scrape_group_for_duration(
    page: Page,
    group_url: str,
    config: dict,
    seen_urls: Set[str],
    duration: int = 20,
) -> List[Dict]:
    """Scrape a single group for `duration` seconds.
    
    Returns list of new post dicts (already deduped against seen_urls).
    Also adds newly found URLs to seen_urls set in-place.
    """
    anonymous_name = config.get("anonymous_name", "Thành viên ẩn danh")
    new_posts = []

    # Navigate to group
    try:
        page.goto(group_url, wait_until="domcontentloaded", timeout=30000)
    except PlaywrightTimeoutError:
        logger.error(f"Timeout loading: {group_url}")
        return []
    except Exception as e:
        logger.error(f"Error loading {group_url}: {e}")
        return []

    page.wait_for_timeout(2000)
    _dismiss_login_popup(page)

    group_name = _extract_group_name(page)

    deadline = time.time() + duration
    processed_in_this_run = set()

    while time.time() < deadline:
        # Expand truncated captions
        _click_see_more(page)

        # Extract articles
        articles = page.locator('div[role="article"]').all()

        for article in articles:
            if time.time() >= deadline:
                break

            try:
                # Skip comment articles (no <h2>, or only comment URLs)
                if _is_comment_article(article):
                    continue

                # Get post URL — primary dedup key
                post_url = _extract_post_url(article)
                if not post_url:
                    continue

                # Skip if already seen
                if post_url in seen_urls or post_url in processed_in_this_run:
                    continue

                processed_in_this_run.add(post_url)

                # Extract data
                author = _extract_author(article, anonymous_name)
                caption = _extract_caption(article, author)

                # Skip posts with empty/minimal captions
                if not caption or len(caption.strip()) < 3:
                    continue

                post_data = {
                    "group_url": group_url,
                    "group_name": group_name,
                    "author": author,
                    "caption": caption,
                    "post_url": post_url,
                    "scraped_at": datetime.now().isoformat(timespec="seconds"),
                }

                new_posts.append(post_data)
                seen_urls.add(post_url)

            except Exception as e:
                logger.warning(f"Error extracting post: {e}")
                continue

        # Scroll down to load more posts
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1500)

    skipped = len(processed_in_this_run) - len(new_posts)
    logger.info(
        f"  ✓ {group_name}: {len(new_posts)} bài mới"
        + (f", {skipped} bỏ qua (trùng/trống)" if skipped > 0 else "")
    )

    return new_posts
