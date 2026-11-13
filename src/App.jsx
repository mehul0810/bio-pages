import React, { useEffect, useId, useRef, useState } from "react";
import {
  MAX_PROFILE_BYTES,
  PALETTES,
  TEMPLATES,
  parseProfile,
  safeUrl,
  validateProfile,
} from "./profile.js";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";
import { DesignedProfile } from "./layouts.jsx";
import { createLaunchPrompt } from "./ai-workflow.js";
import { editorTarget, draftWarning } from "./editor-context.js";

const draftKey = `bio-pages:draft:v2:${window.location.pathname}`;
const isEditor = () =>
  new URLSearchParams(window.location.search).get("edit") === "1";
const blankLink = () => ({ title: "New link", description: "", url: "" });

function Icon({ name = "arrow", ...props }) {
  const paths = {
    arrow: "M7 17 17 7M7 7h10v10",
    coffee:
      "M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 1 1 0 6h-2M7 2v3m5-3v3",
    plus: "M12 5v14M5 12h14",
    check: "m5 12 4 4L19 6",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    back: "m10 5-7 7 7 7M3 12h18",
    link: "m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
    location:
      "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        b
      </span>
      BioPage<span className="brand-period">.</span>
    </span>
  );
}

function SmartLink({ url, children, className, ...props }) {
  const href = safeUrl(url, { allowEmail: true });
  return href ? (
    <a
      className={className}
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ) : (
    <span className={`${className || ""} inactive-link`} {...props}>
      {children}
    </span>
  );
}

function Avatar({ profile }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [profile.photo_url]);
  const src = safeUrl(profile.photo_url, { image: true });
  return (
    <div className="avatar">
      {src && !failed ? (
        <img src={src} alt={profile.name} onError={() => setFailed(true)} />
      ) : (
        <span aria-label={profile.name}>
          {profile.name
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}

function SupportCard({ support }) {
  const configured = !!safeUrl(support.url);
  return (
    <section className="support-card" aria-label="Support this creator">
      <div className="coffee-illustration">
        <Icon name="coffee" width="36" height="36" />
        <span aria-hidden="true">✦</span>
      </div>
      <h2>{support.title || "A little support goes a long way."}</h2>
      {support.description && <p>{support.description}</p>}
      {configured ? (
        <SmartLink className="support-button" url={support.url}>
          <Icon name="coffee" />
          {support.button_label || "Support my work"}
          <Icon />
        </SmartLink>
      ) : (
        <>
          <button className="support-button" disabled>
            <Icon name="coffee" />
            {support.button_label || "Support my work"}
          </button>
          <small className="demo-note">
            Demo · Add your support link in the editor.
          </small>
        </>
      )}
      {configured && <small>Opens the creator’s external support page.</small>}
    </section>
  );
}

function ProfileView({ profile, preview = false }) {
  const { appearance } = profile;
  if (!["studio", "editorial", "spotlight"].includes(appearance.template))
    return (
      <DesignedProfile
        {...{ profile, preview, Avatar, SmartLink, SupportCard, Icon }}
      />
    );
  const cover = safeUrl(profile.cover_url, { image: true });
  return (
    <article
      className={`bio-page template-${appearance.template} palette-${appearance.palette}`}
      aria-label={
        preview ? "Live profile preview" : `${profile.name}’s bio page`
      }
    >
      <div
        className="profile-cover"
        style={
          cover
            ? { backgroundImage: `url(${JSON.stringify(cover)})` }
            : undefined
        }
      >
        <span className="cover-decoration" aria-hidden="true">
          ✳
        </span>
        <span className="cover-label">INDEPENDENTLY MADE. ALWAYS CURIOUS.</span>
      </div>
      <div className="profile-body">
        <header className="profile-intro">
          <Avatar profile={profile} />
          <div className="identity">
            <div className="name-row">
              <h1>{profile.name}</h1>
              <span className="creator-badge">Creator</span>
            </div>
            <div className="profile-details">
              {profile.handle && (
                <span>
                  {profile.handle.startsWith("@")
                    ? profile.handle
                    : `@${profile.handle}`}
                </span>
              )}
              {profile.location && (
                <span>
                  <Icon name="location" width="14" height="14" />
                  {profile.location}
                </span>
              )}
            </div>
          </div>
          <p className="headline">{profile.headline}</p>
          {profile.social.length > 0 && (
            <nav className="socials" aria-label="Social profiles">
              {profile.social.map((social, i) => (
                <SmartLink url={social.url} key={i} className="social-link">
                  {social.platform}
                  <Icon width="13" height="13" />
                </SmartLink>
              ))}
            </nav>
          )}
        </header>
        <div className="profile-columns">
          <div className="profile-main">
            {profile.description && (
              <section className="about-section">
                <div className="section-heading">
                  <span className="eyebrow">A LITTLE ABOUT ME</span>
                  <span aria-hidden="true">✳</span>
                </div>
                <p className="about-copy">{profile.description}</p>
              </section>
            )}
            {profile.links.map((section, index) => (
              <section className="link-section" key={index}>
                <h2>
                  {section.category || "My links"}
                  <span>{String(section.items.length).padStart(2, "0")}</span>
                </h2>
                <div className="link-list">
                  {section.items.map((link, i) => (
                    <SmartLink className="link-card" url={link.url} key={i}>
                      <span className="link-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="link-copy">
                        <strong>{link.title || "Untitled link"}</strong>
                        {link.description && <span>{link.description}</span>}
                      </span>
                      <Icon />
                    </SmartLink>
                  ))}
                </div>
              </section>
            ))}
            {profile.updates.length > 0 && (
              <section className="updates-section">
                <h2>
                  From my notebook<span>THE LATEST</span>
                </h2>
                {profile.updates.map((update, i) => (
                  <div className="update-card" key={i}>
                    {update.date && (
                      <time dateTime={update.date}>
                        {new Date(
                          `${update.date}T12:00:00Z`,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </time>
                    )}
                    <h3>
                      <SmartLink url={update.url}>
                        {update.title}
                        <Icon width="17" height="17" />
                      </SmartLink>
                    </h3>
                    <p>{update.excerpt}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
          <aside className="profile-sidebar">
            {profile.support.enabled && (
              <SupportCard support={profile.support} />
            )}
            {(profile.contact || profile.email) && (
              <section className="contact-card">
                <span className="eyebrow">GOOD THINGS START WITH HELLO</span>
                <h2>Let’s make something.</h2>
                <p>Ideas, collaborations, or just a friendly note.</p>
                <SmartLink
                  url={profile.contact || `mailto:${profile.email}`}
                  className="contact-link"
                >
                  Get in touch <Icon />
                </SmartLink>
              </section>
            )}
            <div className="signature" aria-hidden="true">
              Thanks for being here.<span>♡</span>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value, onChange, multiline = false, help, ...props }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          {...props}
        />
      ) : (
        <input
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
      {help && <small>{help}</small>}
    </label>
  );
}

function Editor({
  profile,
  setProfile,
  published,
  baseProfile,
  onReset,
  onClose,
  storageMessage,
}) {
  const [tab, setTab] = useState("content");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [mobile, setMobile] = useState(false);
  const [aiRequest, setAiRequest] = useState("");
  const [targetSpace, setTargetSpace] = useState(() =>
    editorTarget(window.location.href),
  );
  const [publicAccess, setPublicAccess] = useState(false);
  const inputRef = useRef(null);
  const promptRef = useRef(null);
  const panelRef = useRef(null);
  const update = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setMessage("");
    setErrors([]);
  };
  const changeArray = (key, index, values) =>
    update(
      key,
      profile[key].map((item, i) =>
        i === index ? { ...item, ...values } : item,
      ),
    );
  const updateLink = (section, index, changes) =>
    update(
      "links",
      profile.links.map((group, i) =>
        i === section
          ? {
              ...group,
              items: group.items.map((item, n) =>
                n === index ? { ...item, ...changes } : item,
              ),
            }
          : group,
      ),
    );
  const switchTab = (next) => {
    setTab(next);
    setMessage("");
    setErrors([]);
    panelRef.current?.scrollTo(0, 0);
  };
  const saveFile = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const download = () => {
    const problems = validateProfile(profile);
    if (problems.length) {
      setErrors(problems);
      setMessage(
        "Fix these fields before exporting. Your draft is still here.",
      );
      return;
    }
    const blob = new Blob([`${JSON.stringify(profile, null, 2)}\n`], {
      type: "application/json",
    });
    saveFile(blob, "profile.json");
    setErrors([]);
    setMessage("Profile backup downloaded. Nothing has been published.");
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_PROFILE_BYTES)
        throw new Error(
          `Choose a JSON file smaller than ${MAX_PROFILE_BYTES / 1024} KB.`,
        );
      const next = parseProfile(await file.text());
      if (
        !window.confirm(
          "Replace your current browser draft with this imported profile?",
        )
      )
        return;
      setProfile(next);
      setErrors([]);
      setMessage(
        "Profile imported into your browser draft. Nothing has been published.",
      );
    } catch (err) {
      setErrors([err.message]);
      setMessage("Import failed. Your draft has not changed.");
    }
  };
  const prompt = createLaunchPrompt(profile, {
    request: aiRequest,
    targetSpace,
    publicAccess,
    baseProfile,
  });
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <button className="plain-button back-button" onClick={onClose}>
          <Icon name="back" />
          Published page
        </button>
        <Brand />
        <button
          className="button primary compact"
          onClick={() => switchTab("publish")}
        >
          Publish with AI <Icon />
        </button>
      </header>
      <main className="editor-layout">
        <aside className="editor-panel">
          <div className="editor-panel-heading">
            <span className="eyebrow">YOUR PAGE, YOUR WAY</span>
            <h1>Make it yours.</h1>
            <p>Small edits. A page that feels like you.</p>
          </div>
          <nav className="editor-tabs" aria-label="Editor sections">
            {["content", "design", "publish"].map((value) => (
              <button
                key={value}
                aria-pressed={tab === value}
                onClick={() => switchTab(value)}
              >
                {value === "content"
                  ? "Content"
                  : value === "design"
                    ? "Design"
                    : "Publish"}
              </button>
            ))}
          </nav>
          <div className="editor-fields" ref={panelRef}>
            <div className="draft-note">
              <span className="status-dot" />
              {storageMessage ||
                "Drafts stay in this browser. Ask AI to publish."}
            </div>
            {draftWarning(published, baseProfile) && (
              <p className="editor-message" role="note">
                {draftWarning(published, baseProfile)}
              </p>
            )}
            {message && (
              <div
                className={`editor-message ${errors.length ? "has-error" : ""}`}
                role="status"
              >
                {message}
              </div>
            )}
            {errors.length > 0 && (
              <ul className="errors" role="alert">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {tab === "content" && (
              <>
                <details className="editor-section" open>
                  <summary>
                    01 <span>Your story</span>
                  </summary>
                  <div>
                    <Field
                      label="Name"
                      value={profile.name}
                      onChange={(v) => update("name", v)}
                      maxLength={120}
                    />
                    <Field
                      label="Handle"
                      value={profile.handle}
                      onChange={(v) => update("handle", v)}
                    />
                    <Field
                      label="Headline"
                      value={profile.headline}
                      onChange={(v) => update("headline", v)}
                      multiline
                    />
                    <Field
                      label="Location"
                      value={profile.location}
                      onChange={(v) => update("location", v)}
                    />
                    <Field
                      label="About you"
                      value={profile.description}
                      onChange={(v) => update("description", v)}
                      multiline
                      help="Plain text. Line breaks are welcome."
                    />
                    <Field
                      label="Profile image URL"
                      value={profile.photo_url}
                      onChange={(v) => update("photo_url", v)}
                      help="HTTPS URL or a relative file path, e.g. images/photo.jpg."
                    />
                    <Field
                      label="Cover image URL"
                      value={profile.cover_url}
                      onChange={(v) => update("cover_url", v)}
                      help="Leave blank for a palette-matched graphic."
                    />
                  </div>
                </details>
                <details className="editor-section">
                  <summary>
                    02 <span>Support your work</span>
                  </summary>
                  <div>
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={profile.support.enabled}
                        onChange={(e) =>
                          update("support", {
                            ...profile.support,
                            enabled: e.target.checked,
                          })
                        }
                      />
                      Show support card
                    </label>
                    <p className="field-help">
                      Connect a Buy Me a Coffee, Ko-fi, Patreon, or payment page
                      you own. BioPage does not process payments.
                    </p>
                    {["title", "description", "button_label", "url"].map(
                      (key) => (
                        <Field
                          key={key}
                          label={
                            {
                              title: "Support title",
                              description: "Support description",
                              button_label: "Button label",
                              url: "Support page URL",
                            }[key]
                          }
                          value={profile.support[key]}
                          onChange={(v) =>
                            update("support", { ...profile.support, [key]: v })
                          }
                          multiline={key === "description"}
                        />
                      ),
                    )}
                  </div>
                </details>
                <details className="editor-section">
                  <summary>
                    03 <span>Links & projects</span>
                  </summary>
                  <div>
                    {profile.links.map((group, section) => (
                      <fieldset className="repeat-group" key={section}>
                        <legend>Link group {section + 1}</legend>
                        <Field
                          label="Group title"
                          value={group.category}
                          onChange={(v) =>
                            changeArray("links", section, { category: v })
                          }
                        />
                        {group.items.map((link, i) => (
                          <div className="repeat-item" key={i}>
                            <span className="item-label">Link {i + 1}</span>
                            <Field
                              label="Link title"
                              value={link.title}
                              onChange={(v) =>
                                updateLink(section, i, { title: v })
                              }
                            />
                            <Field
                              label="Link description"
                              value={link.description}
                              onChange={(v) =>
                                updateLink(section, i, { description: v })
                              }
                            />
                            <Field
                              label="Link URL"
                              value={link.url}
                              onChange={(v) =>
                                updateLink(section, i, { url: v })
                              }
                            />
                            <Field
                              label="Project image URL (optional)"
                              value={link.image_url || ""}
                              onChange={(v) =>
                                updateLink(section, i, { image_url: v })
                              }
                              help="Used by visual layouts. Leave blank for abstract artwork."
                            />
                            <Field
                              label="Project image description"
                              value={link.image_alt || ""}
                              onChange={(v) =>
                                updateLink(section, i, { image_alt: v })
                              }
                              help="Describe meaningful image content, or leave blank for decoration."
                            />
                            <div className="row-actions">
                              <button
                                className="text-button"
                                aria-label={`Move up link ${i + 1}`}
                                disabled={i === 0}
                                onClick={() => {
                                  const items = [...group.items];
                                  [items[i - 1], items[i]] = [
                                    items[i],
                                    items[i - 1],
                                  ];
                                  changeArray("links", section, { items });
                                }}
                              >
                                Move up
                                <span className="sr-only"> link {i + 1}</span>
                              </button>
                              <button
                                className="text-button danger"
                                aria-label={`Remove link ${i + 1}`}
                                onClick={() =>
                                  changeArray("links", section, {
                                    items: group.items.filter(
                                      (_, n) => n !== i,
                                    ),
                                  })
                                }
                              >
                                Remove
                                <span className="sr-only"> link {i + 1}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="button secondary full"
                          disabled={group.items.length >= 30}
                          onClick={() =>
                            changeArray("links", section, {
                              items: [...group.items, blankLink()],
                            })
                          }
                        >
                          <Icon name="plus" />
                          Add link
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() =>
                            update(
                              "links",
                              profile.links.filter((_, n) => n !== section),
                            )
                          }
                        >
                          Remove group {section + 1}
                        </button>
                      </fieldset>
                    ))}
                    <button
                      className="button secondary full"
                      disabled={profile.links.length >= 20}
                      onClick={() =>
                        update("links", [
                          ...profile.links,
                          { category: "My links", items: [blankLink()] },
                        ])
                      }
                    >
                      <Icon name="plus" />
                      Add link group
                    </button>
                  </div>
                </details>
                <details className="editor-section">
                  <summary>
                    04 <span>Socials & contact</span>
                  </summary>
                  <div>
                    {profile.social.map((social, i) => (
                      <div className="repeat-item" key={i}>
                        <Field
                          label="Platform"
                          value={social.platform}
                          onChange={(v) =>
                            changeArray("social", i, { platform: v })
                          }
                        />
                        <Field
                          label="Social URL"
                          value={social.url}
                          onChange={(v) => changeArray("social", i, { url: v })}
                        />
                        <button
                          className="text-button danger"
                          onClick={() =>
                            update(
                              "social",
                              profile.social.filter((_, n) => n !== i),
                            )
                          }
                        >
                          Remove social {i + 1}
                        </button>
                      </div>
                    ))}
                    <button
                      className="button secondary full"
                      disabled={profile.social.length >= 12}
                      onClick={() =>
                        update("social", [
                          ...profile.social,
                          { platform: "Website", url: "" },
                        ])
                      }
                    >
                      <Icon name="plus" />
                      Add social
                    </button>
                    <Field
                      label="Contact page URL"
                      value={profile.contact}
                      onChange={(v) => update("contact", v)}
                    />
                    <Field
                      label="Public email"
                      type="email"
                      value={profile.email}
                      onChange={(v) => update("email", v)}
                      help="Shown as a mail link if no contact page is set. This is public data."
                    />
                  </div>
                </details>
                <details className="editor-section">
                  <summary>
                    05 <span>Notebook updates</span>
                  </summary>
                  <div>
                    {profile.updates.map((item, i) => (
                      <div className="repeat-item" key={i}>
                        <Field
                          label="Update title"
                          value={item.title}
                          onChange={(v) =>
                            changeArray("updates", i, { title: v })
                          }
                        />
                        <Field
                          label="Date"
                          type="date"
                          value={item.date}
                          onChange={(v) =>
                            changeArray("updates", i, { date: v })
                          }
                        />
                        <Field
                          label="Excerpt"
                          multiline
                          value={item.excerpt}
                          onChange={(v) =>
                            changeArray("updates", i, { excerpt: v })
                          }
                        />
                        <Field
                          label="Read more URL"
                          value={item.url}
                          onChange={(v) =>
                            changeArray("updates", i, { url: v })
                          }
                        />
                        <button
                          className="text-button danger"
                          onClick={() =>
                            update(
                              "updates",
                              profile.updates.filter((_, n) => n !== i),
                            )
                          }
                        >
                          Remove update {i + 1}
                        </button>
                      </div>
                    ))}
                    <button
                      className="button secondary full"
                      disabled={profile.updates.length >= 12}
                      onClick={() =>
                        update("updates", [
                          ...profile.updates,
                          {
                            title: "A new chapter",
                            date: "",
                            excerpt: "",
                            url: "",
                          },
                        ])
                      }
                    >
                      <Icon name="plus" />
                      Add update
                    </button>
                  </div>
                </details>
                <details className="editor-section">
                  <summary>
                    06 <span>Search & sharing</span>
                  </summary>
                  <div>
                    <Field
                      label="Short description"
                      multiline
                      value={profile.short_description}
                      onChange={(v) => update("short_description", v)}
                      help="Used for search and social previews after rebuilding."
                    />
                    <Field
                      label="Keywords"
                      value={profile.keywords}
                      onChange={(v) => update("keywords", v)}
                    />
                  </div>
                </details>
              </>
            )}
            {tab === "design" && (
              <div className="design-panel">
                <h2>A different kind of you.</h2>
                <p>Switch the layout without losing a word.</p>
                <fieldset className="template-choices">
                  <legend>Choose a template</legend>
                  {TEMPLATES.map((template) => (
                    <button
                      className={`template-choice ${profile.appearance.template === template.id ? "selected" : ""}`}
                      key={template.id}
                      aria-pressed={profile.appearance.template === template.id}
                      onClick={() =>
                        update("appearance", {
                          ...profile.appearance,
                          template: template.id,
                        })
                      }
                    >
                      <span
                        className={`template-mini mini-${template.id}`}
                        aria-hidden="true"
                      >
                        <i />
                        <b />
                        <em />
                        <em />
                      </span>
                      <span>
                        <strong>{template.name}</strong>
                        <small>{template.description}</small>
                      </span>
                      <span className="selection-circle">
                        {profile.appearance.template === template.id && (
                          <Icon name="check" width="14" height="14" />
                        )}
                      </span>
                    </button>
                  ))}
                </fieldset>
                <fieldset className="palette-choices">
                  <legend>Make it your color</legend>
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      aria-pressed={profile.appearance.palette === palette.id}
                      onClick={() =>
                        update("appearance", {
                          ...profile.appearance,
                          palette: palette.id,
                        })
                      }
                    >
                      <span style={{ background: palette.color }}>
                        {profile.appearance.palette === palette.id && (
                          <Icon name="check" />
                        )}
                      </span>
                      {palette.name}
                    </button>
                  ))}
                </fieldset>
                <div className="tip-card">
                  <span>✦</span>
                  <p>
                    All {TEMPLATES.length * PALETTES.length} combinations use
                    your same profile. Try a new look whenever inspiration
                    strikes.
                  </p>
                </div>
              </div>
            )}
            {tab === "publish" && (
              <div className="publish-panel">
                <span className="pill">YOU OWN YOUR PAGE</span>
                <h2>One request. Your page, live.</h2>
                <p>
                  Ask your connected AI assistant to handle setup, content,
                  design, checks, and Spacefast publication in one run. You
                  should not have to package files or configure a repository
                  yourself.
                </p>
                <section className="ai-launch" aria-label="Launch with AI">
                  <h3>Tell it what you want.</h3>
                  <Field
                    label="What should AI do?"
                    value={aiRequest}
                    onChange={setAiRequest}
                    multiline
                    help="For example: use Editorial in Sage and publish this as my creator page."
                  />
                  <Field
                    label="Existing Space URL"
                    value={targetSpace}
                    onChange={(value) => {
                      setTargetSpace(value);
                      setErrors([]);
                      setMessage("");
                    }}
                    help="Optional. Leave blank to create a new page. Set this to update the same page."
                  />
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={publicAccess}
                      disabled={!!targetSpace.trim()}
                      onChange={(e) => setPublicAccess(e.target.checked)}
                    />
                    Make the new page publicly accessible
                  </label>
                  <p className="field-help">
                    Existing pages keep their access settings. A new page stays
                    private unless you select public access.
                  </p>
                  <textarea
                    ref={promptRef}
                    aria-label="AI launch prompt"
                    readOnly
                    value={prompt}
                    rows={10}
                  />
                  <button
                    className="button primary full"
                    onClick={async () => {
                      const problems = validateProfile(profile);
                      if (problems.length) {
                        setErrors(problems);
                        setMessage("Fix these fields before using this draft.");
                        return;
                      }
                      if (targetSpace && !safeUrl(targetSpace)) {
                        setErrors([
                          "Use a complete HTTP or HTTPS URL for your existing Space.",
                        ]);
                        return;
                      }
                      try {
                        await navigator.clipboard.writeText(prompt);
                        setMessage(
                          "Launch prompt copied with your draft. Send it in your AI chat with Spacefast connected; your assistant will handle the steps.",
                        );
                      } catch {
                        promptRef.current?.focus();
                        promptRef.current?.select();
                        setMessage(
                          "Copy is unavailable. Select and copy the launch prompt above.",
                        );
                      }
                    }}
                  >
                    Copy launch prompt
                  </button>
                  <p className="field-help">
                    This button only copies the request. It does not run an AI
                    or publish. Your assistant needs this source and a connected
                    Spacefast account. Sign-in, account choices, or required
                    approvals can pause the run.
                  </p>
                </section>
                <details className="advanced-options">
                  <summary>Advanced: JSON backup and import</summary>
                  <section className="import-section">
                    <h3>Keep a portable backup</h3>
                    <p>
                      Download just your content and design. Import it here
                      later or use it with your own repository.
                    </p>
                    <button
                      className="button secondary full"
                      onClick={download}
                    >
                      <Icon name="download" /> Download profile.json
                    </button>
                  </section>
                  <section className="import-section">
                    <h3>Bring a profile with you</h3>
                    <p>
                      Import an existing BioPage JSON file. Invalid files won’t
                      replace your draft.
                    </p>
                    <button
                      className="button secondary full"
                      onClick={() => inputRef.current?.click()}
                    >
                      Import profile.json
                    </button>
                    <input
                      ref={inputRef}
                      className="sr-only"
                      tabIndex={-1}
                      aria-label="Import profile JSON"
                      type="file"
                      accept=".json,application/json"
                      onChange={importFile}
                    />
                  </section>
                  <button
                    className="text-button danger reset-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Discard your browser draft and restore the published profile? This cannot be undone.",
                        )
                      ) {
                        onReset();
                        setErrors([]);
                        setMessage(
                          "Restored the published profile. Nothing changed on the live site.",
                        );
                      }
                    }}
                  >
                    Reset draft to published profile
                  </button>
                </details>
              </div>
            )}
          </div>
          <div className="editor-bottom">
            <span>Private to this browser · not a live save</span>
            <button
              className="text-button"
              onClick={() => switchTab("publish")}
            >
              Launch options <Icon name="arrow" width="14" height="14" />
            </button>
          </div>
        </aside>
        <section
          className={`preview-area ${mobile ? "preview-mobile" : ""}`}
          aria-label="Preview"
        >
          <div className="preview-toolbar">
            <span>
              <span className="status-dot" />
              LIVE PREVIEW
            </span>
            <div>
              <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
                Desktop
              </button>
              <button aria-pressed={mobile} onClick={() => setMobile(true)}>
                Mobile
              </button>
            </div>
            <span className="preview-hint">Draft preview · not published</span>
          </div>
          <div className="preview-canvas">
            <ProfileView profile={profile} preview />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [published, setPublished] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftBase, setDraftBase] = useState(null);
  const [editing, setEditing] = useState(isEditor);
  const [error, setError] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(`${import.meta.env.BASE_URL}profile.json`, {
      signal: controller.signal,
      cache: "no-cache",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            `The profile could not be loaded (HTTP ${response.status}).`,
          );
        const content = await response.text();
        const profile = parseProfile(content);
        setPublished(profile);
        let saved = profile;
        let base = profile;
        try {
          const stored = localStorage.getItem(draftKey);
          if (stored) {
            const record = JSON.parse(stored);
            if (record.storageVersion === 1 && record.draft) {
              saved = parseProfile(JSON.stringify(record.draft));
              base = null;
              base = record.baseProfile
                ? parseProfile(JSON.stringify(record.baseProfile))
                : null;
            } else {
              saved = parseProfile(stored);
              base = null; // Legacy drafts have no trustworthy original baseline.
            }
          }
        } catch {
          setStorageMessage(
            "Saved draft or its baseline needs review. The published profile is safe.",
          );
        }
        setDraft(saved);
        setDraftBase(base);
        document.title = `${profile.name} · BioPage`;
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const listener = () => setEditing(isEditor());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    if (!editing || !draft) return;
    try {
      if (!validateProfile(draft).length) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ storageVersion: 1, draft, baseProfile: draftBase }),
        );
        setStorageMessage("Draft saved in this browser. Ask AI to publish.");
      } else
        setStorageMessage(
          "Incomplete fields. Fix or clear them to save this draft.",
        );
    } catch {
      setStorageMessage(
        "Browser storage is unavailable. Export before leaving.",
      );
    }
  }, [draft, draftBase, editing]);
  useEffect(() => {
    if (
      !editing ||
      !draft ||
      (!validateProfile(draft).length &&
        !storageMessage.startsWith("Browser storage is unavailable"))
    )
      return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, draft, storageMessage]);
  const navigate = (value, createNew = false) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("edit", "1");
    else url.searchParams.delete("edit");
    if (value && createNew) url.searchParams.set("new", "1");
    else url.searchParams.delete("new");
    window.history.pushState({}, "", url);
    setEditing(value);
    window.scrollTo(0, 0);
  };
  if (error)
    return (
      <main className="load-screen">
        <Brand />
        <h1>This page needs a little attention.</h1>
        <p role="alert">{error}</p>
        <p>
          Check that public/profile.json contains a valid BioPage profile, then
          rebuild.
        </p>
        <button
          className="button primary"
          onClick={() => setAttempt((a) => a + 1)}
        >
          Try again
        </button>
      </main>
    );
  if (!published || !draft)
    return (
      <main className="load-screen">
        <Brand />
        <p role="status">Making ourselves at home…</p>
      </main>
    );
  if (editing)
    return (
      <Editor
        profile={draft}
        setProfile={setDraft}
        published={published}
        baseProfile={draftBase}
        onReset={() => {
          setDraft(structuredClone(published));
          setDraftBase(structuredClone(published));
        }}
        onClose={() => navigate(false)}
        storageMessage={storageMessage}
      />
    );
  return (
    <>
      <a className="skip-link" href="#profile">
        Skip to profile
      </a>
      <header className="site-header">
        <span className="header-note">A little home for what you do.</span>
        <button
          className="button secondary compact"
          onClick={() => navigate(true, true)}
        >
          Make this yours <Icon width="17" height="17" />
        </button>
      </header>
      <main id="profile" className="site-main">
        <ProfileView profile={published} />
      </main>
      <footer className="site-footer">
        <span>
          Made with{" "}
          <a
            href="https://github.com/mehul0810/bio-pages"
            target="_blank"
            rel="noopener noreferrer"
          >
            BioPage
          </a>{" "}
          · Yours to make your own.
        </span>
        <div>
          <button className="text-button" onClick={() => window.print()}>
            Print / save PDF
          </button>
          <button className="text-button" onClick={() => navigate(true)}>
            Edit this page <Icon width="13" height="13" />
          </button>
        </div>
      </footer>
    </>
  );
}
