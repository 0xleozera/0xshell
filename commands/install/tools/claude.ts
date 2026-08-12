import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { unsupported } from '../../../tool/unsupported';

export default defineTool({
  id: 'claude',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('claude'),
  linux: unsupported('app desktop sem cliente Linux oficial'),
});
