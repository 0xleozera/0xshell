import type { Runner } from '../../../runner/runner';
import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { custom } from '../../../helpers/custom';
import { runChecked } from '../../../helpers/run-checked';

const keyringPath = '/etc/apt/keyrings/docker.gpg';
const sourceListPath = '/etc/apt/sources.list.d/docker.list';
// Docker publishes one repo per distro (ubuntu, debian, ...) and per
// codename (jammy, noble, bookworm, ...) — never a single universal one. $ID
// and $VERSION_CODENAME are read from /etc/os-release at install time, the
// same source the official Docker docs source from, instead of a value fixed
// at Tool-definition time that would be wrong on anything but the one distro
// release it was written for.
const keyUrl = 'https://download.docker.com/linux/$ID/gpg';
const sourceLine = `deb [signed-by=${keyringPath}] https://download.docker.com/linux/$ID $VERSION_CODENAME stable`;
// Docker Engine + compose + buildx is five packages from one repo. aptRepo's
// packageName is a single string (see helpers/apt-repo.ts) — passing a
// space-joined name here would become one bad argv token, not five apt
// packages, since Command is argv, not a shell string. custom() rebuilds the
// same repo-setup shape aptRepo() uses, then installs every package in one
// `apt install` call (issue #10 — flagged in the PR rather than widening
// aptRepo's signature, since #11 depends on that Helper's current shape).
const packages = ['docker-ce', 'docker-ce-cli', 'containerd.io', 'docker-buildx-plugin', 'docker-compose-plugin'];

export default defineTool({
  id: 'docker',
  stage: 3,
  tags: ['apps', 'cli'],
  // docker-desktop bundles the engine, compose, buildx and the GUI.
  darwin: brewCask('docker-desktop'),
  linux: custom({
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'mkdir', '-p', '/etc/apt/keyrings']);
      await runChecked(runner, [
        'sudo',
        'sh',
        '-c',
        `. /etc/os-release && curl -fsSL ${keyUrl} | gpg --dearmor -o ${keyringPath}`,
      ]);
      await runChecked(runner, ['sudo', 'sh', '-c', `. /etc/os-release && echo "${sourceLine}" > ${sourceListPath}`]);
      await runChecked(runner, ['sudo', 'apt', 'update']);
      await runChecked(runner, ['sudo', 'apt', 'install', '-y', ...packages]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'apt', 'remove', '-y', ...packages]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', 'docker-ce']);
      return result.exitCode === 0;
    },
  }),
});
