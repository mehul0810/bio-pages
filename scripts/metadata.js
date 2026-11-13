import { safeUrl } from "../src/profile.js";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export function injectMetadata(html, profile) {
  // Allow exports to refresh metadata on an already-built page repeatedly.
  html = html.replace(
    /<meta\s+(?:name="(?:twitter:title|twitter:description|twitter:image|keywords)"|property="og:image")\s+content="[^"]*"\s*\/?>\s*/g,
    "",
  );
  if (!html.includes("<!-- PROFILE_META -->"))
    html = html.replace("</head>", "<!-- PROFILE_META -->\n</head>");
  const title = escape(`${profile.name} · BioPage`);
  const description = escape(profile.short_description || profile.headline);
  const image = safeUrl(profile.photo_url, { image: true });
  const content = (before, value, after) => `${before}${value}${after}`;
  html = html
    .replace(/<title>.*?<\/title>/s, () => `<title>${title}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
      (_, a, b) => content(a, description, b),
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/,
      (_, a, b) => content(a, title, b),
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/,
      (_, a, b) => content(a, description, b),
    );
  const meta = [
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="keywords" content="${escape(profile.keywords)}" />`,
  ];
  if (/^https?:\/\//i.test(image))
    meta.push(
      `<meta property="og:image" content="${escape(image)}" />`,
      `<meta name="twitter:image" content="${escape(image)}" />`,
    );
  return html.replace("<!-- PROFILE_META -->", () => meta.join("\n    "));
}
