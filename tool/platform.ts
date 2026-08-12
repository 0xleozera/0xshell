export type Platform = 'darwin' | 'linux';

/**
 * Resolves the current Plataforma from `process.platform`, injectable
 * (default parameter) so tests can exercise both `darwin` and `linux` in
 * the same suite instead of reading the global deep inside the code.
 */
export function resolvePlatform(nodePlatform: string = process.platform): Platform {
  if (nodePlatform === 'darwin' || nodePlatform === 'linux') {
    return nodePlatform;
  }
  throw new Error(`sshell não suporta a plataforma "${nodePlatform}"`);
}
