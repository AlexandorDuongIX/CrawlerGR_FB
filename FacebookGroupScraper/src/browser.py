from playwright.sync_api import sync_playwright
from src.logger import logger


def open_browser(headless=True):
    """Launch Playwright Chromium and return (playwright, browser, page).
    
    Browser stays open for the entire session — we navigate between groups
    using page.goto() instead of opening/closing repeatedly.
    """
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=headless)
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    )
    page = context.new_page()
    logger.info("Browser opened")
    return pw, browser, page


def close_browser(pw, browser):
    """Gracefully shut down browser and Playwright."""
    try:
        browser.close()
    except Exception:
        pass
    try:
        pw.stop()
    except Exception:
        pass
    logger.info("Browser closed")
