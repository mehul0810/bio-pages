import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { injectMetadata } from "../scripts/metadata.js";
import { normalizeProfile } from "../src/profile.js";
const source = readFileSync(new URL("../index.html", import.meta.url), "utf8");
test("build inserts crawler-readable profile metadata without script execution", () => {
  const html = injectMetadata(
    source,
    normalizeProfile({
      name: "Alex",
      headline: "Creator",
      short_description: "Making good things",
      photo_url: "https://example.com/photo.jpg",
    }),
  );
  assert.match(html, /<title>Alex · BioPage<\/title>/);
  assert.match(
    html,
    /property="og:description"\s+content="Making good things"/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/example.com\/photo.jpg"/,
  );
  assert.doesNotMatch(html, /PROFILE_META/);
});
test("metadata escapes HTML and preserves dollar substitution characters", () => {
  const html = injectMetadata(
    source,
    normalizeProfile({
      name: "$& <script>bad</script>",
      headline: '" onload="bad',
      keywords: "'quoted'",
    }),
  );
  assert.match(
    html,
    /<title>\$&amp; &lt;script&gt;bad&lt;\/script&gt; · BioPage<\/title>/,
  );
  assert.match(html, /content="&quot; onload=&quot;bad"/);
  assert.doesNotMatch(html, /<script>bad/);
});
test("relative images do not produce invalid social image URLs", () => {
  const html = injectMetadata(
    source,
    normalizeProfile({ name: "Alex", photo_url: "images/maya.svg" }),
  );
  assert.doesNotMatch(html, /property="og:image"/);
});
