import { readFile, writeFile } from "node:fs/promises";
import { parseProfile } from "../src/profile.js";
import { injectMetadata } from "./metadata.js";
const profile = parseProfile(
  await readFile(new URL("../public/profile.json", import.meta.url), "utf8"),
);
const file = new URL("../dist/index.html", import.meta.url);
await writeFile(file, injectMetadata(await readFile(file, "utf8"), profile));
console.log(
  "Built static search and social metadata from public/profile.json.",
);
