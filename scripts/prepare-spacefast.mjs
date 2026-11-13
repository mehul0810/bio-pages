import { readFile, readdir, mkdir, writeFile, lstat } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseProfile } from "../src/profile.js";

const rootFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.js",
  "vitest.config.js",
  "playwright.config.js",
  "sf.jsonc",
  ".gitignore",
  ".prettierignore",
];
const rootDirectories = [
  "src",
  "public",
  "scripts",
  "tests",
  "docs",
  ".github",
];
const secretPath =
  /(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.netrc$|id_rsa$|id_ed25519$)|\.(?:pem|key|p12|pfx)$/i;
const textExtensions = /\.(?:jsx?|mjs|cjs|jsonc?|md|html|css|svg|ya?ml|txt)$/i;
const allowedExtensions = {
  src: /\.(?:jsx?|tsx?|css|scss|json|svg)$/i,
  public: /\.(?:json|svg|png|jpe?g|webp|avif|ico|woff2?|txt|xml)$/i,
  scripts: /\.(?:mjs|cjs|js)$/i,
  tests: /\.(?:mjs|jsx?|json)$/i,
  docs: /\.md$/i,
  ".github": /\.(?:ya?ml|md)$/i,
};

export async function buildSourcePlan(
  root,
  { teamId, access = "private" } = {},
) {
  if (typeof teamId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(teamId))
    throw new Error(
      "Pass the exact team ID verified through Spacefast getAccount.",
    );
  if (!["private", "team", "public"].includes(access))
    throw new Error(
      "Access must be private, team, or public. Public requires the user's explicit request.",
    );
  const paths = [...rootFiles];
  async function visit(directory) {
    if ((await lstat(join(root, directory))).isSymbolicLink())
      throw new Error(`Do not publish a symlink: ${directory}`);
    for (const entry of await readdir(join(root, directory), {
      withFileTypes: true,
    })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink())
        throw new Error(`Do not publish a symlink: ${path}`);
      if (secretPath.test(path))
        throw new Error(
          `Potential credential file excluded: ${path}. Remove it from publishable source.`,
        );
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        if (!allowedExtensions[path.split("/")[0]].test(path))
          throw new Error(`Unexpected source file needs review: ${path}`);
        paths.push(path);
      }
    }
  }
  for (const directory of rootDirectories) await visit(directory);
  if (paths.length > 100)
    throw new Error(
      "Initial source exceeds the 100-operation limit. Use the supported workspace upload flow; do not silently omit files.",
    );
  const profile = parseProfile(
    await readFile(join(root, "public/profile.json"), "utf8"),
  );
  let bytes = 0;
  const hashes = [];
  const operations = [];
  for (const path of paths.sort()) {
    if ((await lstat(join(root, path))).isSymbolicLink())
      throw new Error(`Do not publish a symlink: ${path}`);
    const content = await readFile(join(root, path));
    const encoding =
      textExtensions.test(path) ||
      path.startsWith(".gitignore") ||
      path === ".prettierignore"
        ? "utf8"
        : "base64";
    const contents = content.toString(encoding);
    const size = Buffer.byteLength(contents);
    if (size > 1048576)
      throw new Error(`Source file exceeds the inline limit: ${path}`);
    bytes += size;
    hashes.push({
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
      size: content.length,
    });
    operations.push({ action: "upsert", path, contents, encoding });
  }
  if (bytes > 4 * 1024 * 1024)
    throw new Error(
      "Source exceeds the 4 MiB inline limit. Use the supported workspace upload flow.",
    );
  return {
    formatVersion: 2,
    purpose:
      "Initial source for a NEW Space only. This plan does not perform network actions.",
    requiresReviewBeforeUpload:
      "Inspect every source file for credentials and private data. Filename and extension filters are not a content-secret scan.",
    createSpace: {
      body: { teamId, title: `${profile.name} · BioPage`, access },
    },
    sourceWorkspace: {
      name: "Set up BioPage",
      targetBranch: "main",
    },
    initialSource: { operations },
    buildSettings: {
      rootDirectory: ".",
      installCommand: "npm ci",
      buildCommand: "npm run build",
      outputDirectory: "dist",
    },
    liveTarget: { channel: "live", preview: false },
    sourceManifest: hashes,
    encodedBytes: bytes,
    next: "Use current Spacefast tool schemas. Create the new Space; create a named source workspace with a unique operationId; configure hosted build settings with autoDeploy off; edit initialSource.operations using the returned workspace revision; inspect, stage and commit; build the exact saved commit and verify live. Never invent response IDs or use this full-source plan to overwrite an existing site.",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !["--team-id", "--access", "--output"].includes(args[i]) ||
      !args[i + 1]
    )
      throw new Error(
        "Usage: npm run prepare:spacefast -- --team-id TEAM_ID [--access private|team|public] [--output FILE]",
      );
    options[args[i]] = args[i + 1];
  }
  const root = fileURLToPath(new URL("..", import.meta.url));
  const output = resolve(
    root,
    options["--output"] || ".bio-pages/spacefast-source-plan.json",
  );
  if (
    !relative(root, output).startsWith(`.bio-pages/`) ||
    !output.endsWith(".json")
  )
    throw new Error(
      "Keep the JSON plan inside the project's .bio-pages directory.",
    );
  const plan = await buildSourcePlan(root, {
    teamId: options["--team-id"],
    access: options["--access"],
  });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(
    `Prepared ${plan.initialSource.operations.length} source files (${plan.encodedBytes} bytes). No network action performed. Plan: ${output}`,
  );
}
