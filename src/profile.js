/** BioPage profile format. Text is rendered as text, never executable HTML. */
export const MAX_PROFILE_BYTES = 256 * 1024;
export const TEMPLATES = Object.freeze([
  {
    id: "studio",
    name: "Studio",
    description: "A warm, welcoming home for everything you make.",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "A considered journal for stories and ideas.",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "A bold stage for your next big thing.",
  },
]);
export const PALETTES = Object.freeze([
  { id: "honey", name: "Honey", color: "#f4d372" },
  { id: "sage", name: "Sage", color: "#b9d1a4" },
  { id: "rose", name: "Rose", color: "#edb9ad" },
  { id: "ink", name: "Ink", color: "#bdcafa" },
]);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const string = (value) => (typeof value === "string" ? value : "");

/** Return an allowed URL, otherwise ''. Relative URLs are for images only. */
export function safeUrl(value, { image = false, allowEmail = false } = {}) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (
    !url ||
    /[\u0000-\u0020\u007f\\]/.test(url) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(url)
  )
    return "";
  if (/^https?:\/\/[^/]/i.test(url)) {
    try {
      const parsed = new URL(url);
      return parsed.hostname && !parsed.username && !parsed.password ? url : "";
    } catch {
      return "";
    }
  }
  if (allowEmail && /^mailto:[^?#<>\s@]+@[^?#<>\s@]+\.[^?#<>\s@]+$/i.test(url))
    return url;
  if (
    image &&
    !/^(?:\/\/|[a-z][a-z\d+.-]*:)/i.test(url) &&
    !/^(?:#|\?)/.test(url)
  ) {
    // Decode to exclude disguised schemes, network paths and control characters.
    try {
      const decoded = decodeURIComponent(url);
      if (
        /[\u0000-\u0020\u007f\\]/.test(decoded) ||
        /^(?:\/\/|[a-z][a-z\d+.-]*:)/i.test(decoded)
      )
        return "";
      return url;
    } catch {
      return "";
    }
  }
  return "";
}

function plainText(html) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return string(html)
    .replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<\s*br\s*\/?\s*>|<\/\s*(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, key) => {
      if (key[0] !== "#") return entities[key.toLowerCase()] || match;
      const n =
        key[1].toLowerCase() === "x"
          ? parseInt(key.slice(2), 16)
          : Number(key.slice(1));
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n)
        : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalize known fields only. Unknown JSON extensions validate but are not rendered/exported. */
export function normalizeProfile(input = {}) {
  const p = object(input) ? input : {};
  const appearance = object(p.appearance) ? p.appearance : {};
  const support = object(p.support) ? p.support : {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    version: "2.0.0",
    name: string(p.name),
    handle: string(p.handle),
    headline: string(p.headline),
    location: string(p.location),
    short_description: string(p.short_description),
    description:
      p.version === "2.0.0" ? string(p.description) : plainText(p.description),
    photo_url: safeUrl(p.photo_url, { image: true }),
    cover_url: safeUrl(p.cover_url, { image: true }),
    email: string(p.email),
    contact: safeUrl(p.contact, { allowEmail: true }),
    keywords: string(p.keywords),
    appearance: {
      template: TEMPLATES.some((t) => t.id === appearance.template)
        ? appearance.template
        : "studio",
      palette: PALETTES.some((t) => t.id === appearance.palette)
        ? appearance.palette
        : "honey",
    },
    support: {
      enabled: support.enabled === true,
      title: string(support.title) || "Support my work",
      description: string(support.description),
      button_label: string(support.button_label) || "Buy me a coffee",
      url: safeUrl(support.url),
    },
    social: arr(p.social)
      .filter(object)
      .slice(0, 12)
      .map((s) => ({ platform: string(s.platform), url: safeUrl(s.url) })),
    links: arr(p.links)
      .filter(object)
      .slice(0, 20)
      .map((c) => ({
        category: string(c.category),
        items: arr(c.items)
          .filter(object)
          .slice(0, 30)
          .map((l) => ({
            title: string(l.title),
            description: string(l.description),
            url: safeUrl(l.url),
          })),
      })),
    updates: arr(p.updates)
      .filter(object)
      .slice(0, 12)
      .map((u) => ({
        title: string(u.title),
        date: string(u.date),
        excerpt: string(u.excerpt),
        url: safeUrl(u.url),
      })),
  };
}

/** Validate before normalization so malformed/unsafe input never disappears silently. */
export function validateProfile(input) {
  const errors = [];
  if (!object(input)) return ["Profile must be a JSON object."];
  try {
    if (
      new TextEncoder().encode(JSON.stringify(input)).length > MAX_PROFILE_BYTES
    )
      errors.push("Profile exceeds the 256 KB size limit.");
  } catch {
    return ["Profile must contain serializable JSON."];
  }
  const str = (o, key, path, max = 2000) => {
    if (
      o[key] !== undefined &&
      (typeof o[key] !== "string" || o[key].length > max)
    )
      errors.push(`${path}${key} must be text of at most ${max} characters.`);
  };
  const url = (o, key, path, options = {}) => {
    str(o, key, path, 2048);
    if (
      typeof o[key] === "string" &&
      o[key] !== "" &&
      !safeUrl(o[key], options)
    )
      errors.push(
        `${path}${key} must be a safe ${options.image ? "HTTP(S) or relative image" : options.allowEmail ? "HTTP(S) or mailto" : "HTTP(S)"} URL.`,
      );
  };
  const list = (o, key, path, max, check) => {
    if (o[key] === undefined) return;
    if (!Array.isArray(o[key])) {
      errors.push(`${path}${key} must be an array.`);
      return;
    }
    if (o[key].length > max)
      errors.push(`${path}${key} must contain at most ${max} entries.`);
    o[key].slice(0, max).forEach((entry, i) => {
      const prefix = `${path}${key}[${i}].`;
      if (!object(entry))
        errors.push(`${prefix.slice(0, -1)} must be an object.`);
      else check(entry, prefix);
    });
  };
  for (const key of [
    "name",
    "handle",
    "headline",
    "location",
    "short_description",
    "email",
    "keywords",
  ])
    str(input, key, "", key === "short_description" ? 2000 : 500);
  str(input, "description", "", 20000);
  if (typeof input.name !== "string" || !input.name.trim())
    errors.push("name is required and must contain visible text.");
  if (
    input.version !== undefined &&
    !["1.0.0", "2.0.0"].includes(input.version)
  )
    errors.push("version must be 1.0.0 or 2.0.0.");
  if (
    typeof input.email === "string" &&
    input.email &&
    !safeUrl(`mailto:${input.email}`, { allowEmail: true })
  )
    errors.push("email must be a valid email address or empty.");
  url(input, "photo_url", "", { image: true });
  url(input, "cover_url", "", { image: true });
  url(input, "contact", "", { allowEmail: true });
  if (input.appearance !== undefined) {
    if (!object(input.appearance)) errors.push("appearance must be an object.");
    else
      for (const [key, choices] of [
        ["template", TEMPLATES],
        ["palette", PALETTES],
      ]) {
        if (
          input.appearance[key] !== undefined &&
          !choices.some((c) => c.id === input.appearance[key])
        )
          errors.push(`appearance.${key} is not supported.`);
      }
  }
  if (input.support !== undefined) {
    if (!object(input.support)) errors.push("support must be an object.");
    else {
      if (
        input.support.enabled !== undefined &&
        typeof input.support.enabled !== "boolean"
      )
        errors.push("support.enabled must be true or false.");
      for (const key of ["title", "description", "button_label"])
        str(input.support, key, "support.");
      url(input.support, "url", "support.");
    }
  }
  list(input, "social", "", 12, (s, path) => {
    str(s, "platform", path, 100);
    url(s, "url", path);
  });
  list(input, "links", "", 20, (c, path) => {
    str(c, "category", path, 200);
    list(c, "items", path, 30, (l, prefix) => {
      str(l, "title", prefix, 500);
      str(l, "description", prefix);
      url(l, "url", prefix);
    });
  });
  list(input, "updates", "", 12, (u, path) => {
    str(u, "title", path, 500);
    str(u, "excerpt", path);
    str(u, "date", path, 10);
    url(u, "url", path);
    if (typeof u.date === "string" && u.date) {
      const date = new Date(`${u.date}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(u.date) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== u.date
      )
        errors.push(`${path}date must be a real YYYY-MM-DD date or empty.`);
    }
  });
  return errors;
}

export function parseProfile(text) {
  if (typeof text !== "string") throw new Error("Profile JSON must be text.");
  if (new TextEncoder().encode(text).length > MAX_PROFILE_BYTES)
    throw new Error("Profile exceeds the 256 KB size limit.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON. Check commas, quotes, and brackets.");
  }
  const errors = validateProfile(parsed);
  if (errors.length) throw new Error(errors.join("\n"));
  return normalizeProfile(parsed);
}
