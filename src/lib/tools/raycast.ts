import { brewCask } from '../helpers/brew-cask';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'raycast',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('raycast'),
  linux: unsupported('no Linux client, macOS only'),
});
