import threading
import sys

from src.logger import logger
from src.storage import load_config, load_seen_urls, append_posts
from src.browser import open_browser, close_browser
from src.scraper import scrape_group_for_duration
from src.database import init_db, load_seen_urls_from_db, insert_posts_to_db, get_post_count


BANNER = """
═══════════════════════════════════════════════
  📋 Facebook Group Post Scraper Bot
═══════════════════════════════════════════════"""


class ScraperBot:
    def __init__(self):
        self.config = {}
        self.running = False
        self.should_quit = False
        self.pw = None
        self.browser = None
        self.page = None
        self.seen_urls = set()
        self.total_posts = 0
        self.round_count = 0
        self._lock = threading.Lock()

    def _start_browser(self):
        """Open browser if not already open."""
        if self.page is not None:
            return True
        try:
            headless = self.config.get("headless", True)
            self.pw, self.browser, self.page = open_browser(headless)
            return True
        except Exception as e:
            logger.error(f"Failed to open browser: {e}")
            return False

    def _stop_browser(self):
        """Close browser if open."""
        if self.pw and self.browser:
            close_browser(self.pw, self.browser)
        self.pw = None
        self.browser = None
        self.page = None

    def _input_listener(self):
        """Runs on a separate thread — listens for user commands.
        
        Only sets flags; never touches Playwright objects directly.
        """
        while not self.should_quit:
            try:
                cmd = input().strip().lower()
            except (EOFError, KeyboardInterrupt):
                with self._lock:
                    self.should_quit = True
                    self.running = False
                break

            with self._lock:
                if cmd == "start":
                    if self.running:
                        print("  ⚠ Bot đang chạy rồi.")
                    else:
                        self.running = True
                        print("  ▶ Bắt đầu quét...")
                elif cmd == "stop":
                    if not self.running:
                        print("  ⚠ Bot chưa chạy.")
                    else:
                        self.running = False
                        print("  ⏸ Đã dừng. Gõ 'start' để tiếp tục.")
                elif cmd == "status":
                    state = "ĐANG CHẠY ▶" if self.running else "ĐÃ DỪNG ⏸"
                    print(f"  Trạng thái : {state}")
                    print(f"  Số vòng    : {self.round_count}")
                    print(f"  Bài mới    : {self.total_posts} (phiên này)")
                    print(f"  Tổng DB    : {get_post_count()} bài")
                    print(f"  Nhóm       : {len(self.config.get('groups', []))} nhóm")
                elif cmd in ("quit", "exit"):
                    self.should_quit = True
                    self.running = False
                    print("  👋 Đang đóng browser...")
                    break
                elif cmd == "":
                    continue
                else:
                    print(f"  ✗ Lệnh không hợp lệ: '{cmd}'")
                    print("  Commands: [start] [stop] [status] [quit]")

    def _scrape_loop(self):
        """Main scraping loop — runs on the MAIN thread (where Playwright lives).
        
        Checks self.running flag each iteration. When not running, sleeps briefly.
        """
        groups = self.config.get("groups", [])
        duration = self.config.get("scan_duration_per_group", 20)

        if not groups:
            logger.error("Không có nhóm nào trong config!")
            return

        while not self.should_quit:
            # If not running, sleep and check again
            with self._lock:
                is_running = self.running

            if not is_running:
                import time
                time.sleep(0.5)
                continue

            self.round_count += 1
            round_new = 0

            for i, group_url in enumerate(groups):
                # Check flags before each group
                with self._lock:
                    if not self.running or self.should_quit:
                        break

                logger.info(f"→ Nhóm {i + 1}/{len(groups)}: {group_url}")

                try:
                    new_posts = scrape_group_for_duration(
                        self.page, group_url, self.config,
                        self.seen_urls, duration
                    )

                    if new_posts:
                        # Save to JSON (for inspection)
                        append_posts(new_posts)
                        # Save to PostgreSQL (primary storage)
                        db_saved = insert_posts_to_db(new_posts)
                        self.total_posts += len(new_posts)
                        round_new += len(new_posts)

                except Exception as e:
                    logger.error(f"Error scraping {group_url}: {e}")
                    # If browser crashed, try to recover
                    try:
                        self._stop_browser()
                        if not self._start_browser():
                            logger.error("Cannot recover browser. Stopping.")
                            with self._lock:
                                self.running = False
                            return
                    except Exception:
                        with self._lock:
                            self.running = False
                        return

            with self._lock:
                still_running = self.running

            if still_running:
                logger.info(
                    f"── Vòng {self.round_count} hoàn tất: "
                    f"+{round_new} bài mới. Tổng: {self.total_posts} ──"
                )

    def run(self):
        """Main entry point.
        
        Architecture:
        - Main thread: opens browser + runs scrape loop (Playwright requires this)
        - Daemon thread: listens for terminal input (start/stop/quit)
        """
        self.config = load_config()
        if not self.config:
            print("  ✗ Không tìm thấy config.json")
            return

        # Initialize PostgreSQL
        if not init_db():
            print("  ⚠ Không kết nối được PostgreSQL, chỉ lưu JSON")
        
        groups = self.config.get("groups", [])
        
        # Load seen URLs from both JSON and DB for dedup
        self.seen_urls = load_seen_urls() | load_seen_urls_from_db()
        db_count = get_post_count()

        print(BANNER)
        print(f"  Đã load {len(groups)} nhóm từ config.json")
        print(f"  PostgreSQL: {db_count} bài trong DB")
        if self.seen_urls:
            print(f"  Dedup: {len(self.seen_urls)} bài đã biết (sẽ bỏ qua trùng)")
        print("───────────────────────────────────────────────")
        print("  Commands: [start] [stop] [status] [quit]")
        print("───────────────────────────────────────────────")

        # Open browser on main thread (Playwright requirement)
        if not self._start_browser():
            print("  ✗ Không mở được browser. Thoát.")
            return

        # Start input listener on daemon thread
        input_thread = threading.Thread(target=self._input_listener, daemon=True)
        input_thread.start()

        # Run scrape loop on main thread
        try:
            self._scrape_loop()
        except KeyboardInterrupt:
            pass
        finally:
            self._stop_browser()
            print("  👋 Đã đóng browser. Tạm biệt!")


if __name__ == "__main__":
    bot = ScraperBot()
    bot.run()
