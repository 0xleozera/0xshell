import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

const recipe = mise('node');

export default defineTool({
  id: 'node',
  stage: 2,
  tags: ['runtimes'],
  darwin: recipe,
  linux: recipe,
});
