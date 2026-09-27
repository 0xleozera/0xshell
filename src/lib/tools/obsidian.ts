import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { deb, debFromGitHubRelease } from '../helpers/deb';

export default defineTool({
  id: 'obsidian',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('obsidian'),
  // No apt repository: the .deb from the releases repository. Some of its
  // releases are mobile-only, hence the newest release that has one.
  linux: deb({
    packageName: 'obsidian',
    download: debFromGitHubRelease('obsidianmd/obsidian-releases', 'obsidian_[^/"]+_amd64\\.deb'),
  }),
});
