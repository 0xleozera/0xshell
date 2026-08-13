import { defineTool } from '../../../tool/define-tool';
import { dmg } from '../../../helpers/dmg';
import { unsupported } from '../../../tool/unsupported';

export default defineTool({
  id: 'dia',
  stage: 3,
  tags: ['apps'],
  // No Homebrew cask for Dia — the .dmg is the only distribution.
  darwin: dmg({ url: 'https://diabrowser.com/download/dia.dmg', appName: 'Dia' }),
  linux: unsupported('sem cliente Linux, apenas macOS'),
});
