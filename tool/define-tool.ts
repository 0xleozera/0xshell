import { z } from 'zod';
import type { Recipe } from './recipe';
import { isUnsupported, type Unsupported } from './unsupported';

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

/**
 * Schema for a Tool (ADR-0002). Cada Plataforma (`darwin`, `linux`) resolve
 * para um Recipe ou para `unsupported(motivo)`. `stage` (0–3) fixa a ordem
 * de execução — gerenciador de pacotes → mise → runtimes → apps/CLIs — no
 * lugar de um grafo de dependências (issue #4).
 */
const toolSchema = z.object({
  id: z.string().min(1, 'id não pode ser vazio'),
  stage: z.number().int().min(0).max(3),
  darwin: platformEntrySchema,
  linux: platformEntrySchema,
});

export type Tool = z.infer<typeof toolSchema>;

/**
 * Validates a Tool definition against the schema. Throws on a bad shape.
 * Generic over the input so each Tool module keeps its concrete Recipe /
 * Unsupported types per Plataforma instead of widening to the union.
 */
export function defineTool<T extends Tool>(definition: T): T {
  return toolSchema.parse(definition) as T;
}
