import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { isDpkgInstalled } from '../helpers/apt';
import { aptGetInstall, aptGetRemove, aptGetUpdate } from '../helpers/apt-get';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

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
// `apt install` call.
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
        `. /etc/os-release && curl -fsSL ${keyUrl} | gpg --batch --yes --dearmor -o ${keyringPath}`,
      ]);
      await runChecked(runner, ['sudo', 'sh', '-c', `. /etc/os-release && echo "${sourceLine}" > ${sourceListPath}`]);
      try {
        await runChecked(runner, aptGetUpdate());
        await runChecked(runner, aptGetInstall(...packages));
      } catch (error) {
        // A source apt cannot read breaks every apt Tool after this one.
        await runner.run(['sudo', 'rm', '-f', sourceListPath, keyringPath]);
        throw error;
      }
    },
    async uninstall(runner: Runner): Promise<void> {
      // Images and volumes in /var/lib/docker stay: they are the user's data.
      // /opt/containerd is not: containerd creates it at runtime, empty, and
      // no package owns it.
      await runChecked(runner, aptGetRemove(...packages));
      await runChecked(runner, ['sudo', 'rm', '-rf', sourceListPath, keyringPath, '/opt/containerd']);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      return isDpkgInstalled(runner, 'docker-ce');
    },
  }),
});
