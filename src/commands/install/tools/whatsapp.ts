import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { unsupported } from '../../../tool/unsupported';

export default defineTool({
  id: 'whatsapp',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('whatsapp'),
  linux: unsupported('sem cliente Linux oficial'),
});
