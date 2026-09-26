import type { CliContext } from '../lib/context';
import type { Platform } from '../lib/platform';
import { sortByStage } from '../lib/stage-order';
import { isUnsupported, resolveForPlatform, type Tool } from '../lib/tool';
import type { ListInput } from '../schemas/commands';

/** One Catalog row, as `list` describes it: definition only, never machine state. */
export type ListedTool = {
  readonly id: string;
  readonly stage: number;
  readonly tags: readonly string[];
  readonly supported: boolean;
  readonly reason?: string;
};

export type ListResult = {
  readonly tools: readonly ListedTool[];
};

const NPM_NOTE = 'Note: npm ships with node — it is not a mise Tool and is not in the Catalog.';

function describeTool(tool: Tool, platform: Platform): ListedTool {
  const entry = resolveForPlatform(tool, platform);

  if (isUnsupported(entry)) {
    return { id: tool.id, stage: tool.stage, tags: tool.tags, supported: false, reason: entry.reason };
  }

  return { id: tool.id, stage: tool.stage, tags: tool.tags, supported: true };
}

export function formatToolRow(listed: ListedTool, platform: Platform): string {
  const tags = listed.tags.length > 0 ? listed.tags.join(', ') : '-';
  const support = listed.supported
    ? `✓ supported on ${platform}`
    : `⊘ not supported on ${platform}: ${listed.reason}`;

  return `${listed.id} [stage ${listed.stage}] [tags: ${tags}] ${support}`;
}

function closingMessage(total: number): string {
  return total === 1 ? '1 tool in the Catalog.' : `${total} tools in the Catalog.`;
}

/**
 * Prints the whole Catalog, one line per Tool, with Tag, Stage and support
 * on the current Platform. Purely definitional — it never calls
 * `isInstalled()`, so it never touches the machine.
 */
export function listCommand(_input: ListInput, ctx: CliContext): ListResult {
  const { reporter, platform } = ctx;
  const tools = sortByStage(ctx.catalog).map((tool) => describeTool(tool, platform));

  reporter.intro('0xshell list');

  // The whole Catalog goes out as one call, not one per Tool: a Reporter is
  // free to set each `line()` apart from the last (the interactive one puts
  // a blank rule between them), and twenty-two Tools spaced out like that
  // stop looking like a table. Sent together they stay one block — and,
  // line for line, it is the same text either way.
  if (tools.length > 0) {
    reporter.line(tools.map((listed) => formatToolRow(listed, platform)).join('\n'));
  }

  reporter.info(NPM_NOTE);
  reporter.outro(closingMessage(tools.length));

  return { tools };
}
