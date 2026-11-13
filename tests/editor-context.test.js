import test from "node:test";
import assert from "node:assert/strict";
import { editorTarget, draftWarning } from "../src/editor-context.js";

test("owner editor targets the existing site without leaking query strings or fragments", () => {
  assert.equal(
    editorTarget("https://alex.space.fast/?edit=1&token=private#preview"),
    "https://alex.space.fast/",
  );
  assert.equal(
    editorTarget("https://example.com/bio/?edit=1"),
    "https://example.com/bio/",
  );
});
test("copying a template and local development create new pages instead", () => {
  for (const href of [
    "https://alex.space.fast/?edit=1&new=1",
    "http://localhost:4173/?edit=1",
    "http://127.0.0.1:4173/",
    "http://[::1]:4173/",
    "not a URL",
    "javascript:alert(1)",
    "https://user:password@example.com/",
  ])
    assert.equal(editorTarget(href), "");
});
test("stale and untrusted draft baselines are disclosed without replacing content", () => {
  const profile = { name: "Alex", headline: "New" };
  assert.equal(draftWarning(profile, structuredClone(profile)), "");
  assert.match(
    draftWarning(profile, { ...profile, headline: "Old" }),
    /published profile changed/,
  );
  assert.match(draftWarning(profile, null), /no reliable original version/);
});
