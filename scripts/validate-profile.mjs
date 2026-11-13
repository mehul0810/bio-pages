import { readFile } from "node:fs/promises";
import { parseProfile } from "../src/profile.js";
try {
  parseProfile(
    await readFile(new URL("../public/profile.json", import.meta.url), "utf8"),
  );
  console.log("BioPage profile is valid.");
} catch (error) {
  console.error(`Invalid public/profile.json: ${error.message}`);
  process.exitCode = 1;
}
