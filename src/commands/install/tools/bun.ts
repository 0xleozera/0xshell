import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

const recipe = mise('bun');

export default defineTool({
  id: 'bun',
  stage: 2,
  tags: ['runtimes'],
  darwin: recipe,
  linux: recipe,
});
