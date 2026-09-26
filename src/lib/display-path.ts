/** A path as the user would type it: `~/.zshrc`, not `/Users/leo/.zshrc`. */
export function displayPath(path: string, home: string): string {
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}
