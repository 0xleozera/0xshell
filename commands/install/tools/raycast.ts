import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { unsupported } from '../../../tool/unsupported';

export default defineTool({
  id: 'raycast',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('raycast'),
  linux: unsupported('sem cliente Linux, apenas macOS'),
});
