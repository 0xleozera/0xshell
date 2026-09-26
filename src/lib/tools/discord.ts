import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { deb, debFromUrl } from '../helpers/deb';

export default defineTool({
  id: 'discord',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('discord'),
  // Discord has no apt repository: this URL redirects to the current .deb.
  // The app checks for updates itself and asks for the next .deb when one
  // is out.
  linux: deb({
    packageName: 'discord',
    download: debFromUrl('https://discord.com/api/download?platform=linux&format=deb'),
  }),
});
