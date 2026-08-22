import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import docker from './docker';

describe('docker tool', () => {
  test('darwin installs the Desktop cask — engine, compose, buildx and GUI in one', async () => {
    const runner = createMockRunner();

    await docker.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'docker-desktop']]);
  });

  test('linux derives distro and codename from /etc/os-release, then installs engine + compose + buildx as one apt call', async () => {
    const runner = createMockRunner();

    await docker.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        '. /etc/os-release && curl -fsSL https://download.docker.com/linux/$ID/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        '. /etc/os-release && echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'docker-ce', 'docker-ce-cli', 'containerd.io', 'docker-buildx-plugin', 'docker-compose-plugin'],
    ]);
  });

  test('linux requires privilege', () => {
    expect(docker.linux.requiresPrivilege).toBe(true);
  });

  test('linux uninstall removes every package it installed', async () => {
    const runner = createMockRunner();

    await docker.linux.uninstall(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'apt', 'remove', '-y', 'docker-ce', 'docker-ce-cli', 'containerd.io', 'docker-buildx-plugin', 'docker-compose-plugin'],
    ]);
  });

  test('linux isInstalled checks dpkg for docker-ce', async () => {
    const runner = createMockRunner();
    runner.respondTo(['dpkg', '-s', 'docker-ce'], { exitCode: 0 });

    expect(await docker.linux.isInstalled(runner)).toBe(true);
  });
});
