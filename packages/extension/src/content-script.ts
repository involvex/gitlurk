import { buildOpenRepoUrl } from '@gitlurk/shared';

const BUTTON_ID = 'gitlurk-open-button';
const LABEL = 'Open with GitLurk Desktop';
const READY_ATTR = 'data-gitlurk-ready';
const DEBOUNCE_MS = 150;

/** Compact mark that matches GitHub menu icon size (~16px). */
const GITLURK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" class="octicon" fill="currentColor"><path d="M2.5 2.75A.75.75 0 0 1 3.25 2h9.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75V2.75Zm1.5.75v9h8.5v-9H4Zm2 1.5h4.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Zm0 3h4.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Zm0 3h2.75a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Z"/><path d="M11.28 9.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06 0l-.75-.75a.75.75 0 1 1 1.06-1.06l.22.22.97-.97a.75.75 0 0 1 1.06 0Z"/></svg>`;

/** Narrow selectors — avoid scanning every `ul a` on the page. */
const CLONE_UI_SELECTORS = [
  'a[href^="x-github-client://"]',
  'input[aria-label="Clone URL"]',
  'input.js-url-field',
  'input[data-autoselect]',
  '[data-target="clone-url-input"]',
  'a[href*="/archive/"]',
  'a[href$=".zip"]',
].join(', ');

const MENU_ANCHOR_SELECTORS = [
  'a[href^="x-github-client://"]',
  'a[href$=".zip"]',
  'a[href*="/archive/"]',
  '[role="menu"] a[href]',
  '[role="menuitem"][href]',
  'ul[role="listbox"] a[href]',
].join(', ');

let injecting = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function repoUrlFromPathname(): string | null {
  const match = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2]?.replace(/\.git$/, '');
  if (!owner || !repo) return null;
  return `https://github.com/${owner}/${repo}.git`;
}

function repoUrlFromGithubClientHref(href: string): string | null {
  try {
    const u = new URL(href);
    const path = decodeURIComponent(u.pathname.replace(/^\//, ''));
    if (path.startsWith('https://') || path.startsWith('http://')) {
      return path.split('?')[0] ?? path;
    }
    if (u.host === 'openRepo' || u.host === 'cloneRepo') {
      return path.split('?')[0] ?? path;
    }
  } catch {
    // ignore
  }
  return null;
}

function getCloneUrl(scope: ParentNode = document): string | null {
  const input = scope.querySelector<HTMLInputElement>(
    [
      'input[aria-label="Clone URL"]',
      'input.js-url-field',
      'input[data-autoselect]',
      'input[value*="github.com"]',
      '[data-target="clone-url-input"]',
    ].join(', '),
  );
  if (input?.value?.includes('github.com')) {
    return input.value.trim();
  }

  const desktopLink = scope.querySelector<HTMLAnchorElement>(
    'a[href^="x-github-client://"]',
  );
  if (desktopLink?.href) {
    const fromDesktop = repoUrlFromGithubClientHref(desktopLink.href);
    if (fromDesktop) return fromDesktop;
  }

  return repoUrlFromPathname();
}

function isCloneMenuPresent(): boolean {
  return document.querySelector(CLONE_UI_SELECTORS) !== null;
}

function menuAnchors(): HTMLAnchorElement[] {
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>(MENU_ANCHOR_SELECTORS),
  );
}

function findAnchorByLabel(pattern: RegExp): HTMLAnchorElement | null {
  return (
    menuAnchors().find((a) => pattern.test(a.textContent?.trim() ?? '')) ?? null
  );
}

function findTemplateAnchor(): HTMLAnchorElement | null {
  return (
    document.querySelector<HTMLAnchorElement>(
      'a[href^="x-github-client://"]',
    ) ??
    findAnchorByLabel(/Open with GitHub Desktop/i) ??
    findAnchorByLabel(/Open with Visual Studio/i) ??
    findAnchorByLabel(/Open in GitHub Copilot/i) ??
    findAnchorByLabel(/Download ZIP/i) ??
    document.querySelector<HTMLAnchorElement>('a[href$=".zip"]') ??
    document.querySelector<HTMLAnchorElement>('a[href*="/archive/"]')
  );
}

/** Replace visible label text while keeping icon SVGs intact. */
function setLinkLabel(root: HTMLElement, text: string): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  if (textNodes.length === 0) {
    root.appendChild(document.createTextNode(` ${text}`));
    return;
  }

  textNodes[0]!.textContent = text;
  for (let i = 1; i < textNodes.length; i++) {
    textNodes[i]!.textContent = '';
  }
}

function replaceRowIcon(root: HTMLElement): void {
  const existing =
    root.querySelector('svg') ??
    root.querySelector('.octicon') ??
    root.querySelector('[class*="octicon"]');

  const wrapper = document.createElement('span');
  wrapper.setAttribute('class', existing?.getAttribute('class') ?? 'octicon');
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.innerHTML = GITLURK_ICON_SVG;

  const svg = wrapper.firstElementChild;
  if (existing && svg) {
    const cls = existing.getAttribute('class');
    if (cls) svg.setAttribute('class', cls);
    existing.replaceWith(svg);
    return;
  }

  if (svg) {
    root.insertBefore(svg, root.firstChild);
  }
}

function ensureGitLurkLabel(anchor: HTMLAnchorElement): void {
  if (!/GitLurk/i.test(anchor.textContent ?? '')) {
    setLinkLabel(anchor, LABEL);
  }
}

function markReady(anchor: HTMLAnchorElement): void {
  anchor.setAttribute(READY_ATTR, '1');
}

function isReady(anchor: HTMLAnchorElement): boolean {
  return anchor.getAttribute(READY_ATTR) === '1';
}

function injectGitLurkButton(): void {
  // Bail early when the Code → Local panel is not open — avoids scanning
  // the whole GitHub SPA on every Turbo/React mutation.
  if (!isCloneMenuPresent() && !document.getElementById(BUTTON_ID)) {
    return;
  }

  const existing = document.getElementById(
    BUTTON_ID,
  ) as HTMLAnchorElement | null;
  const cloneUrl = getCloneUrl();
  if (!cloneUrl) return;

  const openHref = buildOpenRepoUrl(cloneUrl);

  if (existing) {
    if (existing.getAttribute('href') !== openHref) {
      existing.href = openHref;
    }
    // Never re-paint icon/label once ready — that re-entered the observer
    // and ballooned renderer memory into the multi-GB range.
    if (!isReady(existing)) {
      ensureGitLurkLabel(existing);
      replaceRowIcon(existing.closest('li') ?? existing);
      markReady(existing);
    }
    return;
  }

  const template = findTemplateAnchor();
  if (!template) return;

  const row = template.closest('li') ?? template.parentElement;
  const clone = (row ?? template).cloneNode(true) as HTMLElement;

  const anchor =
    clone.tagName === 'A'
      ? (clone as HTMLAnchorElement)
      : clone.querySelector('a');

  if (!anchor) return;

  anchor.id = BUTTON_ID;
  anchor.href = openHref;
  anchor.removeAttribute('data-open-app');
  anchor.removeAttribute('data-hydro-click');
  anchor.removeAttribute('data-hydro-click-hmac');
  anchor.removeAttribute('data-analytics-event');
  setLinkLabel(anchor, LABEL);
  replaceRowIcon(clone);
  markReady(anchor);

  const parent = row?.parentElement ?? template.parentElement;
  if (!parent) return;

  // Prefer sitting right after GitHub Desktop when that row exists.
  const desktop =
    document.querySelector<HTMLAnchorElement>(
      'a[href^="x-github-client://"]',
    ) ?? findAnchorByLabel(/Open with GitHub Desktop/i);
  const desktopRow = desktop?.closest('li') ?? desktop?.parentElement;
  const insertAfter =
    desktopRow && desktopRow.parentElement === parent
      ? desktopRow
      : (row ?? template);

  parent.insertBefore(clone, insertAfter.nextSibling);
}

function runInject(): void {
  if (injecting) return;
  injecting = true;
  try {
    // Pause observation while we mutate so our own DOM writes cannot
    // schedule another inject pass.
    observer.disconnect();
    injectGitLurkButton();
  } finally {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    injecting = false;
  }
}

function scheduleInject(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runInject();
  }, DEBOUNCE_MS);
}

const observer = new MutationObserver(scheduleInject);

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  runInject();
} else {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      observer.observe(document.body, { childList: true, subtree: true });
      runInject();
    },
    { once: true },
  );
}
