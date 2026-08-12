import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

const recipe = mise('pnpm');

export default defineTool({
  id: 'pnpm',
  stage: 2,
  tags: ['runtimes'],
  darwin: recipe,
  linux: recipe,
});
