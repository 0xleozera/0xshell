import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

const recipe = mise('go');

export default defineTool({
  id: 'go',
  stage: 2,
  tags: ['runtimes'],
  darwin: recipe,
  linux: recipe,
});
