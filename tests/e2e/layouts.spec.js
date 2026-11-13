import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { TEMPLATES, PALETTES } from "../../src/profile.js";
const sample = JSON.parse(
  await readFile(new URL("../../public/profile.json", import.meta.url), "utf8"),
);
const newTemplates = TEMPLATES.filter(
  (t) => !["studio", "editorial", "spotlight"].includes(t.id),
);

for (const { id: template } of newTemplates) {
  for (const { id: palette } of PALETTES) {
    test(`${template}/${palette}: responsive content, keyboard, and automated accessibility`, async ({
      page,
    }) => {
      const profile = structuredClone(sample);
      profile.appearance = { template, palette };
      profile.support.enabled = true;
      profile.support.url = "https://example.com/support";
      // Include multiple groups so featuring a first item cannot hide another group.
      profile.links.unshift({ category: "Empty category", items: [] });
      profile.links.push({
        category: "Reading list",
        items: [
          {
            title: "A reading recommendation",
            description: "A second category remains available.",
            url: "https://example.com/reading",
          },
        ],
      });
      await page.route("**/profile.json", (route) =>
        route.fulfill({ json: profile }),
      );
      await page.goto("/");
      const article = page.getByRole("article");
      await expect(
        article.getByRole("heading", { name: sample.name, exact: true }),
      ).toBeVisible();
      for (const group of profile.links)
        for (const item of group.items) {
          await expect(
            article.getByRole("link", { name: new RegExp(item.title) }),
          ).toHaveCount(1);
          await expect(
            article.getByRole("link", { name: new RegExp(item.title) }),
          ).toHaveAttribute("href", item.url);
        }
      await expect(
        article.getByRole("link", { name: "Get in touch" }),
      ).toHaveCount(1);
      await expect(
        article.getByRole("link", { name: profile.support.button_label }),
      ).toHaveAttribute("href", profile.support.url);
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBeLessThanOrEqual(width);
        const overflow = await article.evaluate(
          (el) => el.scrollWidth > el.clientWidth + 1,
        );
        expect(overflow).toBe(false);
      }
      await article.locator("a").first().focus();
      await expect(article.locator("a").first()).toBeFocused();
      await expect(article.locator("a").first()).toHaveCSS(
        "outline-width",
        "3px",
      );
      const undersized = await article
        .locator("a")
        .evaluateAll((links) =>
          links
            .filter((a) => a.getBoundingClientRect().height < 44)
            .map((a) => a.textContent),
        );
      expect(undersized).toEqual([]);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    });
  }
  test(`${template}: minimal and very long profiles reflow without invented destinations`, async ({
    page,
  }) => {
    let profile = {
      version: "2.0.0",
      name: "Only a name",
      appearance: { template },
    };
    await page.route("**/profile.json", (route) =>
      route.fulfill({ json: profile }),
    );
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/");
    const article = page.getByRole("article");
    await expect(
      article.getByRole("heading", { name: profile.name }),
    ).toBeVisible();
    await expect(article.locator("a")).toHaveCount(0);
    profile = {
      ...sample,
      name: "LongName".repeat(40),
      headline: "Headline".repeat(50),
      description: "Long description. ".repeat(300),
      appearance: { template },
      links: [
        {
          category: "A category ".repeat(15),
          items: [
            {
              title: "VeryLongLink".repeat(30),
              description: "Description".repeat(100),
              url: "https://example.com/long",
            },
          ],
        },
      ],
    };
    await page.reload();
    await expect(
      article.getByRole("heading", { name: profile.name, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(320);
    // 200% text-only enlargement, not a claim of complete zoom conformance.
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(320);
  });
}

test("visual project images retain alt text and broken images get decorative fallback", async ({
  page,
}) => {
  const profile = structuredClone(sample);
  profile.appearance.template = "gallery";
  profile.links[0].items[0].image_url = profile.photo_url;
  profile.links[0].items[0].image_alt = "A real project illustration";
  profile.links[0].items[1].image_url = "missing-project.png";
  await page.route("**/profile.json", (route) =>
    route.fulfill({ json: profile }),
  );
  await page.goto("/");
  const image = page.getByRole("img", { name: "A real project illustration" });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0))
    .toBe(true);
  await page.locator(".layout-visual").nth(1).scrollIntoViewIfNeeded();
  await expect(
    page.locator(".layout-visual").nth(1).locator(".layout-art"),
  ).toBeVisible();
  await expect(
    page.locator(".layout-visual").nth(1).locator("img"),
  ).toHaveCount(0);
});
