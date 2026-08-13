import type { Recipe } from '../tool/recipe';

/**
 * Escape hatch for a Tool that doesn't fit any other Helper (ADR-0002): the
 * Tool module supplies `install`, `uninstall` and `isInstalled` directly,
 * still running everything through the given Runner.
 */
export function custom(recipe: Recipe): Recipe {
  return recipe;
}
