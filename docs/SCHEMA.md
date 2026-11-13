# Profile format

BioPage reads `public/profile.json`. The canonical format is version `2.0.0`; `public/profile.schema.json` provides a draft 2020-12 JSON Schema for editor assistance. The canonical schema requires `version: "2.0.0"`; the runtime additionally accepts legacy input without a version. Runtime validation is authoritative for safe URLs, calendar dates, and the total 256 KiB UTF-8 limit.

A nonempty `name` is required, including for legacy imports. All other content fields are optional. Missing fields become empty strings, empty arrays, or the defaults below. Empty URLs are allowed while drafting; the page must not navigate to an empty destination. The demo uses illustrative assets and `example.com` links. Its support section is enabled but has no payment destination: add your own trusted creator-support URL to activate it.

## Fields

- Identity: `name`, `handle`, `headline`, `location`, `short_description`, `description`, `photo_url`, `cover_url`, `email`, `contact`, `keywords`.
- `description` is plain text, including newlines. Never render it as HTML.
- `appearance`: `template` (`studio`, `editorial`, `spotlight`) and `palette` (`honey`, `sage`, `rose`, `ink`). Defaults: `studio` and `honey`.
- `support`: boolean `enabled` (default false), `title`, `description`, `button_label`, and `url`. Its URL must be HTTP(S), never a raw payment credential or a mailto link.
- `social`: at most 12 objects containing `platform` and `url`.
- `links`: at most 20 category objects with `category` and `items`. Each category allows at most 30 objects containing `title`, `description`, and `url`.
- `updates`: at most 12 objects with `title`, `date`, `excerpt`, and `url`. Dates are empty or real `YYYY-MM-DD` dates.

Identity fields are limited to 500 characters, short descriptions to 2,000, the full description to 20,000, and URLs to 2,048. Further field-specific limits are in the schema. Unknown extension fields are permitted to ease interoperability but are ignored and omitted when normalized or exported. Do not rely on the editor to preserve extension data; keep a separate copy if needed.

## URL safety

Link destinations require explicit HTTP or HTTPS. Contact also supports a simple `mailto:address@example.com` destination. Images may additionally use safe relative paths such as `images/avatar.svg`. Protocol-relative URLs, embedded credentials, backslashes, controls, and executable/data schemes are rejected. Image relative paths are checked for encoded unsafe schemes too. This is a navigation allowlist, not a remote-content endorsement: choose hosts and assets you trust.

## Version 1 migration

The importer accepts `1.0.0` and unversioned legacy profiles. Existing identity, contact, social, and categorized links migrate automatically. Legacy HTML descriptions become plain text, discarding tags and script/style/embedded content while preserving useful text. Legacy `ui: "wds"` resolves to Studio/Honey; `hovercard` is retired. Every export writes canonical version `2.0.0`.

## JavaScript API

- `parseProfile(text)`: validate JSON, reject unsafe or invalid fields, then normalize; throws a human-readable error on failure.
- `validateProfile(input)`: return an array of error strings; an empty array means valid.
- `normalizeProfile(input)`: fill defaults and normalize known fields without mutating input. It is forgiving; import paths should call `parseProfile` rather than silently normalizing invalid source data.
- `safeUrl(value, { image = false, allowEmail = false } = {})`: return an allowed trimmed URL, otherwise an empty string.
- `TEMPLATES`, `PALETTES`, `MAX_PROFILE_BYTES`: UI choices and import-size limit.
