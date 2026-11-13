/** Keep owner edits on the current page; copying a template is explicit. */
export function editorTarget(href) {
  try {
    const url = new URL(href);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.searchParams.get("new") === "1" ||
      /^(?:localhost|127(?:\.\d+){3}|\[::1\])$/i.test(url.hostname)
    )
      return "";
    // Never include a private viewing token, editor flag, or fragment in a prompt.
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}

export function draftWarning(published, baseline) {
  if (!baseline)
    return "This draft has no reliable original version. Describe the exact changes you want when updating an existing page.";
  if (JSON.stringify(published) !== JSON.stringify(baseline))
    return "The published profile changed since this draft began. Your draft is preserved; the update request will compare each edit with the current source.";
  return "";
}
