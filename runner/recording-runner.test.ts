import { describe, expect, test } from 'bun:test';
import { RecordingRunner } from './recording-runner';

describe('RecordingRunner', () => {
  test('records every command run against it, in order', async () => {
    const runner = new RecordingRunner();

    await runner.run(['brew', 'install', '--cask', 'slack']);
    await runner.run(['brew', 'list', '--cask', 'slack']);

    expect(runner.commands).toEqual([
      ['brew', 'install', '--cask', 'slack'],
      ['brew', 'list', '--cask', 'slack'],
    ]);
  });

  test('always resolves as a success, since it never actually runs anything', async () => {
    const runner = new RecordingRunner();

    const result = await runner.run(['apt', 'install', '-y', 'does-not-exist']);

    expect(result).toEqual({ exitCode: 0, stdout: '', stderr: '' });
  });
});
