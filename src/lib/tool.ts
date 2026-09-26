import { z } from 'zod';
import type { Configuration } from './configuration';
import type { Platform } from './platform';
import type { Recipe } from './recipe';

/**
 * Declares that a Tool does not exist on a Platform. Reported with `⊘`
 * and its reason — never skipped silently (ADR-0002).
 */
export type Unsupported = {
  readonly unsupported: true;
  readonly reason: string;
};

export function unsupported(reason: string): Unsupported {
  return { unsupported: true, reason };
}

export function isUnsupported(value: unknown): value is Unsupported {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Unsupported).unsupported === true &&
    typeof (value as Unsupported).reason === 'string' &&
    (value as Unsupported).reason.length > 0
  );
}

function isRecipe(value: unknown): value is Recipe {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Recipe).install === 'function' &&
    typeof (value as Recipe).uninstall === 'function' &&
    typeof (value as Recipe).isInstalled === 'function'
  );
}

const recipeSchema = z.custom<Recipe>(isRecipe, {
  message: 'esperado um Recipe com install(), uninstall() e isInstalled()',
});

const unsupportedSchema = z.custom<Unsupported>(isUnsupported, {
  message: 'esperado um Unsupported com reason',
});

const platformEntrySchema = z.union([recipeSchema, unsupportedSchema]);

const configurationSchema = z.object({
  root: z.string().min(1, 'root não pode ser vazio'),
  files: z.array(z.object({ path: z.string().min(1), content: z.string() })).min(1),
  ownsRoot: z.boolean().optional(),
}) satisfies z.ZodType<Configuration>;

/**
 * Schema for a Tool (ADR-0002). Each Platform (`darwin`, `linux`) resolves
 * to a Recipe or to `unsupported(reason)`. `stage` (0–3) pins the execution
 * order — package manager → mise → runtimes → apps/CLIs — in place of a
 * dependency graph. `tags` groups Tools for `0xshell install --tag <tag>`
 * and produces no commands of its own. `configuration` is what `install`
 * writes once the Tool is present, on every Platform where it is supported
 * (ADR-0006).
 */
const toolSchema = z.object({
  id: z.string().min(1, 'id não pode ser vazio'),
  stage: z.number().int().min(0).max(3),
  tags: z.array(z.string()),
  darwin: platformEntrySchema,
  linux: platformEntrySchema,
  configuration: configurationSchema.optional(),
});

export type Tool = z.infer<typeof toolSchema>;

/**
 * Validates a Tool definition against the schema. Throws on a bad shape.
 * Generic over the input so each Tool module keeps its concrete Recipe /
 * Unsupported types per Platform instead of widening to the union.
 */
export function defineTool<T extends Tool>(definition: T): T {
  return toolSchema.parse(definition) as T;
}

export function resolveForPlatform(tool: Tool, platform: Platform): Recipe | Unsupported {
  return tool[platform];
}
