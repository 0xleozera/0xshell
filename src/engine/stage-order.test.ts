import { describe, expect, test } from 'bun:test';
import { defineTool, type Tool } from '../tool/define-tool';
import { unsupported } from '../tool/unsupported';
import { sortByStage } from './stage-order';

function tool(id: string, stage: 0 | 1 | 2 | 3): Tool {
  return defineTool({ id, stage, tags: [], darwin: unsupported('teste'), linux: unsupported('teste') });
}

describe('sortByStage', () => {
  test('orders ascending by default, regardless of input order', () => {
    const tools = [tool('apps', 3), tool('brew', 0), tool('runtimes', 2), tool('mise', 1)];

    expect(sortByStage(tools).map((t) => t.id)).toEqual(['brew', 'mise', 'runtimes', 'apps']);
  });

  test('preserves the original relative order within the same stage (stable sort)', () => {
    const tools = [tool('slack', 3), tool('raycast', 3), tool('warp', 3)];

    expect(sortByStage(tools).map((t) => t.id)).toEqual(['slack', 'raycast', 'warp']);
  });

  test('orders descending when asked, for uninstall to tear down in reverse (#11)', () => {
    const tools = [tool('brew', 0), tool('mise', 1), tool('apps', 3)];

    expect(sortByStage(tools, 'desc').map((t) => t.id)).toEqual(['apps', 'mise', 'brew']);
  });

  test('does not mutate the input array', () => {
    const tools = [tool('apps', 3), tool('brew', 0)];
    const original = [...tools];

    sortByStage(tools);

    expect(tools).toEqual(original);
  });
});
