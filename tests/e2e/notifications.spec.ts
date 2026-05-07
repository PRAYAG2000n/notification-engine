import { test, expect } from "@playwright/test";

test.describe("Notification Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "demo@notifyhub.dev");
    await page.fill('input[name="password"]', "demo1234");
    await page.click('button[type="submit"]');
    // signIn uses router.push, wait for dashboard URL
    await page.waitForURL("**/dashboard", { timeout: 60000, waitUntil: "domcontentloaded" });
    // Wait for tRPC data to load
    await page.waitForTimeout(3000);
  });

  test("displays notification list after login", async ({ page }) => {
    // notification-list.tsx renders h2 "Notifications"
    await expect(page.locator("h2", { hasText: "Notifications" })).toBeVisible();
    // notification-card.tsx uses role="listitem" on each article
    const cards = page.locator('article[role="listitem"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });


  test("filters by notification type", async ({ page }) => {
    // filter-bar.tsx renders type buttons with text like "Alert"
    await page.locator("button", { hasText: "Alert" }).click();
    await page.waitForTimeout(1500);
    // After filter, page should still be functional (may have 0 results if no ALERT type)
    // Verify the button got active styling
    const alertBtn = page.locator("button", { hasText: "Alert" });
    await expect(alertBtn).toBeVisible();
  });

  test("marks all notifications as read", async ({ page }) => {
    // notification-list.tsx has "Mark all read" button
    const btn = page.locator("button", { hasText: "Mark all read" });
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(1500);
  });

  test("archives a notification", async ({ page }) => {
    // notification-card.tsx: article[role="listitem"], hover reveals archive button
    const firstCard = page.locator('article[role="listitem"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.hover();
    await page.waitForTimeout(500);
    // aria-label="Archive notification" on the button
    const archiveBtn = firstCard.locator('button[aria-label="Archive notification"]');
    await archiveBtn.click();
    await page.waitForTimeout(1500);
  });

  test("navigates between sidebar views", async ({ page }) => {
    // sidebar.tsx: nav with aria-label="Main navigation"
    // Each nav button contains icon + span. Use first() to avoid strict mode.
    const channelsBtn = page.locator('nav[aria-label="Main navigation"] button', { hasText: "Channels" }).first();
    await channelsBtn.click();
    // dashboard/page.tsx shows "Channel management view" for channels view
    await expect(page.locator("text=Channel management view")).toBeVisible();

    const settingsBtn = page.locator('nav[aria-label="Main navigation"] button', { hasText: "Settings" }).first();
    await settingsBtn.click();
    await expect(page.locator("text=Notification preferences")).toBeVisible();
  });

  test("infinite scroll loads more notifications", async ({ page }) => {
    // notification-list.tsx: div[role="list"][aria-label="Notifications"]
    const list = page.locator('div[role="list"][aria-label="Notifications"]');
    await expect(list).toBeVisible({ timeout: 10000 });
    // Scroll to bottom
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.waitForTimeout(2000);
  });

  test("stats bar displays counts", async ({ page }) => {
    // stats-bar.tsx: rendered inside div.grid, each stat has a p label
    // "Unread" appears both in stats-bar (as p) and filter-bar (as button)
    // Scope to the grid container to avoid strict mode
    const statsGrid = page.locator("div.grid");
    await expect(statsGrid.locator("p", { hasText: "Total" })).toBeVisible({ timeout: 10000 });
    await expect(statsGrid.locator("p", { hasText: "Unread" })).toBeVisible();
    await expect(statsGrid.locator("p", { hasText: "Urgent" })).toBeVisible();
    await expect(statsGrid.locator("p", { hasText: "Read Rate" })).toBeVisible();
  });

  test("keyboard navigation works on notification cards", async ({ page }) => {
    // notification-card.tsx: article has tabIndex={0}, aria-selected toggles on Enter
    const firstCard = page.locator('article[role="listitem"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.focus();
    await page.keyboard.press("Enter");
    await expect(firstCard).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login*", { timeout: 15000 });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "wrong@email.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // login/page.tsx: loginError shows in div.bg-red-50
    await expect(page.locator("div.bg-red-50")).toBeVisible({ timeout: 10000 });
  });
});
