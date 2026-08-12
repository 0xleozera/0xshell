import { describe, expect, test } from 'bun:test';
import { aptRepo } from '../helpers/apt-repo';
import { brewCask } from '../helpers/brew-cask';
import { defineTool } from './define-tool';
import { resolveForPlatform } from './resolve-for-platform';
import { isUnsupported, unsupported } from './unsupported';

describe('resolveForPlatform', () => {
  test('resolves the darwin recipe on darwin and the linux recipe on linux', () => {
    const tool = defineTool({
      id: 'slack',
      darwin: brewCask('slack'),
      linux: aptRepo({
        repo: 'deb https://packagecloud.io/slacktechnologies/slack/debian/ jessie main',
        packageName: 'slack-desktop',
      }),
    });

    expect(resolveForPlatform(tool, 'darwin')).toBe(tool.darwin);
    expect(resolveForPlatform(tool, 'linux')).toBe(tool.linux);
  });

  test('resolves to Unsupported with the reason preserved', () => {
    const tool = defineTool({
      id: 'xcode',
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });

    const entry = resolveForPlatform(tool, 'linux');

    expect(isUnsupported(entry)).toBe(true);
    expect(entry).toEqual({ unsupported: true, reason: 'ferramenta exclusiva da Apple' });
  });
});
