import { brewCask } from '../helpers/brew-cask';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'claude',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('claude'),
  linux: unsupported('app desktop sem cliente Linux oficial'),
});
