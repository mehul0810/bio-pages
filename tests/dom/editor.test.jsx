import { TEMPLATES } from "../../src/profile.js";
import React from "react";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.jsx";

const sample = JSON.parse(
  readFileSync(`${process.cwd()}/public/profile.json`, "utf8"),
);
const key = "bio-pages:draft:v2:/";
const blobText = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
const saved = () => {
  const record = JSON.parse(localStorage.getItem(key));
  return record.draft || record;
};
const preview = () =>
  screen.getByRole("article", { name: "Live profile preview" });
const openSection = (title) =>
  fireEvent.click(screen.getByText(title, { selector: "summary span" }));
async function load(edit = false, expectedName = sample.name) {
  window.history.replaceState({}, "", edit ? "/?edit=1" : "/");
  render(<App />);
  await screen.findByRole("heading", { name: expectedName });
  return userEvent.setup();
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(sample),
    }),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom does not implement element scrolling, file.text(), or downloading.
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  if (!Blob.prototype.text)
    Object.defineProperty(Blob.prototype, "text", {
      configurable: true,
      value: function () {
        return blobText(this);
      },
    });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BioPage DOM interactions (not browser layout tests)", () => {
  it("renders the configured identity, safe external links and support visibility", async () => {
    await load();
    expect(document.title).toBe(`${sample.name} · BioPage`);
    if (sample.support.enabled) {
      expect(
        screen.getByRole("button", { name: sample.support.button_label })
          .disabled,
      ).toBe(true);
    } else {
      expect(
        screen.queryByRole("region", { name: "Support this creator" }),
      ).toBeNull();
    }
    const shop = screen.getByRole("link", {
      name: new RegExp(sample.links[0].items[0].title),
    });
    expect(shop.href).toBe(sample.links[0].items[0].url);
    expect(shop.rel).toBe("noopener noreferrer");
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("reports fetch failure and retries without replacing the app with a blank page", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain("503");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: sample.name });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("opens via buttons and query parameters and follows popstate", async () => {
    const user = await load();
    await user.click(screen.getByRole("button", { name: "Make this yours" }));
    expect(window.location.search).toBe("?edit=1&new=1");
    expect(screen.getByLabelText("Name").value).toBe(sample.name);
    act(() => {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByLabelText("Name")).toBeNull();
    act(() => {
      window.history.replaceState({}, "", "/?edit=1");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByLabelText("Name").value).toBe(sample.name);
  });

  it("persists a valid name immediately while keeping the published page unchanged", async () => {
    const user = await load(true);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Alex Maker");
    expect(saved().name).toBe("Alex Maker");
    expect(
      within(preview()).getByRole("heading", { name: "Alex Maker" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Published page" }));
    expect(screen.getByRole("heading", { name: sample.name })).toBeTruthy();
    expect(saved().name).toBe("Alex Maker");
    await user.click(screen.getByRole("button", { name: "Edit this page" }));
    expect(screen.getByLabelText("Name").value).toBe("Alex Maker");
  });

  it("changes templates and palettes without losing content", async () => {
    const user = await load(true);
    await user.click(
      screen.getByRole("button", { name: "Design", exact: true }),
    );
    for (const template of TEMPLATES.map((t) => t.name)) {
      await user.click(
        screen.getByRole("button", { name: new RegExp(`^${template}`) }),
      );
      expect(
        preview().classList.contains(`template-${template.toLowerCase()}`),
      ).toBe(true);
      expect(saved().description).toBe(sample.description);
    }
    await user.click(screen.getByRole("button", { name: "Rose", exact: true }));
    expect(preview().classList.contains("palette-rose")).toBe(true);
    expect(saved().links).toEqual(sample.links);
  });

  it("configures support safely and can hide its card", async () => {
    const user = await load(true);
    openSection("Support your work");
    if (!sample.support.enabled)
      await user.click(screen.getByLabelText("Show support card"));
    await user.type(
      screen.getByLabelText("Support page URL"),
      "https://example.com/support",
    );
    expect(
      within(preview()).getByRole("link", {
        name: new RegExp(sample.support.button_label),
      }).href,
    ).toBe("https://example.com/support");
    await user.clear(screen.getByLabelText("Support page URL"));
    await user.type(
      screen.getByLabelText("Support page URL"),
      "javascript:alert(1)",
    );
    expect(
      within(preview()).queryByRole("link", {
        name: new RegExp(sample.support.button_label),
      }),
    ).toBeNull();
    expect(saved().support.url).not.toBe("javascript:alert(1)");
    await user.click(screen.getByLabelText("Show support card"));
    expect(
      within(preview()).queryByRole("region", { name: "Support this creator" }),
    ).toBeNull();
  });

  it("adds, reorders and removes links through labeled controls", async () => {
    const user = await load(true);
    openSection("Links & projects");
    const before = sample.links[0].items.length;
    await user.click(
      screen.getByRole("button", { name: "Add link", exact: true }),
    );
    const titles = screen.getAllByLabelText("Link title");
    expect(titles).toHaveLength(before + 1);
    await user.clear(titles[before]);
    await user.type(titles[before], "New portfolio");
    await user.click(
      screen.getByRole("button", { name: `Move up link ${before + 1}` }),
    );
    expect(saved().links[0].items[before - 1].title).toBe("New portfolio");
    await user.click(
      screen.getByRole("button", { name: `Remove link ${before}` }),
    );
    expect(saved().links[0].items).toEqual(sample.links[0].items);
  });

  it("rejects malicious imports without replacing current draft", async () => {
    const user = await load(true);
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    const bad = new File(
      [
        JSON.stringify({
          name: "Bad import",
          support: { url: "javascript:alert(1)" },
        }),
      ],
      "bad.json",
      { type: "application/json" },
    );
    await user.upload(screen.getByLabelText("Import profile JSON"), bad);
    await screen.findByText("Import failed. Your draft has not changed.");
    expect(screen.getByRole("alert").textContent).toContain("support.url");
    expect(saved().name).toBe(sample.name);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("imports a valid profile only after confirmation", async () => {
    const user = await load(true);
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    const input = screen.getByLabelText("Import profile JSON");
    const file = () =>
      new File(
        [JSON.stringify({ ...sample, name: "Imported Creator" })],
        "profile.json",
        { type: "application/json" },
      );
    window.confirm.mockReturnValueOnce(false);
    await user.upload(input, file());
    await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(saved().name).toBe(sample.name);
    await user.upload(input, file());
    await screen.findByRole("heading", { name: "Imported Creator" });
    expect(saved().name).toBe("Imported Creator");
  });

  it("exports the actual draft JSON and blocks invalid fields", async () => {
    const user = await load(true);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Download profile.json" }),
    );
    expect(click).toHaveBeenCalledOnce();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/json");
    expect(JSON.parse(await blobText(blob))).toEqual(saved());
    await user.click(
      screen.getByRole("button", { name: "Content", exact: true }),
    );
    await user.clear(screen.getByLabelText("Name"));
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Download profile.json" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("name is required");
    expect(click).toHaveBeenCalledOnce();
  });

  it("restores valid local drafts and safely ignores corrupt saved JSON", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ ...sample, name: "Saved Creator" }),
    );
    window.history.replaceState({}, "", "/?edit=1");
    render(<App />);
    await screen.findByRole("heading", { name: "Saved Creator" });
    expect(screen.getByLabelText("Name").value).toBe("Saved Creator");
    cleanup();
    localStorage.setItem(key, "{broken json");
    await load(true);
    expect(screen.getByLabelText("Name").value).toBe(sample.name);
    expect(
      within(preview()).getByRole("heading", { name: sample.name }),
    ).toBeTruthy();
  });

  it("reset respects cancellation and restores published content after confirmation", async () => {
    const user = await load(true);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Changed");
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    window.confirm.mockReturnValueOnce(false);
    await user.click(
      screen.getByRole("button", { name: "Reset draft to published profile" }),
    );
    expect(saved().name).toBe("Changed");
    await user.click(
      screen.getByRole("button", { name: "Reset draft to published profile" }),
    );
    expect(saved().name).toBe(sample.name);
    expect(
      within(preview()).getByRole("heading", { name: sample.name }),
    ).toBeTruthy();
  });
  it("prepares an end-to-end AI launch without presenting a ZIP workflow", async () => {
    const user = await load(true);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Alex Rivera");
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    await user.type(
      screen.getByLabelText(/^What should AI do\?/),
      "Use Editorial in Sage",
    );
    await user.click(
      screen.getByLabelText("Make the new page publicly accessible"),
    );
    const prompt = screen.getByLabelText("AI launch prompt").value;
    expect(prompt).toContain("Alex Rivera");
    expect(prompt).toContain("Create and publish");
    expect(prompt).toContain("publicly accessible");
    expect(prompt).toContain("Use Editorial in Sage");
    expect(
      screen.queryByRole("button", { name: "Download website ZIP" }),
    ).toBeNull();
    expect(
      screen.getByText("Advanced: JSON backup and import").closest("details")
        .open,
    ).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Copy launch prompt" }),
    );
    expect(await navigator.clipboard.readText()).toBe(prompt);
    expect(screen.getByRole("status").textContent).toContain(
      "Launch prompt copied",
    );
  });

  it("targets the same existing Space and rejects unsafe target URLs", async () => {
    const user = await load(true);
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    await user.type(
      screen.getByLabelText(/^Existing Space URL/),
      "https://alex.space.fast",
    );
    expect(screen.getByLabelText("AI launch prompt").value).toContain(
      "Keep its URL and access settings",
    );
    await user.clear(screen.getByLabelText(/^Existing Space URL/));
    await user.type(
      screen.getByLabelText(/^Existing Space URL/),
      "javascript:alert(1)",
    );
    await user.click(
      screen.getByRole("button", { name: "Copy launch prompt" }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "complete HTTP or HTTPS URL",
    );
  });

  it("keeps the original baseline after reload when remote content changed", async () => {
    let user = await load(true);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Local name");
    const first = JSON.parse(localStorage.getItem(key));
    expect(first.baseProfile.headline).toBe(sample.headline);
    cleanup();
    fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ ...sample, headline: "New remote headline" }),
    });
    user = await load(true, "Local name");
    expect(screen.getByRole("note").textContent).toContain(
      "published profile changed",
    );
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    await user.type(
      screen.getByLabelText(/^Existing Space URL/),
      "https://alex.space.fast",
    );
    const prompt = screen.getByLabelText("AI launch prompt").value;
    expect(prompt).toContain('"path": "/name"');
    expect(prompt).not.toContain('"path": "/headline"');
    expect(JSON.parse(localStorage.getItem(key)).baseProfile.headline).toBe(
      sample.headline,
    );
  });

  it("does not invent a baseline for legacy saved drafts", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ ...sample, name: "Legacy draft" }),
    );
    const user = await load(true, "Legacy draft");
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    await user.type(
      screen.getByLabelText(/^Existing Space URL/),
      "https://alex.space.fast",
    );
    expect(screen.getByLabelText("AI launch prompt").value).toContain(
      "No loaded baseline is available",
    );
    expect(JSON.parse(localStorage.getItem(key)).baseProfile).toBeNull();
  });

  it("never rebases a valid saved draft onto today's profile after baseline corruption", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: 1,
        draft: { ...sample, name: "Recovered draft" },
        baseProfile: { name: "" },
      }),
    );
    const user = await load(true, "Recovered draft");
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    await user.type(
      screen.getByLabelText(/^Existing Space URL/),
      "https://alex.space.fast",
    );
    expect(screen.getByLabelText("AI launch prompt").value).toContain(
      "No loaded baseline is available",
    );
    expect(JSON.parse(localStorage.getItem(key)).baseProfile).toBeNull();
  });

  it("warns before leaving incomplete edits but not a saved valid draft", async () => {
    const user = await load(true);
    let event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await user.clear(screen.getByLabelText("Name"));
    event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await user.type(screen.getByLabelText("Name"), "Saved name");
    event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("keeps public product branding in the footer, not the creator header", async () => {
    await load();
    expect(document.querySelector(".site-header .brand")).toBeNull();
    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", {
        name: "BioPage",
      }),
    ).toBeTruthy();
  });

  it("selects the prompt for manual copying when the clipboard is unavailable", async () => {
    const user = await load(true);
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    const write = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValue(new Error("blocked"));
    await user.click(
      screen.getByRole("button", { name: "Copy launch prompt" }),
    );
    const prompt = screen.getByLabelText("AI launch prompt");
    expect(document.activeElement).toBe(prompt);
    expect(prompt.selectionStart).toBe(0);
    expect(prompt.selectionEnd).toBe(prompt.value.length);
    expect(screen.getByRole("status").textContent).toContain(
      "Copy is unavailable",
    );
    write.mockRestore();
  });

  it("passes structural WCAG checks only (jsdom cannot verify visual contrast or layout)", async () => {
    const user = await load();
    const options = {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      rules: { "color-contrast": { enabled: false } },
    };
    const audit = async (label) => {
      const result = await axe.run(document.body, options);
      expect(
        result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
        label,
      ).toEqual([]);
    };
    await audit("published profile");
    await user.click(screen.getByRole("button", { name: "Make this yours" }));
    await audit("content editor");
    await user.click(
      screen.getByRole("button", { name: "Design", exact: true }),
    );
    await audit("design editor");
    await user.click(
      screen.getByRole("button", { name: "Publish", exact: true }),
    );
    fireEvent.click(
      screen.getByText("Advanced: JSON backup and import", {
        selector: "summary",
      }),
    );
    await audit("publish editor");
  }, 15000);
});
