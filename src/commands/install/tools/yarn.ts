import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

const recipe = mise('yarn');

export default defineTool({
  id: 'yarn',
  stage: 2,
  tags: ['runtimes'],
  darwin: recipe,
  linux: recipe,
});
