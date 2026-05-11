---
name: kbac-schemas
description: >
  Use when creating or modifying TypeBox schemas for Neo4j node labels or
  relationship types in src/schemas/, adding new graph entity types,
  updating the validation layer, or understanding the schema-first
  architecture. Guides the Nullable helper pattern, Static type extraction,
  AJV integration, and barrel export conventions.
---

# TypeBox Schema Authoring for kbac

## Overview

kbac uses TypeBox schemas as the single source of truth for both compile-time TypeScript types and runtime AJV validators. When adding new node labels or relationship types to the graph, define the schema FIRST — it drives everything else.

## When to Use

- Adding a new node label (e.g., Person, Project, Language)
- Adding a new relationship type with properties
- Modifying properties on an existing schema
- Understanding the schema → type → validator pipeline

## Schema-First Pipeline

```
TypeBox Schema  →  Static<typeof Schema>  →  createValidator(Schema)
   (source)         (compile-time type)       (runtime AJV validator)
```

The service layer (`src/db/neo4j-service.ts`) accepts an optional schema parameter on `executeRead`/`executeWrite` — when provided, query results are validated at runtime.

## Node Schema Pattern

All node schemas live in `src/schemas/nodes.ts`:

```typescript
import { Type, type Static, type TSchema } from "typebox";

// Helper — Neo4j returns null for unset properties
const Nullable = <T extends TSchema>(schema: T) =>
  Type.Union([schema, Type.Null()]);

export const YourNodeSchema = Type.Object({
  id: Type.String({ minLength: 1 }),           // required, uniqueness-constrained
  name: Type.String({ minLength: 1 }),          // required
  optionalProp: Type.Optional(Nullable(Type.String())), // nullable in Neo4j
});
export type YourNode = Static<typeof YourNodeSchema>;
```

Key rules:
- **Import from `'typebox'`** — not `'@sinclair/typebox'` (package was renamed)
- **`id` and `name` are always required** with `{ minLength: 1 }`
- **Optional properties use the double-wrap:** `Type.Optional(Nullable(Type.String()))`
  - `Type.Optional` — property may be absent from the object
  - `Nullable` — property may be present but `null`
  - Neo4j can return either state, so both are needed
- **Schema const uses `Schema` suffix:** `ToolSchema`, `ConceptSchema`
- **Type alias uses plain name:** `Tool`, `Concept`

## Relationship Schema Pattern

Relationship schemas live in `src/schemas/relationships.ts`:

```typescript
import { Type, type Static } from "typebox";

// Relationship WITH properties
export const YourRelProps = Type.Object({
  role: Type.String({ minLength: 1 }),
});
export type YourRel = Static<typeof YourRelProps>;

// Relationship WITHOUT properties
export const EmptyRelProps = Type.Object({});
export type EmptyRel = Static<typeof EmptyRelProps>;
```

Key rules:
- **Schema const uses `Props` suffix:** `DependsOnProps`, `UsesProps`
- **Type alias uses plain name:** `DependsOn`, `Uses`
- Empty-object schemas (`Type.Object({})`) are valid for property-less relationships

## Barrel Export

`src/schemas/index.ts` re-exports everything:

```typescript
export * from "./nodes.js";
export * from "./relationships.js";
```

If you add a new schema file (rare), update the barrel export.

## Using Validators in the Service Layer

```typescript
import { executeRead } from "../db/neo4j-service.js";
import { ToolSchema } from "../schemas/index.js";

// Results are validated against ToolSchema at runtime
const results = await executeRead(
  "MATCH (t:Tool {id: $id}) RETURN t { .* } AS tool",
  { id: "neo4j" },
  ToolSchema
);
```

The `createValidator` factory in `src/validation/validator.ts` compiles schemas into AJV validators with `allErrors: true`.

## Checklist for New Node Types

1. Define `YourNodeSchema` and `type YourNode` in `src/schemas/nodes.ts`
2. Add uniqueness constraint in `cypher/01-constraints.cypher`
3. Add range index on `.name` in `cypher/02-indexes.cypher` (if searchable)
4. Add seed data in a new `cypher/NN-seed-your-data.cypher` file
5. Run `yarn type-check` to verify
6. Run `yarn db:reset` to rebuild graph with new schema

## Existing Schemas Reference

**Nodes** (`src/schemas/nodes.ts`):
- `ToolSchema` → Tool: id, name, version?, type?, description?
- `ConceptSchema` → Concept: id, name, description?
- `DomainSchema` → Domain: id, name, category?, description?
- `SystemSchema` → System: id, name, version?, purpose?, description?

**Relationships** (`src/schemas/relationships.ts`):
- `DependsOnProps` → DependsOn: {type}
- `UsesProps` → Uses: {role}
- `ComposesWithProps` → ComposesWith: {pattern}
- `ImplementsProps` → Implements: {} (empty)
- `BelongsToProps` → BelongsTo: {} (empty)
- `AppliesProps` → Applies: {} (empty)
