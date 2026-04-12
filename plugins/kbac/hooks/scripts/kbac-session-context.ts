/**
 * kbac SessionStart hook.
 *
 * Collects schema, seed, query, and CLI-tool context from the surrounding
 * kbac project and emits a Claude Code `SessionStart` hook payload on stdout.
 * Inputs come from the project layout (`src/schemas/`, `cypher/`,
 * `cypher/queries/`) and from `$PATH` (modern CLI tool detection).
 *
 * The output payload is validated against {@link HookOutputSchema} before
 * being printed so malformed hook payloads cannot reach Claude Code.
 *
 * Environment variables consumed:
 * - `CLAUDE_PLUGIN_ROOT` — absolute path to the plugin root (provided by
 *   Claude Code; falls back to the script's `../..`).
 * - `CLAUDE_PROJECT_DIR` — absolute path to the user's project (falls back
 *   to two directories above the plugin root).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Type, type Static } from "typebox";
import Ajv from "ajv";

// ── Schemas ─────────────────────────────────

/**
 * Shape of the graph context that the hook collects from the kbac project.
 *
 * Each array is populated independently and may be empty when the
 * corresponding source (schemas, cypher files, tools) is missing.
 */
const GraphContextSchema = Type.Object({
  nodeSchemas: Type.Array(Type.String()),
  relationshipSchemas: Type.Array(Type.String()),
  seedFiles: Type.Array(Type.String()),
  queryTemplates: Type.Array(Type.String()),
  cliTools: Type.Array(Type.String()),
});
type GraphContext = Static<typeof GraphContextSchema>;

/**
 * Shape of the SessionStart hook payload accepted by Claude Code.
 *
 * `additionalContext` is a non-empty human-readable summary that Claude
 * sees at the start of the session.
 */
const HookOutputSchema = Type.Object({
  hookSpecificOutput: Type.Object({
    hookEventName: Type.Literal("SessionStart"),
    additionalContext: Type.String({ minLength: 1 }),
  }),
});
type HookOutput = Static<typeof HookOutputSchema>;

// ── Path resolution ─────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT ?? resolve(__dirname, "../..");
const projectDir =
  process.env.CLAUDE_PROJECT_DIR ?? resolve(pluginRoot, "../..");

const schemasDir = join(projectDir, "src", "schemas");
const cypherDir = join(projectDir, "cypher");

// ── Data collectors ─────────────────────────────

/**
 * Extracts the names of TypeBox object schemas declared in a TypeScript file.
 *
 * Matches the source-level pattern `export const <Name> = Type.Object` so it
 * works without a TypeScript parser. Returns an empty array if the file
 * does not exist, allowing the hook to remain best-effort on partial setups.
 *
 * @param filePath Absolute path to a `.ts` file expected to declare schemas.
 * @returns Schema identifier names in declaration order; empty if none found.
 */
function extractSchemaNames(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  return Array.from(
    content.matchAll(/export\s+const\s+(\w+)\s*=\s*Type\.Object/g),
    (m) => m[1],
  );
}

/**
 * Lists `.cypher` files directly inside a directory (non-recursive).
 *
 * Results are sorted lexicographically so numbered seed files appear in
 * their execution order. Returns an empty array if the directory does not
 * exist.
 *
 * @param dir Absolute path to a directory that may contain `.cypher` files.
 * @returns Sorted list of basenames ending in `.cypher`.
 */
function listCypherFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".cypher"))
    .sort();
}

/**
 * Detects which modern CLI tools are available on `$PATH`.
 *
 * Probes `rg`, `fd`, `sd`, `jq`, and `yq` via `which`. Anything missing is
 * silently dropped so the hook never fails on a partially-configured
 * machine; downstream consumers should treat the result as a hint.
 *
 * @returns Names of detected tools, in the canonical probe order.
 */
function detectCliTools(): string[] {
  return ["rg", "fd", "sd", "jq", "yq"].filter((tool) => {
    try {
      execFileSync("which", [tool], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  });
}

// ── Main ─────────────────────────────────────────────────────

const ajv = new Ajv({ allErrors: true, strict: false });

const context: GraphContext = {
  nodeSchemas: extractSchemaNames(join(schemasDir, "nodes.ts")),
  relationshipSchemas: extractSchemaNames(
    join(schemasDir, "relationships.ts"),
  ),
  seedFiles: listCypherFiles(cypherDir),
  queryTemplates: existsSync(join(cypherDir, "queries"))
    ? listCypherFiles(join(cypherDir, "queries")).map((f) =>
        f.replace(/\.cypher$/, ""),
      )
    : [],
  cliTools: detectCliTools(),
};

const validateContext = ajv.compile<GraphContext>(GraphContextSchema);
if (!validateContext(context)) {
  process.stderr.write(
    JSON.stringify({
      error: "context validation failed",
      details: validateContext.errors,
    }),
  );
  process.exit(2);
}

const parts: string[] = [];
if (context.nodeSchemas.length)
  parts.push(`Node schemas: ${context.nodeSchemas.join(",")}`);
if (context.relationshipSchemas.length)
  parts.push(
    `Relationship schemas: ${context.relationshipSchemas.join(",")}`,
  );
if (context.seedFiles.length)
  parts.push(`Seed files: ${context.seedFiles.join(",")}`);
if (context.queryTemplates.length)
  parts.push(`Query templates: ${context.queryTemplates.join(",")}`);
if (context.cliTools.length)
  parts.push(`CLI tools: ${context.cliTools.join(",")}`);

if (parts.length === 0) {
  console.log("{}");
  process.exit(0);
}

const output: HookOutput = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: `kbac graph schema — ${parts.join(". ")}.`,
  },
};

const validateOutput = ajv.compile<HookOutput>(HookOutputSchema);
if (!validateOutput(output)) {
  process.stderr.write(
    JSON.stringify({
      error: "output validation failed",
      details: validateOutput.errors,
    }),
  );
  process.exit(2);
}

console.log(JSON.stringify(output));
