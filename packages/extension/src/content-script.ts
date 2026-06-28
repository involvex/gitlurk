import { buildOpenRepoUrl } from '@mygit/shared';

function getCloneUrl(): string | null {
  const input = document.querySelector<HTMLInputElement>(
    '[data-target="clone-url-input"], input[value*="github.com"]',
  );
  return input?.value ?? null;
}

function injectMyGitButton() {
  if (document.getElementById('mygit-open-button')) return;

  const cloneUrl = getCloneUrl();
  if (!cloneUrl) return;

  const container =
    document.querySelector('[data-testid="clone-dropdown"]') ??
    document.querySelector('.js-clone-options');

  if (!container) return;

  const link = document.createElement('a');
  link.id = 'mygit-open-button';
  link.textContent = 'Open with MyGit Desktop';
  link.href = buildOpenRepoUrl(cloneUrl);
  link.className = 'btn btn-sm btn-block';
  link.style.marginTop = '8px';
  container.appendChild(link);
}

const observer = new MutationObserver(() => injectMyGitButton());
observer.observe(document.body, { childList: true, subtree: true });
injectMyGitButton();
