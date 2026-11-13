# From one AI request to a live Bio Page

## User experience

The user should be able to say:

> Create and publish a public BioPage site on Spacefast for me. My name is Alex Rivera, I make illustrated field guides, and my portfolio is https://example.com. Use Editorial in Sage. Handle setup, checks, and publication, and give me the live link.

The assistant owns every routine step. The user does not export a ZIP, install a CLI, create a repository, or upload files. Later they can say:

> Update my Bio Page at [its live URL]: use this new headline and add this link. Publish it.

These are example requests, not permission to publish any actual user data. Use the authenticated user's current request, supplied content, selected destination, and access choice.

## Capability and prerequisites

This workflow runs in an AI assistant that has connected Spacefast tools and can read/build this source. It is not an AI backend embedded in the public website. A plain chat without these capabilities cannot complete publication merely by generating a prompt.

Use an existing authenticated Spacefast connection. If it requires reauthentication, request only that supported reconnect step and retain completed work. A browser login and the assistant's app connection are separate sessions. Do not extract browser tokens, invent OAuth URLs, or install a CLI to get around a denied connector action.

Ask only when a necessary value cannot be resolved: the person's actual identity/content, an ambiguous team or existing Space, source access, or a provider-required approval. Infer optional design choices. Use a private new Space unless public access was explicitly requested. Keep existing access unchanged unless its change was requested. No extra question is needed for each routine step already covered by a create-and-publish request.

## New-page workflow

1. Read the current request and the actual source. The local prepared implementation may be ahead of the public GitHub repository; verify the source revision rather than assuming a published template already includes local changes. Read `public/profile.json`, the schema, and the validation rules. Use the user's real content or clearly label a requested demo.
2. Read Spacefast account/team information. Select the requested team, or the sole reachable team only when the returned pagination confirms there are no more. If multiple teams remain plausible, ask once. Read the target team's available preferences and design standards before tailoring the page. Missing standards are an unavailable check, not a pass.
3. Update `public/profile.json` with the requested content and selected template/palette. Preserve safe URLs and facts. Support buttons are only supplied external links; do not invent payment destinations. Build and test with `npm run check`; inspect desktop/mobile and relevant editor states in a real browser when available. Report blocked checks.
4. Run `npm run prepare:spacefast -- --team-id VERIFIED_TEAM_ID --access private` (or `public` only with explicit public intent). The command runs checks and writes `.bio-pages/spacefast-source-plan.json`. It contains complete source operations, hashes, build settings, and creation parameters. It performs no external action and does not fetch or generate credentials. It filters credential filenames, unexpected file types, and symlinks, but this is not a content-secret scan. Inspect every included file for credentials and private data before transmitting any source. Stop and remove or safely relocate sensitive content when found.
5. Read the current `createSpace` schema and create a new Space with the verified team and intended access. Retain its exact returned ID immediately. If the response is uncertain, inspect state before any repeat. Do not create duplicates. Do not silently fall back to an anonymous or different-team Space.
6. Create a source workspace for the new empty Space using `createSpaceSourceWorkspace`, the plan's `sourceWorkspace` settings, and a unique `operationId`. Read its returned workspace ID, current revision, and working commit. This initializes a genuinely empty hosted repository. The direct initial-commit route returned `repository_ref_not_found` during the demo; do not rely on it or invent a branch head. If creation imports an upload, follow the returned operation until initialization finishes.
7. Read and configure the hosted source connection's build defaults using the actual current API: repository root `.`, `npm ci`, `npm run build`, output `dist`. Set source-triggered auto-deploy off for this new setup before committing, and read settings back. Save `initialSource.operations` with `editSpaceSourceWorkspaceFiles` and the current revision; inspect the unstaged diff, stage the exact paths, inspect the staged diff, and commit. Each mutation needs its own operation ID and the latest returned revision. Read the saved commit diff and verify the exact files. This is separate from the live channel's publication mode: read that mode and do not change it. A manual channel needs explicit promotion in step 9 even when a build succeeds. Never replace an unrelated connection.
8. Decide the build target **before** starting the one build: when channel mode is manual or review requires a separate promotion, use `channel: null`; otherwise use the requested live target. Build the exact returned source commit using `createSpaceBuild`, the hosted connection's returned ID, those build settings, and an idempotency key. Set `wait: false` and follow its status. Do not duplicate a build already started by a source commit.
9. Inspect the resulting ready version. When the target was withheld for manual mode or review, use the current `promoteSpaceVersion` operation for that exact version and the live channel after any required approval. Do not start another build to promote it. Otherwise verify the live-target build actually activated. Confirm the exact version is current on the live channel and its page serves the expected profile and assets. Check requested access and principal links. Inspect its exact-version preview and main interaction. A ready preview is not live. Report superseded, failed, or pending publication accurately.
10. Return the live URL, exact deployed version, what passed, and any remaining limits. Retain a local `.bio-pages/deployment.json` receipt with the verified team ID, Space ID, live URL, source commit, and deployment version only. Never store tokens. Continue future edits on this Space rather than creating another.

The initial source plan conservatively limits inline operations to 100 files, 1 MiB per encoded file, and 4 MiB combined contents. If the source exceeds those limits, choose the supported source-workspace file-upload flow after reading its current schema. Do not omit necessary files or send a user to manual packaging.

## Existing-page updates

Resolve the requested Space using the saved receipt or verified live URL, then read its work mode, source connection, current head, pending task workspaces, and current deployment. Reuse only this task's established workspace. For hosted source, read complete target files at one pinned source revision, apply the smallest change in a source workspace, inspect and stage the exact diff, then commit with the latest revision guard.

Do not overwrite the whole site using the new-page plan, rebuild editable source from served files, or discard another task's changes. A browser draft can be stale: its update prompt includes changed-field before/after values relative to the profile originally loaded. Compare those with current source before applying them, preserve unchanged remote fields, and resolve conflicting edits rather than replacing the remote JSON with the full draft. Connected upstream repositories may be read-only through Spacefast source tools; use their authorized upstream workflow rather than pretending those tools write back to GitHub.

Test the changed source. If the commit already triggered a build, follow it rather than creating another. Otherwise build the exact saved commit and publish only when the user's update request includes publication. Preserve the Space URL and access. Confirm the final live content, not just a successful API response.

If the user wants content-only help without publication, stop at the requested draft. The workflow's ability to publish is not blanket permission for unrelated future updates.

## Form editing without an AI run

The optional `?edit=1` editor supports local changes and preview. The user can prepare a profile there and copy a complete launch request for a connected AI assistant. The primary product workflow is the AI-run setup above. JSON import/export remains an advanced backup tool, not a required publishing step.

Direct authenticated saving from the public form is not implemented. On 2026-11-11, the demo team's `createSpaceContentAdminLink` request returned `feature_unavailable` (422): managed content was unavailable. Do not retry through credentials, enable feature flags, or advertise no-AI remote saving in that state.

For a future team with managed content available, read `recipes/zero-content` and the current Zero v2 docs before a separately tested migration. Static `profile.json` is not a native collection. Verify the native dashboard and AI edits use the same managed record, preserve newer human edits, and change the live frontend before advertising that integration. A content-admin link is one-use and expires after ten minutes; never embed it or account credentials in frontend source.

## Current verification status

The November 13 source reconciliation adds the BioPage name, a fictional public sample, explicit copy-versus-update destinations, stale-draft notices, unsaved-edit protection, and clipboard fallback selection. The public source is separate from the private demo: a GitHub push does not redeploy that Space. The original ten-layout Pen design remains a design artifact; this implementation contains three layouts, not ten.

On 2026-11-11, the private demo was created, all 36 source files were saved through a hosted source workspace, the exact-commit cloud build succeeded, and its version was verified as current on the live channel. The served profile and desktop rendering were inspected. Local formatting, 27 Node tests, 18 DOM tests, profile validation, and production build passed before deployment.

Local Playwright could not launch Chromium because the environment refused its socket setup. Desktop inspection succeeded through the existing signed-in browser and the version screenshot service; mobile rendering and interactive browser checks remain incomplete. Native no-AI live saving is unavailable as described above. Distinguish these gaps from the verified publication flow, and verify each later source update and deployment independently.

Public platform reference: [Spacefast publishing](https://spacefast.com/docs/publish/) and [repository publishing](https://spacefast.com/docs/git/). Current connected tool schemas are authoritative for operation arguments and returned identifiers.
