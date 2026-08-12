import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';
import { runChecked } from './run-checked';

export type AptRepoOptions = {
  /** Nome curto do repositório: nomeia o keyring e o arquivo em sources.list.d. */
  readonly repoName: string;
  /** URL da chave GPG pública (ASCII-armored) que assina o repositório. */
  readonly keyUrl: string;
  /** URL base do repositório apt, ex.: 'https://packagecloud.io/slacktechnologies/slack/debian/'. */
  readonly repoUrl: string;
  readonly distribution: string;
  readonly components: string;
  readonly packageName: string;
};

/**
 * Helper for Tools installed from a third-party, signed apt repository
 * (ADR-0002). Repositórios de terceiro são assinados: a chave GPG é
 * importada para um keyring próprio em /etc/apt/keyrings e referenciada via
 * `signed-by` na source list — o padrão atual, em vez do `apt-key`
 * depreciado. Sem isso, `apt update` falha com `NO_PUBKEY`.
 *
 * Command generation lives here in one place — #8 adds `sudo` by editing
 * these methods, não tocando cada Tool que usa este Helper.
 */
export function aptRepo({
  repoName,
  keyUrl,
  repoUrl,
  distribution,
  components,
  packageName,
}: AptRepoOptions): Recipe {
  const keyringPath = `/etc/apt/keyrings/${repoName}.gpg`;
  const sourceListPath = `/etc/apt/sources.list.d/${repoName}.list`;
  const sourceLine = `deb [signed-by=${keyringPath}] ${repoUrl} ${distribution} ${components}`;

  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['mkdir', '-p', '/etc/apt/keyrings']);
      await runChecked(runner, ['sh', '-c', `curl -fsSL ${keyUrl} | gpg --dearmor -o ${keyringPath}`]);
      await runChecked(runner, ['sh', '-c', `echo "${sourceLine}" > ${sourceListPath}`]);
      await runChecked(runner, ['apt', 'update']);
      await runChecked(runner, ['apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  };
}
