import { TEMPLATES } from "../../src/profile.js";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const sample = JSON.parse(
  await readFile(new URL("../../public/profile.json", import.meta.url), "utf8"),
);

async function openEditor(page) {
  await page.goto("/?edit=1");
  await expect(
    page.getByRole("heading", { name: "Make it yours." }),
  ).toBeVisible();
}

test("public profile renders configured identity and no broken image assets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
  if (sample.support.enabled) {
    await expect(
      page.getByRole("button", { name: sample.support.button_label }),
    ).toBeDisabled();
  } else {
    await expect(
      page.getByRole("region", { name: "Support this creator" }),
    ).toHaveCount(0);
  }
  await expect(
    page.getByRole("link", {
      name: new RegExp(sample.links[0].items[0].title),
    }),
  ).toHaveAttribute("href", sample.links[0].items[0].url);
  await expect
    .poll(() =>
      page
        .locator(".avatar img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  expect(errors).toEqual([]);
  await expect(page).toHaveTitle(`${sample.name} · BioPage`);
});

test("draft edits survive reload but never replace the public profile; back and forward work", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Name", { exact: true }).fill("Alex Rivera");
  await expect(
    page.getByRole("heading", { name: "Alex Rivera", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Draft saved in this browser. Ask AI to publish."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Alex Rivera",
  );
  await page.getByRole("button", { name: "Published page" }).click();
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Alex Rivera",
  );
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
});

test("all 40 design variations preserve content and mobile preview", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Design", exact: true }).click();
  for (const template of TEMPLATES.map((t) => t.name)) {
    await page
      .getByRole("button", { name: new RegExp(`^${template}`) })
      .click();
    for (const palette of ["Honey", "Sage", "Rose", "Ink"]) {
      await page.getByRole("button", { name: palette, exact: true }).click();
      await expect(page.locator("article")).toHaveClass(
        new RegExp(
          `template-${template.toLowerCase()} palette-${palette.toLowerCase()}`,
        ),
      );
      await expect(
        page.getByRole("heading", { name: sample.name, exact: true }),
      ).toBeVisible();
    }
  }
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".preview-canvas")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeLessThanOrEqual(390);
});

test("JSON export includes content and design without publishing", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Name", { exact: true }).fill("Alex Rivera");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByText("Advanced: JSON backup and import", { exact: true })
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download profile.json" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("profile.json");
  const json = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(json.name).toBe("Alex Rivera");
  expect(json.version).toBe("2.0.0");
  await expect(page.getByRole("status")).toContainText(
    "Nothing has been published",
  );
});

test("imports safely, refuses invalid JSON and scripts, and supports reset cancellation", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByText("Advanced: JSON backup and import", { exact: true })
    .click();
  const upload = page.getByLabel("Import profile JSON");
  await upload.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("alert")).toContainText("Invalid JSON");
  const unsafe = {
    ...sample,
    support: { ...sample.support, url: "javascript:alert(1)" },
  };
  await upload.setInputFiles({
    name: "unsafe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(unsafe)),
  });
  await expect(page.getByRole("alert")).toContainText("support.url");
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  const profile = {
    ...sample,
    name: "Imported Person",
    description: "<img src=x onerror=alert(1)>",
  };
  await upload.setInputFiles({
    name: "profile.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile)),
  });
  await expect(
    page.getByRole("heading", { name: "Imported Person", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".about-copy")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator(".about-copy img")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Reset draft to published profile" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Imported Person", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reset draft to published profile" })
    .click();
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
});

test("content controls add, reorder and remove links and configure external support", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByText("Links & projects", { exact: true }).click();
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  const titles = page.getByLabel("Link title", { exact: true });
  await expect(titles).toHaveCount(4);
  await titles.nth(3).fill("Latest launch");
  await page
    .getByLabel("Link URL", { exact: true })
    .nth(3)
    .fill("https://example.com/launch");
  await page.getByRole("button", { name: "Move up link 4" }).click();
  await expect(titles.nth(2)).toHaveValue("Latest launch");
  await page
    .getByRole("button", { name: "Remove link 3", exact: true })
    .click();
  await expect(titles).toHaveCount(3);
  await page.getByText("Support your work", { exact: true }).click();
  await page.getByLabel("Show support card").check();
  await page
    .getByLabel("Support page URL", { exact: true })
    .fill("https://buymeacoffee.com/example");
  await expect(
    page.getByRole("link", { name: "Buy me a coffee", exact: true }),
  ).toHaveAttribute("href", "https://buymeacoffee.com/example");
  await page.getByLabel("Show support card").uncheck();
  await expect(
    page.getByRole("region", { name: "Support this creator" }),
  ).toHaveCount(0);
});

test("profile fetch failure is visible and retry recovers", async ({
  page,
}) => {
  await page.route("**/profile.json", (route) =>
    route.fulfill({ status: 404, body: "Missing" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("HTTP 404");
  await page.unroute("**/profile.json");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
});

test("storage failure and corrupt drafts do not break editing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      `bio-pages:draft:v2:${location.pathname}`,
      "{invalid",
    );
  });
  await openEditor(page);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    sample.name,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota exceeded");
    };
  });
  await page.getByLabel("Name", { exact: true }).fill("Still editable");
  await expect(
    page.getByText("Browser storage is unavailable. Export before leaving."),
  ).toBeVisible();
});

test("mobile profile and editor have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page.getByRole("button", { name: "Make this yours" }).click();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  for (const template of TEMPLATES.map((t) => t.name)) {
    await page
      .getByRole("button", { name: new RegExp(`^${template}`) })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(375);
  }
});

test("public profile and editor pass automated WCAG accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: sample.name, exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await openEditor(page);
  for (const tab of ["Content", "Design", "Publish"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
