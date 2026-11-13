# BioPage

Your creator page, launched by your AI assistant. Choose a template, supply your content, and ask it to handle Spacefast setup through the verified live link.

## Start with one request

Give a capable AI assistant this repository and connect Spacefast, then say:

> Create and publish a public BioPage site on Spacefast for me. My name is Alex Rivera. I make illustrated field guides. My portfolio is https://example.com. Use Editorial in Sage. Handle setup, checks, and publication, and give me the live link.

The assistant follows [the end-to-end workflow](docs/AGENT-WORKFLOW.md): read your account and source, customize the page, retain editable source in Spacefast, configure the build, publish, and verify. You should not have to create a GitHub repository, package or upload files, or run commands yourself.

A connected account and source-capable assistant are prerequisites. Sign-in, an ambiguous team, missing personal details, or a required platform approval can pause the run. A prompt alone does not grant an ordinary chat execution capabilities. A private demo has completed hosted-source creation, cloud build, and verified live publication. See the verification limits in [the workflow guide](docs/AGENT-WORKFLOW.md#current-verification-status).

## Change it later

Tell the same connected assistant:

> Update my BioPage at [your live URL]. Replace the headline with “Illustrated guides for curious people,” add [your link], switch to Sage, and publish it.

The assistant should resolve that existing Space, read its source, make the requested changes, test, and verify the new live version at the same URL. No export/upload workflow is intended.

## Three templates, twelve looks

- **Studio:** a warm creator home.
- **Editorial:** a journal-like layout for stories and ideas.
- **Spotlight:** a bold introduction and focused links.

Each supports Honey, Sage, Rose, and Ink palettes. Content, social profiles, links, updates, external support buttons, and appearance live in `public/profile.json`. Layout changes do not require rewriting your content.

## Optional visual editor

Add `?edit=1` to the page URL to try content and design changes locally. The **Publish** panel prepares a complete launch/update request, including the current draft, for a connected AI assistant. Its copy button does not execute an AI or publish by itself. **Edit this page** preselects the current page as the update destination, without copying private URL parameters. **Make this yours** explicitly starts a new-page request. Local development also starts with no destination. You can review or change the destination before copying.

Stale drafts show a warning and retain their original baseline so an AI update can preserve newer remote edits. If fields are incomplete or browser storage fails, leaving the page triggers the browser’s unsaved-change warning.

Drafts remain in that browser. They do not change the public page, sync between devices, or save directly to Spacefast. JSON import/export is available under **Advanced** as a backup and portability tool, not a required launch step. There is no embedded AI account, frontend API key, payment backend, or authenticated form-to-CMS integration. At the demo verification on November 11, 2026, its native managed-content dashboard was unavailable; availability must be rechecked per team, so no-AI editing remains a local preview rather than a remote save.

The sample creator is fictional and its support/payment destination is disabled. Replace sample identity with real supplied content, or explicitly ask for a demo.

## For agents and developers

Read [AGENTS.md](AGENTS.md) and [docs/AGENT-WORKFLOW.md](docs/AGENT-WORKFLOW.md).

Use Node 22.22.2+ within 22.x, Node 24.15+, or a supported newer line.

```sh
npm ci
npm run check
npm run preview
```

`check` runs formatting, Node unit tests, jsdom interaction checks, validation, and the production build. Real-browser checks are separate:

```sh
npx playwright install chromium
npm run test:e2e
```

After verifying the Spacefast destination, prepare complete initial source operations:

```sh
npm run prepare:spacefast -- --team-id VERIFIED_TEAM_ID --access private
```

This command runs checks and produces a local source-operation plan. It does **not** authenticate or publish. The assistant uses the connected Spacefast tools to execute the remainder and verifies the result. Public access requires an explicit user request. The initial plan is only for a new empty Space, never a replacement upload for an existing site.

`npm run dev` remains available for development. `sf.jsonc` declares the Vite build. For users who deliberately choose their own Git-connected repository, retain that established upstream workflow; Spacefast's hosted-source tools do not write back to arbitrary GitHub repositories.

GitHub pushes run validation and browser CI only. The optional GitHub Pages deployment is **manual** (workflow_dispatch); pushing source does not publish a site.

## Portability and safety

- Profile content is public after publication. Never put credentials or private data in it.
- The JSON schema and runtime validator allow safe links and plain text. Legacy v1 profiles can be imported and reviewed before migration.
- Support buttons open the external provider supplied by the creator. BioPage does not process payments or subscriptions.
- The React source and static build remain portable; Spacefast is the default AI-operated deployment path, not a lock-in.

## Guides

- [Agent setup, publication, and future edits](docs/AGENT-WORKFLOW.md)
- [Spacefast integration and limits](docs/SPACEFAST.md)
- [AI content editing](docs/AI-EDITING.md)

Created by [Mehul Gohil](https://mehulgohil.com). Included demo SVGs are editable. DM Sans and Manrope are bundled under the SIL Open Font License.
