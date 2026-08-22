import { script } from '../helpers/script';
import { defineTool, unsupported } from '../tool';

export default defineTool({
  id: 'homebrew',
  stage: 0,
  tags: ['cli'],
  darwin: script({
    url: 'https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh',
    uninstallCommand: ['sh', '-c', 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh | sh'],
    binName: 'brew',
  }),
  linux: unsupported('apt já vem instalado no sistema'),
});
