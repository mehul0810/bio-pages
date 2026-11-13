import React, { useEffect, useState } from "react";
import { safeUrl } from "./profile.js";
import "./layouts.css";

/** Decorative fallback is deliberately abstract, never a fabricated project screenshot. */
function LayoutMedia({ url, alt = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const src = safeUrl(url, { image: true });
  return (
    <div className={`layout-media${src && !failed ? " has-image" : ""}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="layout-art" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}

/** Seven additional layouts from the original Pen. All use the same profile data. */
export function DesignedProfile({
  profile,
  preview,
  Avatar,
  SmartLink,
  SupportCard,
  Icon,
}) {
  const { template, palette } = profile.appearance;
  const featuredGroup = profile.links.findIndex(
    (group) => group.items.length > 0,
  );
  const featured = profile.links[featuredGroup]?.items[0];
  const featureFirst = ["postcard", "launchpad", "directory"].includes(
    template,
  );
  const linkCard = (link, key, { primary = false, visual = false } = {}) => (
    <SmartLink
      key={key}
      url={link.url}
      className={`layout-link${primary ? " layout-primary" : ""}${visual ? " layout-visual" : ""}`}
    >
      {visual && <LayoutMedia url={link.image_url} alt={link.image_alt} />}
      <span className="layout-link-content">
        <span>
          <strong>{link.title || "Untitled link"}</strong>
          {link.description && (
            <span className="layout-link-description">{link.description}</span>
          )}
        </span>
        <Icon />
      </span>
    </SmartLink>
  );
  const identity = (
    <div className="layout-person">
      <Avatar profile={profile} />
      <div>
        <h1>{profile.name}</h1>
        {(profile.handle || profile.location) && (
          <p className="layout-details">
            {profile.handle && (
              <span>
                {profile.handle.startsWith("@")
                  ? profile.handle
                  : `@${profile.handle}`}
              </span>
            )}
            {profile.location && <span>{profile.location}</span>}
          </p>
        )}
      </div>
    </div>
  );
  const socials = profile.social.length > 0 && (
    <nav className="layout-socials" aria-label="Social profiles">
      {profile.social.map((social, i) => (
        <SmartLink key={i} url={social.url}>
          {social.platform}
          <Icon width="14" height="14" />
        </SmartLink>
      ))}
    </nav>
  );
  const introduction = (
    <header className="layout-intro">
      {identity}
      {profile.headline && (
        <p className="layout-headline">{profile.headline}</p>
      )}
      {profile.description && (
        <p className="layout-about about-copy">{profile.description}</p>
      )}
      {socials}
      {featureFirst &&
        template !== "directory" &&
        featured &&
        linkCard(featured, "featured", { primary: true })}
    </header>
  );
  const groups = (
    <div className="layout-groups">
      {profile.links.map((group, groupIndex) => {
        const items =
          featureFirst && groupIndex === featuredGroup
            ? group.items.slice(1)
            : group.items;
        if (!items.length) return null;
        return (
          <section className="layout-group" key={groupIndex}>
            <h2>{group.category || "My links"}</h2>
            <div className="layout-links">
              {items.map((link, i) =>
                linkCard(link, i, {
                  primary:
                    template === "orbit" &&
                    groupIndex === featuredGroup &&
                    i === 0,
                  visual:
                    template === "gallery" ||
                    (template === "canvas" && i === 0),
                }),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
  const updates = profile.updates.length > 0 && (
    <section className="layout-updates">
      <h2>From my notebook</h2>
      <div className="layout-notes">
        {profile.updates.map((update, i) => (
          <div key={i} className="layout-note">
            {update.date && (
              <time dateTime={update.date}>
                {new Date(`${update.date}T12:00:00Z`).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}
              </time>
            )}
            <h3>
              <SmartLink url={update.url}>
                {update.title || "Untitled note"}
                <Icon width="17" height="17" />
              </SmartLink>
            </h3>
            {update.excerpt && <p>{update.excerpt}</p>}
          </div>
        ))}
      </div>
    </section>
  );
  const extras = (profile.support.enabled ||
    profile.contact ||
    profile.email) && (
    <div className="layout-extras">
      {profile.support.enabled && <SupportCard support={profile.support} />}
      {(profile.contact || profile.email) && (
        <section className="layout-contact">
          <h2>Let’s make something.</h2>
          <p>Ideas, collaborations, or just a friendly note.</p>
          <SmartLink
            className="layout-contact-link"
            url={profile.contact || `mailto:${profile.email}`}
          >
            Get in touch
            <Icon />
          </SmartLink>
        </section>
      )}
    </div>
  );
  return (
    <article
      className={`bio-page designed-page template-${template} palette-${palette}`}
      aria-label={
        preview ? "Live profile preview" : `${profile.name}’s bio page`
      }
    >
      {template === "journal" ? (
        <div className="layout-journal">
          {introduction}
          <div className="layout-journal-main">
            {updates}
            {groups}
            {extras}
          </div>
        </div>
      ) : (
        <>
          {["postcard", "launchpad"].includes(template) ? (
            <div className="layout-hero">
              <LayoutMedia
                url={featured?.image_url || profile.cover_url}
                alt={featured?.image_url ? featured.image_alt : ""}
              />
              {introduction}
            </div>
          ) : (
            introduction
          )}
          <div className="layout-content">
            {template === "directory" &&
              featured &&
              linkCard(featured, "featured", { primary: true })}
            {groups}
            {updates}
            {extras}
          </div>
        </>
      )}
    </article>
  );
}
