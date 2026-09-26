import { brewCask } from '../helpers/brew-cask';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'claude',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('claude'),
  linux: unsupported('desktop app with no official Linux client'),
});
