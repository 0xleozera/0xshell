import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { brewFormula } from '../helpers/brew-formula';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

const packageName = 'carapace-bin';
const sourceListPath = '/etc/apt/sources.list.d/fury.list';
// The repository carapace documents for Debian/Ubuntu is unsigned, so
// aptRepo() — which requires a signing key — does not fit.
const sourceLine = 'deb [trusted=yes] https://apt.fury.io/rsteube/ /';

export default defineTool({
  id: 'carapace',
  stage: 3,
  tags: ['cli', 'shell'],
  darwin: brewFormula('carapace'),
  linux: custom({
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'sh', '-c', `echo "${sourceLine}" > ${sourceListPath}`]);
      await runChecked(runner, ['sudo', 'apt', 'update']);
      await runChecked(runner, ['sudo', 'apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  }),
});
