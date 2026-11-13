import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../../src/App.jsx";
import { TEMPLATES } from "../../src/profile.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});
for (const { id: template } of TEMPLATES) {
  it(`${template} supports a minimal profile`, async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            name: "Minimal creator",
            appearance: { template },
          }),
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Minimal creator" });
    const profile = screen.getByRole("article");
    expect(within(profile).queryAllByRole("link")).toHaveLength(0);
    expect(within(profile).queryAllByRole("img")).toHaveLength(0);
    expect(profile.classList.contains(`template-${template}`)).toBe(true);
  });
}
it("optional project images persist in local drafts and reject unsafe URLs", async () => {
  window.history.replaceState({}, "", "/?edit=1");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          name: "Creator",
          links: [{ items: [{ title: "Work", url: "https://example.com" }] }],
        }),
    }),
  );
  render(<App />);
  await screen.findByRole("heading", { name: "Creator", exact: true });
  fireEvent.click(
    screen.getByText("Links & projects", { selector: "summary span" }),
  );
  fireEvent.change(screen.getByLabelText(/^Project image URL/), {
    target: { value: "images/work.png" },
  });
  fireEvent.change(screen.getByLabelText(/^Project image description/), {
    target: { value: "The finished project" },
  });
  const stored = JSON.parse(localStorage.getItem("bio-pages:draft:v2:/"));
  expect(stored.draft.links[0].items[0].image_url).toBe("images/work.png");
  expect(stored.draft.links[0].items[0].image_alt).toBe("The finished project");
  fireEvent.change(screen.getByLabelText(/^Project image URL/), {
    target: { value: "javascript:alert(1)" },
  });
  expect(
    JSON.parse(localStorage.getItem("bio-pages:draft:v2:/")).draft.links[0]
      .items[0].image_url,
  ).toBe("images/work.png");
  fireEvent.click(screen.getByRole("button", { name: "Publish", exact: true }));
  fireEvent.click(screen.getByText("Advanced: JSON backup and import"));
  fireEvent.click(
    screen.getByRole("button", { name: "Download profile.json" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("image_url");
});
