import { brewCask } from '../helpers/brew-cask';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'logitech-g-hub',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('logitech-g-hub'),
  linux: unsupported('no official Linux client'),
});
