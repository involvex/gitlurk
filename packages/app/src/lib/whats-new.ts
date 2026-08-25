import changelogRaw from '../../../../CHANGELOG.md?raw';
import { latestChangelogSection } from './changelog';

export { parseChangelogSections } from './changelog';
export type { ChangelogSection } from './changelog';

/** Latest section of the bundled CHANGELOG.md. */
export function bundledLatestChangelog() {
  return latestChangelogSection(changelogRaw);
}
