import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { deb, debFromGitHubRelease } from '../helpers/deb';

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
  linux: deb({
    packageName: 'orca-ide',
    download: debFromGitHubRelease('stablyai/orca', 'orca-ide_[^/"]+_amd64\\.deb'),
  }),
});
