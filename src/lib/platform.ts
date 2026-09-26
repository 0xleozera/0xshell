export type Platform = 'darwin' | 'linux';

export function resolvePlatform(nodePlatform: string = process.platform): Platform {
  if (nodePlatform === 'darwin' || nodePlatform === 'linux') {
    return nodePlatform;
  }
  throw new Error(`0xshell does not support the platform "${nodePlatform}"`);
}
