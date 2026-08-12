import { z } from 'zod';
import type { Recipe } from './recipe';

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

/**
 * Schema for a Tool (ADR-0002). Only `darwin` exists for now — the
 * per-platform union with `unsupported()` is #3, and `stage` is #4. Both
 * extend this schema; neither requires reshaping it.
 */
const toolSchema = z.object({
  id: z.string().min(1, 'id não pode ser vazio'),
  darwin: recipeSchema,
});

export type Tool = z.infer<typeof toolSchema>;

/** Validates a Tool definition against the schema. Throws on a bad shape. */
export function defineTool(definition: Tool): Tool {
  return toolSchema.parse(definition);
}
