import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveKbacPath } from "../resolve-kbac-path.js";

let validRepo: string;
let invalidRepo: string;
let settingsFile: string;
let prevEnv: string | undefined;

function makeValidRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "kbac-test-"));
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "cypher"));
  writeFileSync(join(dir, "package.json"), '{"name":"kbac"}');
  writeFileSync(join(dir, "bin", "kbac"), "#!/usr/bin/env bash\n");
  chmodSync(join(dir, "bin", "kbac"), 0o755);
  return dir;
}

describe("resolveKbacPath", () => {
  before(() => {
    validRepo = makeValidRepo();
    invalidRepo = mkdtempSync(join(tmpdir(), "kbac-test-bad-"));
    settingsFile = join(
      mkdtempSync(join(tmpdir(), "kbac-settings-")),
      "kbac.local.md",
    );
    prevEnv = process.env.KBAC_PROJECT_PATH;
  });

  after(() => {
    rmSync(validRepo, { recursive: true, force: true });
    rmSync(invalidRepo, { recursive: true, force: true });
    if (prevEnv === undefined) delete process.env.KBAC_PROJECT_PATH;
    else process.env.KBAC_PROJECT_PATH = prevEnv;
  });

  it("returns the env var value when set and valid", () => {
    process.env.KBAC_PROJECT_PATH = validRepo;
    const result = resolveKbacPath({ settingsFile });
    assert.equal(result, validRepo);
  });

  it("throws a descriptive error when env var is set but invalid", () => {
    process.env.KBAC_PROJECT_PATH = invalidRepo;
    assert.throws(
      () => resolveKbacPath({ settingsFile }),
      /invalid kbac path|bin\/kbac/i,
    );
  });

  it("falls back to settings file when env var is unset", () => {
    delete process.env.KBAC_PROJECT_PATH;
    writeFileSync(
      settingsFile,
      `---\nkbac_path: ${validRepo}\n---\n`,
    );
    const result = resolveKbacPath({ settingsFile });
    assert.equal(result, validRepo);
  });

  it("throws when both env var and settings file are unset", () => {
    delete process.env.KBAC_PROJECT_PATH;
    const missingFile = join(tmpdir(), "definitely-does-not-exist.md");
    assert.throws(
      () => resolveKbacPath({ settingsFile: missingFile }),
      /not configured|run \/kbac:kbac-init/i,
    );
  });

  it("prefers env var over settings file when both are set", () => {
    process.env.KBAC_PROJECT_PATH = validRepo;
    writeFileSync(
      settingsFile,
      `---\nkbac_path: ${invalidRepo}\n---\n`,
    );
    const result = resolveKbacPath({ settingsFile });
    assert.equal(result, validRepo);
  });
});
