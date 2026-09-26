import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { deb } from '../helpers/deb';

const releases = 'https://github.com/stablyai/orca/releases';

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
  //
  // The .deb carries the version in its file name, so the latest one is
  // found by following the /releases/latest redirect to its tag (v1.4.212) —
  // no API call, so no rate limit.
  linux: deb({
    packageName: 'orca-ide',
    download:
      `tag=$(curl -fsSLI -o /dev/null -w '%{url_effective}' ${releases}/latest); version=\${tag##*/v}; ` +
      `curl -fsSL ${releases}/download/v\${version}/orca-ide_\${version}_amd64.deb -o "$1"`,
  }),
});
