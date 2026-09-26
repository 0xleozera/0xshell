import { dmg } from '../helpers/dmg';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'dia',
  stage: 3,
  tags: ['apps'],
  // No Homebrew cask for Dia — the .dmg is the only distribution.
  darwin: dmg({ url: 'https://diabrowser.com/download/dia.dmg', appName: 'Dia' }),
  linux: unsupported('no Linux client, macOS only'),
});
