import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { unsupported } from '../../../tool/unsupported';

export default defineTool({
  id: 'logitech-g-hub',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('logitech-g-hub'),
  linux: unsupported('sem cliente Linux oficial'),
});
