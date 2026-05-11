import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Type, type Static } from "typebox";
import Ajv from "ajv";

// ── Schemas ──────────────────────────────────────────────────

const GraphContextSchema = Type.Object({
  nodeSchemas: Type.Array(Type.String()),
  relationshipSchemas: Type.Array(Type.String()),
  seedFiles: Type.Array(Type.String()),
  queryTemplates: Type.Array(Type.String()),
  cliTools: Type.Array(Type.String()),
});
type GraphContext = Static<typeof GraphContextSchema>;

const HookOutputSchema = Type.Object({
  hookSpecificOutput: Type.Object({
    hookEventName: Type.Literal("SessionStart"),
    additionalContext: Type.String({ minLength: 1 }),
  }),
});
type HookOutput = Static<typeof HookOutputSchema>;

// ── Path resolution ──────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT ?? resolve(__dirname, "../..");
const projectDir =
  process.env.CLAUDE_PROJECT_DIR ?? resolve(pluginRoot, "../..");

const schemasDir = join(projectDir, "src", "schemas");
const cypherDir = join(projectDir, "cypher");

// ── Data collectors ──────────────────────────────────────────

function extractSchemaNames(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  return Array.from(
    content.matchAll(/export\s+const\s+(\w+)\s*=\s*Type\.Object/g),
    (m) => m[1],
  );
}

function listCypherFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".cypher"))
    .sort();
}

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

const ajv = new Ajv({ allErrors: true });

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
