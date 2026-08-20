"""Bot manager — singleton that controls the scraper lifecycle.

The scraper runs on a dedicated background thread (Playwright greenlet requirement).
API endpoints only set flags and read state — never touch Playwright directly.
"""
import threading
import time
from typing import Optional

from src.logger import logger
from src.browser import open_browser, close_browser
from src.scraper import scrape_group_for_duration
from src.storage import append_posts
from src.database import (
    load_seen_urls_from_db, insert_posts_to_db,
    get_post_count, get_active_group_urls,
    cleanup_old_posts
)


class BotManager:
    def __init__(self):
        self.running = False
        self.should_quit = False
        self.pw = None
        self.browser = None
        self.page = None
        self.seen_urls: set = set()
        self.total_posts_session = 0
        self.round_count = 0
        self.current_group: Optional[str] = None
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Config
        self.scan_duration = 20
        self.headless = True
        self.anonymous_name = "Thành viên ẩn danh"

    # ── State ──────────────────────────────────

    def get_status(self) -> dict:
        with self._lock:
            return {
                "running": self.running,
                "round_count": self.round_count,
                "session_posts": self.total_posts_session,
                "total_db_posts": get_post_count(),
                "current_group": self.current_group,
                "seen_urls_count": len(self.seen_urls),
            }

    # ── Control ────────────────────────────────

    def start(self) -> dict:
        with self._lock:
            if self.running:
                return {"status": "already_running", "message": "Bot đang chạy rồi"}

        # Load dedup set
        self.seen_urls = load_seen_urls_from_db()

        # Start scraper thread
        self.should_quit = False
        self.running = True
        self._thread = threading.Thread(target=self._scrape_loop, daemon=True)
        self._thread.start()

        return {"status": "started", "message": "Bot đã bắt đầu quét"}

    def stop(self) -> dict:
        with self._lock:
            if not self.running:
                return {"status": "not_running", "message": "Bot chưa chạy"}
            self.running = False

        # Wait for thread to finish current cycle
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=30)

        return {"status": "stopped", "message": "Bot đã dừng"}

    def quit(self) -> dict:
        with self._lock:
            self.should_quit = True
            self.running = False

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=30)

        return {"status": "quit", "message": "Bot đã tắt hoàn toàn"}

    # ── Scrape loop (runs on dedicated thread) ──

    def _scrape_loop(self):
        """Main scraping loop. Creates and owns the Playwright instance."""
        # Create browser ON THIS THREAD (greenlet requirement)
        try:
            self.pw, self.browser, self.page = open_browser(self.headless)
        except Exception as e:
            logger.error(f"Failed to open browser: {e}")
            self.running = False
            return

        try:
            while not self.should_quit:
                with self._lock:
                    if not self.running:
                        break

                # Cleanup posts older than 5 days at the start of each round
                cleanup_old_posts(5)

                groups = get_active_group_urls()
                if not groups:
                    logger.info("Không có nhóm active nào. Chờ...")
                    time.sleep(5)
                    continue

                self.round_count += 1
                round_new = 0

                for i, group_url in enumerate(groups):
                    with self._lock:
                        if not self.running or self.should_quit:
                            break
                        self.current_group = group_url

                    logger.info(f"→ Nhóm {i + 1}/{len(groups)}: {group_url}")

                    config = {
                        "anonymous_name": self.anonymous_name,
                        "scan_duration_per_group": self.scan_duration,
                    }

                    try:
                        new_posts = scrape_group_for_duration(
                            self.page, group_url, config,
                            self.seen_urls, self.scan_duration,
                        )

                        if new_posts:
                            append_posts(new_posts)
                            insert_posts_to_db(new_posts)
                            self.total_posts_session += len(new_posts)
                            round_new += len(new_posts)

                    except Exception as e:
                        logger.error(f"Error scraping {group_url}: {e}")
                        # Try to recover browser
                        try:
                            close_browser(self.pw, self.browser)
                            self.pw, self.browser, self.page = open_browser(self.headless)
                        except Exception:
                            self.running = False
                            return

                with self._lock:
                    self.current_group = None
                    if self.running:
                        logger.info(
                            f"── Vòng {self.round_count}: "
                            f"+{round_new} bài mới. Tổng phiên: {self.total_posts_session} ──"
                        )

        finally:
            # Always cleanup browser
            try:
                close_browser(self.pw, self.browser)
            except Exception:
                pass
            self.pw = None
            self.browser = None
            self.page = None
            self.current_group = None
            logger.info("Scraper loop ended, browser closed")


# Singleton instance
bot_manager = BotManager()
