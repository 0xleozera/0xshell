import { brewCask } from '../../../helpers/brew-cask';
import { defineTool } from '../../../tool/define-tool';

export default defineTool({
  id: 'slack',
  darwin: brewCask('slack'),
});
