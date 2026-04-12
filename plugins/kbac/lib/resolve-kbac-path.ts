/**
 * Canonical kbac-path resolution helper.
 *
 * Used as the reference implementation for the validation logic the
 * `kbac-init` skill performs in Phase 5 (CLI Path Setup) and that the
 * `/kbac` slash command expects on lookup. Hooks and slash commands do
 * not import this file directly today — it lives here so the contract
 * is testable (`__tests__/resolve-kbac-path.test.ts`) and so future
 * runtime callers (e.g., a JS-rewritten kbac-session-context hook) can
 * import a single canonical resolver instead of duplicating the rules.
 *
 * Precedence: `$KBAC_PROJECT_PATH` env var > settings file
 * (`.claude/kbac.local.md`). Throws a descriptive error if neither
 * yields a valid kbac repo — there is no implicit default. Validates
 * that the candidate carries `bin/kbac`, `package.json`, and a
 * `cypher/` directory.
 */
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
  const safeStat = (p: string): ReturnType<typeof statSync> | null => {
    try {
      return statSync(p);
    } catch {
      return null;
    }
  };

  if (!existsSync(candidate)) {
    return { ok: false, reason: `path does not exist: ${candidate}` };
  }
  const candidateStat = safeStat(candidate);
  if (!candidateStat || !candidateStat.isDirectory()) {
    return { ok: false, reason: `path is not a directory: ${candidate}` };
  }
  const wrapper = join(candidate, "bin", "kbac");
  const wrapperStat = safeStat(wrapper);
  if (!wrapperStat || !wrapperStat.isFile()) {
    return { ok: false, reason: `missing or invalid bin/kbac at: ${candidate}` };
  }
  if (!existsSync(join(candidate, "package.json"))) {
    return { ok: false, reason: `missing package.json at: ${candidate}` };
  }
  const cypherPath = join(candidate, "cypher");
  const cypherStat = safeStat(cypherPath);
  if (!cypherStat || !cypherStat.isDirectory()) {
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
