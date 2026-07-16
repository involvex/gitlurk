import { buildOpenRepoUrl } from '@gitlurk/shared';

function getCloneUrl(): string | null {
  const input = document.querySelector<HTMLInputElement>(
    '[data-target="clone-url-input"], input[value*="github.com"]',
  );
  return input?.value ?? null;
}

function injectGitLurkButton() {
  if (document.getElementById('gitlurk-open-button')) return;

  const cloneUrl = getCloneUrl();
  if (!cloneUrl) return;

  const container =
    document.querySelector('[data-testid="clone-dropdown"]') ??
    document.querySelector('.js-clone-options');

  if (!container) return;

  const link = document.createElement('a');
  link.id = 'gitlurk-open-button';
  link.textContent = 'Open with GitLurk Desktop';
  link.href = buildOpenRepoUrl(cloneUrl);
  link.className = 'btn btn-sm btn-block';
  link.style.marginTop = '8px';
  container.appendChild(link);
}

const observer = new MutationObserver(() => injectGitLurkButton());
observer.observe(document.body, { childList: true, subtree: true });
injectGitLurkButton();
