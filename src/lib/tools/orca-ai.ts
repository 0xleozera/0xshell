import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { appImage } from '../helpers/app-image';

export default defineTool({
  id: 'orca-ai',
  stage: 3,
  tags: ['apps'],
  // The core `orca` cask is Plotly's Orca, deprecated and disabled from
  // 2026-09-01 — never use it. This is the project's own tap.
  darwin: brewCask('stablyai/orca/orca'),
  linux: appImage({
    url: 'https://download.stably.ai/orca/Orca.AppImage',
    binName: 'orca',
  }),
});
