# BioPage agent workflow

BioPage is an AI-operated template, not a file-export product. When the user asks to create and publish a page, own the complete setup through a verified live result. When they ask to update the live page, make the scoped source change and verify the redeployment. Do not hand routine packaging, repository setup, commands, or uploads back to the user.

Read `docs/AGENT-WORKFLOW.md` before Spacefast work. Use the current connected Spacefast tool schemas; the guide does not replace their authorization requirements. Ask only for genuinely blocking information or an approval the provider requires. Do not bypass sign-in or access restrictions.

The content source is `public/profile.json`. Native managed-content availability is team-dependent; never promise no-AI remote saving without verifying the integration. Read `src/profile.js` and `public/profile.schema.json` before changing its format. Preserve unrelated work. Never publish the fictional demo profile as the user's identity. Optional design choices can use Studio/Honey unless the user specifies otherwise.

Run `npm run check` and applicable real-browser checks before deployment. Use the exact final source and report anything not verified. A local check, source commit, ready build, and live deployment are distinct states. Never call a page live until the current version is confirmed.

For a new Space, prefer Spacefast-hosted editable source, which removes GitHub setup from the user's path. `npm run prepare:spacefast -- --team-id <verified ID>` runs the local checks and produces a source-workspace operation plan for the connected tools. It does not sign in, upload, or publish itself. Never use that initial full-source plan on an existing Space.

Keep credentials outside the frontend and source tree. Do not add a browser API key, pretend live-save button, payment backend, paid upgrade, or unrelated integration. The optional browser form is a local preview. Its launch-prompt button copies text; it does not execute an AI run.
