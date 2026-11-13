import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TEMPLATES,
  PALETTES,
  MAX_PROFILE_BYTES,
  safeUrl,
  normalizeProfile,
  validateProfile,
  parseProfile,
} from "../src/profile.js";

test("ships ten templates and four palettes", () => {
  assert.deepEqual(
    TEMPLATES.map((t) => t.id),
    [
      "studio",
      "editorial",
      "spotlight",
      "orbit",
      "canvas",
      "gallery",
      "journal",
      "postcard",
      "launchpad",
      "directory",
    ],
  );
  assert.deepEqual(
    PALETTES.map((t) => t.id),
    ["honey", "sage", "rose", "ink"],
  );
});
test("configured profile is valid v2 without an invented payment destination", () => {
  const profile = parseProfile(
    readFileSync(new URL("../public/profile.json", import.meta.url), "utf8"),
  );
  assert.ok(profile.name.trim());
  assert.equal(profile.version, "2.0.0");
  assert.equal(profile.support.url, "");
  assert.deepEqual(validateProfile(profile), []);
  assert.deepEqual(normalizeProfile(profile), profile);
});
test("URL allowlist rejects scripts, data, credentials, network paths and controls", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "//evil.test/x",
    "\\evil.test",
    "https://user:pass@example.com",
    "https://example.com/\nx",
    "https://example.com/%0a",
    "%2f%2fevil.test",
    "%6aavascript:alert(1)",
    "https://",
    "ftp://example.com",
    "https://example.com/%7f",
  ]) {
    assert.equal(safeUrl(value), "", value);
    assert.equal(safeUrl(value, { image: true }), "", value);
  }
});
test("allows explicit HTTP(S), relative images, and opt-in mailto", () => {
  assert.equal(
    safeUrl(" https://example.com/a?q=1#two "),
    "https://example.com/a?q=1#two",
  );
  assert.equal(safeUrl("http://localhost:3000"), "http://localhost:3000");
  for (const path of [
    "/images/photo.jpg",
    "./photo.jpg",
    "../assets/photo.png",
    "assets/photo.jpg",
  ]) {
    assert.equal(safeUrl(path, { image: true }), path);
    assert.equal(safeUrl(path), "");
  }
  assert.equal(safeUrl("mailto:hello@example.com"), "");
  assert.equal(
    safeUrl("mailto:hello@example.com", { allowEmail: true }),
    "mailto:hello@example.com",
  );
  assert.equal(
    safeUrl("mailto:hello@example.com?subject=hello", { allowEmail: true }),
    "",
  );
});
test("migrates legacy HTML to text without DOM or script contents", () => {
  const p = parseProfile(
    JSON.stringify({
      version: "1.0.0",
      name: "Original",
      ui: "wds",
      hovercard: true,
      description:
        "<p>Hello <strong>world</strong> &amp; friends.</p><script>alert(1)</script><p>Next &#x1f33f;</p>",
      links: [
        {
          category: "Work",
          items: [{ title: "Site", url: "https://example.com" }],
        },
      ],
    }),
  );
  assert.equal(p.version, "2.0.0");
  assert.equal(p.description, "Hello world & friends.\nNext 🌿");
  assert.deepEqual(p.appearance, { template: "studio", palette: "honey" });
  assert.equal(p.links[0].items[0].description, "");
  assert.equal(p.ui, undefined);
});
test("v2 description stays plain text verbatim", () => {
  assert.equal(
    normalizeProfile({
      version: "2.0.0",
      description: "Use <angle brackets> & text",
    }).description,
    "Use <angle brackets> & text",
  );
});
test("defaults are complete and do not inject fictional identity", () => {
  const p = normalizeProfile();
  assert.equal(p.name, "");
  assert.equal(p.support.enabled, false);
  assert.deepEqual(p.links, []);
  assert.match(validateProfile(p)[0], /name is required/);
});
test("rejects malformed objects and nested field types", () => {
  for (const input of [
    null,
    [],
    "hi",
    42,
    { social: {} },
    { links: [null] },
    { links: [{ items: {} }] },
    { support: [] },
    { support: { enabled: "yes" } },
    { updates: [{ title: 42 }] },
    { appearance: { template: "unknown" } },
    { appearance: { palette: "unknown" } },
    { name: 3 },
    { version: "3.0.0" },
  ]) {
    assert.ok(validateProfile(input).length, JSON.stringify(input));
    assert.throws(() => parseProfile(JSON.stringify(input)));
  }
});
test("validates every rendered URL, including support", () => {
  for (const p of [
    { photo_url: "javascript:1" },
    { cover_url: "//evil.test" },
    { contact: "data:1" },
    { support: { url: "mailto:hello@example.com" } },
    { social: [{ url: "javascript:1" }] },
    { links: [{ items: [{ url: "//evil.test" }] }] },
    { updates: [{ url: "data:1" }] },
  ])
    assert.ok(validateProfile(p).length);
});
test("enforces array and string bounds", () => {
  for (const p of [
    { social: Array(13).fill({}) },
    { links: Array(21).fill({}) },
    { links: [{ items: Array(31).fill({}) }] },
    { updates: Array(13).fill({}) },
    { name: "a".repeat(501) },
    { description: "a".repeat(20001) },
  ])
    assert.ok(validateProfile(p).length);
});
test("calendar dates and emails are validated", () => {
  for (const date of ["2026-02-29", "2026-04-31", "yesterday", "2026-13-01"])
    assert.ok(validateProfile({ name: "Creator", updates: [{ date }] }).length);
  for (const date of ["", "2024-02-29", "2026-10-01"])
    assert.deepEqual(
      validateProfile({ name: "Creator", updates: [{ date }] }),
      [],
    );
  assert.ok(validateProfile({ email: "bad address" }).length);
  assert.deepEqual(
    validateProfile({ name: "Creator", email: "hello@example.com" }),
    [],
  );
});
test("accepts optional extensions but normalization does not execute or retain them", () => {
  const p = JSON.parse(
    '{"name":"Creator","custom":{"x":true},"__proto__":{"polluted":true}}',
  );
  assert.deepEqual(validateProfile(p), []);
  assert.equal(normalizeProfile(p).custom, undefined);
  assert.equal({}.polluted, undefined);
});
test("JSON parsing reports understandable errors and counts UTF-8 bytes", () => {
  assert.throws(() => parseProfile("{bad"), /Invalid JSON/);
  assert.throws(() => parseProfile(null), /must be text/);
  assert.throws(
    () =>
      parseProfile(
        JSON.stringify({ extra: "🌿".repeat(MAX_PROFILE_BYTES / 4) }),
      ),
    /size limit/,
  );
  const cyclic = {};
  cyclic.self = cyclic;
  assert.deepEqual(validateProfile(cyclic), [
    "Profile must contain serializable JSON.",
  ]);
});

test("name is required in both legacy and canonical input", () => {
  for (const version of [undefined, "1.0.0", "2.0.0"]) {
    for (const name of [undefined, "", "  \t\n", null, 1]) {
      assert.ok(
        validateProfile({ version, name }).some((e) => e.includes("name")),
      );
      assert.throws(
        () => parseProfile(JSON.stringify({ version, name })),
        /name/,
      );
    }
    assert.equal(
      parseProfile(JSON.stringify({ version, name: "Creator" })).name,
      "Creator",
    );
  }
});
test("optional content may be omitted or cleared", () => {
  const p = parseProfile('{"version":"2.0.0","name":"Creator"}');
  assert.deepEqual(validateProfile(p), []);
  assert.deepEqual(p.social, []);
  assert.equal(p.support.url, "");
});
test("rejects malformed HTTP authorities and email header/fragment injection", () => {
  for (const url of [
    "https:///evil.test",
    "https:////evil.test",
    "https:///%2fevil.test",
    "mailto:a@example.com#fragment",
    "mailto:a@example.com?bcc=victim@example.com",
  ])
    assert.equal(safeUrl(url, { allowEmail: true }), "");
  for (const email of [
    "a@example.com?subject=x",
    "a@example.com#fragment",
    "a%0a@example.com",
  ])
    assert.ok(validateProfile({ name: "Creator", email }).length);
});
test("schema requires a visible name and mirrors URL safety checks", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("../public/profile.schema.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(schema.required, ["version", "name"]);
  assert.equal(new RegExp(schema.properties.name.pattern).test("  "), false);
  const url = new RegExp(schema.properties.support.properties.url.pattern);
  for (const value of ["", "https://example.com", "HTTPS://example.com/a"])
    assert.equal(url.test(value), true);
  for (const value of [
    "javascript:alert(1)",
    "//example.com",
    "https:///example.com",
    "https://user:pass@example.com",
    "https://example.com/%0a",
  ])
    assert.equal(url.test(value), false);
  const image = new RegExp(schema.properties.photo_url.pattern);
  assert.equal(image.test("images/photo.svg"), true);
  assert.equal(image.test("//example.com/photo.svg"), false);
  assert.equal(image.test("javascript:alert(1)"), false);
});

test("every layout and optional project image round-trips with schema parity", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("../public/profile.schema.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    schema.properties.appearance.properties.template.enum,
    TEMPLATES.map((t) => t.id),
  );
  for (const { id } of TEMPLATES) {
    const profile = {
      name: "Creator",
      appearance: { template: id },
      links: [
        {
          items: [
            {
              title: "Project",
              url: "https://example.com",
              image_url: "images/project.svg",
              image_alt: "An illustrated field guide",
            },
          ],
        },
      ],
    };
    assert.deepEqual(validateProfile(profile), []);
    const normalized = parseProfile(JSON.stringify(profile));
    assert.equal(normalized.appearance.template, id);
    assert.equal(normalized.links[0].items[0].image_url, "images/project.svg");
    assert.equal(
      normalized.links[0].items[0].image_alt,
      "An illustrated field guide",
    );
    assert.deepEqual(normalizeProfile(normalized), normalized);
  }
});
test("project images reject unsafe URLs, invalid types and oversized alt text", () => {
  for (const image_url of [
    "javascript:alert(1)",
    "data:image/png;base64,x",
    "//evil.test/image",
    "https://user:password@example.com/image",
    42,
  ]) {
    assert.ok(
      validateProfile({
        name: "Creator",
        links: [{ items: [{ image_url }] }],
      }).some((e) => e.includes("image_url")),
    );
  }
  assert.ok(
    validateProfile({
      name: "Creator",
      links: [{ items: [{ image_alt: "a".repeat(501) }] }],
    }).some((e) => e.includes("image_alt")),
  );
  assert.deepEqual(
    normalizeProfile({
      name: "Creator",
      links: [{ items: [{ title: "Legacy", url: "https://example.com" }] }],
    }).links[0].items[0],
    { title: "Legacy", url: "https://example.com", description: "" },
  );
});
