# Spacefast integration

The intended experience is an AI-run launch, followed by AI-run updates at the same URL. The user supplies a brief and grants publication intent. The assistant handles setup and publishing through the connected tools, without a manual file-export workflow.

## Source ownership

For a new Bio Page, keep the complete React source in a Spacefast-hosted repository. This makes later content and layout edits possible without asking the user to create a GitHub repository or install a CLI. The verified path creates a Space, initializes hosted source through a source workspace, saves reviewed file operations with revision guards, configures build defaults, and builds the exact saved commit.

Use [AGENT-WORKFLOW.md](AGENT-WORKFLOW.md) for the sequence, checks, recovery rules, and receipt requirements. The prepared plan is an input to that workflow, not a deployment receipt.

Build settings are repository root `.`, install `npm ci`, build `npm run build`, output `dist`. Preserve the package lockfile. After publication, retain the actual Space ID, source commit, deployment version, and live URL. Do not invent these values from titles or slugs.

For existing hosted-source pages, use Spacefast source workspaces and revision guards. Preserve unrelated files and pending work. A source save, successful build, and live deployment are separate outcomes. If an automatic build already started, follow it rather than starting another.

For a deliberately Git-connected project, use its authorized upstream repository workflow. Do not assume Spacefast source operations can write into that GitHub repository.

## Authentication and approvals

A Spacefast login in a browser does not prove the assistant's Spacefast app connection is authenticated. If the connection requires reauthentication, use its supported reconnect flow. Do not copy browser tokens into source, ask for passwords in chat, or bypass a denied connector action through a CLI.

The assistant should ask only for a genuinely missing required detail or a required approval. An explicit create-and-publish request covers routine setup within that scope; it does not authorize unrelated public sharing, paid services, custom domains, permissions, or future changes. Keep new Spaces private unless public access was requested; preserve existing access.

## Honest editing boundary

The public form is a local preview, not a live administrative dashboard. Its launch prompt carries the draft to a capable connected assistant; the copy action does not run that assistant. JSON backups are optional. Direct authenticated saving from the form and cross-device draft synchronization are not implemented.

Spacefast's native content dashboard and content models are separate integrations. A static JSON file is not automatically a native CMS collection. Do not simulate a live save by embedding credentials or reporting a browser draft as published.

## Verification and remaining limits

Local tests cover content safety, form interactions, prompt generation, and the source-preparation plan. On 2026-11-11 the private demo completed hosted-source setup, configuration, exact-commit build, and verified live publication. The served profile and desktop layout were inspected. Those November 11 browser limits were subsequently addressed with real Chromium CI checks on November 13; see [current verification status](AGENT-WORKFLOW.md#current-verification-status). These source checks do not update the hosted demo.

The November 11 native content-admin request returned `feature_unavailable` (422): managed content is unavailable for the demo team. This blocks genuine no-AI remote saving, not AI source updates. No credential workaround or feature-setting change was made. Availability must be checked again for a different team, and any supported Zero collection migration needs its own build, security, and live-edit validation.

A read-only November 13 recheck found that the existing live version declares no Zero content model and has no app runtime. Team infrastructure settings expose hosting regions and PHP, not a managed-content entitlement. Therefore the older `feature_unavailable` result has not been replaced by a successful availability test. No new authentication link was created.

A genuine direct-edit path needs a separately authorized migration: confirm native managed-content availability, define a profile record and schema, bind the frontend to that record, use native signed-in ownership rather than a browser API key, preserve concurrent edits, and test actual saves through a deployment. The current static form cannot gain remote saving from a UI-only change. AI-operated source updates remain the supported path without a new backend or security decision.

Official references: [Content-model API](https://spacefast.com/docs/api/reference/spaces/getspacezerocontentmodel/) and [native content dashboard prerequisite](https://spacefast.com/docs/api/reference/spaces/createspacecontentadminlink/). Other references: [Publishing](https://spacefast.com/docs/publish/), [Publish from Git](https://spacefast.com/docs/git/), and [Quickstart](https://spacefast.com/docs/quickstart/). Always inspect current tool schemas before calling an operation.
