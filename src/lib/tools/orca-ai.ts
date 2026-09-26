import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { isDpkgInstalled } from '../helpers/apt';
import { aptGetInstall, aptGetRemove } from '../helpers/apt-get';
import { brewCask } from '../helpers/brew-cask';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

const packageName = 'orca-ide';
const debPath = '/tmp/0xshell-orca-ide.deb';
const releases = 'https://github.com/stablyai/orca/releases';

// The .deb carries the version in its file name, so the latest one is found
// by following the /releases/latest redirect to its tag (v1.4.212) — no API
// call, so no rate limit.
const downloadScript =
  `set -eu; tag=$(curl -fsSLI -o /dev/null -w '%{url_effective}' ${releases}/latest); ` +
  `version=\${tag##*/v}; ` +
  `curl -fsSL ${releases}/download/v\${version}/${packageName}_\${version}_amd64.deb -o ${debPath}`;

export default defineTool({
  id: 'orca-ai',
  stage: 3,
  tags: ['apps'],
  // The core `orca` cask is Plotly's Orca, deprecated and disabled from
  // 2026-09-01 — never use it. This is the project's own tap.
  darwin: brewCask('stablyai/orca/orca'),
  // The project's own .deb, from its GitHub releases: it brings the desktop
  // entry and the dependencies an AppImage would leave to the user (FUSE).
  // Checked by package, not by `command -v orca`: that name belongs to the
  // GNOME screen reader every Ubuntu desktop ships.
  linux: custom({
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sh', '-c', downloadScript]);
      try {
        await runChecked(runner, aptGetInstall(debPath));
      } finally {
        await runner.run(['rm', '-f', debPath]);
      }
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, aptGetRemove(packageName));
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      return isDpkgInstalled(runner, packageName);
    },
  }),
});
