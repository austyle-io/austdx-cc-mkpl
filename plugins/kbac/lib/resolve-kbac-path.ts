import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ResolveOptions {
  /** Override the default settings-file location. Used by tests. */
  settingsFile?: string;
}

const DEFAULT_SETTINGS_FILE = fileURLToPath(
  new URL("../.claude/kbac.local.md", import.meta.url),
);

function validateRepo(candidate: string): { ok: true } | { ok: false; reason: string } {
  if (!existsSync(candidate)) {
    return { ok: false, reason: `path does not exist: ${candidate}` };
  }
  if (!statSync(candidate).isDirectory()) {
    return { ok: false, reason: `path is not a directory: ${candidate}` };
  }
  const wrapper = join(candidate, "bin", "kbac");
  if (!existsSync(wrapper)) {
    return { ok: false, reason: `missing bin/kbac at: ${candidate}` };
  }
  if (!existsSync(join(candidate, "package.json"))) {
    return { ok: false, reason: `missing package.json at: ${candidate}` };
  }
  if (!existsSync(join(candidate, "cypher"))) {
    return { ok: false, reason: `missing cypher/ directory at: ${candidate}` };
  }
  return { ok: true };
}

function readSettingsPath(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  const content = readFileSync(file, "utf-8");
  const match = content.match(/^kbac_path:\s*(.+)\s*$/m);
  return match?.[1]?.trim();
}

/**
 * Resolve the kbac repo path used by the plugin.
 *
 * Precedence: `$KBAC_PROJECT_PATH` env var > settings file
 * (`.claude/kbac.local.md`). Throws a descriptive error if neither
 * yields a valid kbac repo.
 *
 * "Valid" means the path exists, is a directory, and contains
 * `bin/kbac`, `package.json`, and a `cypher/` directory.
 */
export function resolveKbacPath(opts: ResolveOptions = {}): string {
  const settingsFile = opts.settingsFile ?? DEFAULT_SETTINGS_FILE;

  const envPath = process.env.KBAC_PROJECT_PATH;
  if (envPath) {
    const r = validateRepo(envPath);
    if (!r.ok) {
      throw new Error(`invalid kbac path from $KBAC_PROJECT_PATH: ${r.reason}`);
    }
    return envPath;
  }

  const settingsPath = readSettingsPath(settingsFile);
  if (settingsPath) {
    const r = validateRepo(settingsPath);
    if (!r.ok) {
      throw new Error(`invalid kbac path from ${settingsFile}: ${r.reason}`);
    }
    return settingsPath;
  }

  throw new Error(
    `kbac path not configured. Run /kbac:kbac-init to set up, or export $KBAC_PROJECT_PATH.`,
  );
}
