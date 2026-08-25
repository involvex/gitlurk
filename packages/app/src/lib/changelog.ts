export interface ChangelogSection {
  title: string;
  version: string;
  url: string | null;
  entries: string[];
}

const SECTION_HEADING_RE = /^##\s+(.+)$/;
const VERSION_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/;

export function parseChangelogSections(raw: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const heading = SECTION_HEADING_RE.exec(line);
    if (heading) {
      if (current) {
        sections.push(current);
      }
      const title = heading[1].trim();
      const link = VERSION_LINK_RE.exec(title);
      current = {
        title,
        version: link ? link[1] : title,
        url: link ? link[2] : null,
        entries: [],
      };
      continue;
    }
    if (current && line.startsWith('- ')) {
      current.entries.push(line.slice(2).trim());
    }
  }
  if (current) {
    sections.push(current);
  }
  return sections;
}

export function latestChangelogSection(raw: string): ChangelogSection | null {
  return parseChangelogSections(raw)[0] ?? null;
}
