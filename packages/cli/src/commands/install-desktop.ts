import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const REPO = 'involvex/gitlurk';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

interface GhAsset {
  name: string;
  browser_download_url: string;
}

interface GhRelease {
  tag_name: string;
  assets: GhAsset[];
}

function pickInstaller(assets: GhAsset[]): GhAsset | null {
  const msi = assets.find((a) => a.name.toLowerCase().endsWith('.msi'));
  if (msi) return msi;
  return (
    assets.find(
      (a) => /setup\.exe$/i.test(a.name) || /-setup\.exe$/i.test(a.name),
    ) ?? null
  );
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'gitlurk-desktop-cli' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  // Node 20+ Readable.fromWeb
  await pipeline(
    Readable.fromWeb(
      res.body as unknown as import('node:stream/web').ReadableStream,
    ),
    createWriteStream(dest),
  );
}

function launchInstaller(path: string): void {
  console.log('Launching installer…');
  if (process.platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', path], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return;
  }
  console.log(
    `Installer downloaded to:\n  ${path}\nOpen it manually on this platform.`,
  );
}

export async function runInstallDesktop(): Promise<void> {
  console.log(`Fetching latest release from ${REPO}…`);
  const res = await fetch(API, {
    headers: {
      'User-Agent': 'gitlurk-desktop-cli',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch releases: ${res.status} ${res.statusText}`,
    );
  }

  const release = (await res.json()) as GhRelease;
  const asset = pickInstaller(release.assets);
  if (!asset) {
    throw new Error(
      `No MSI/setup.exe found in ${release.tag_name}. See https://github.com/${REPO}/releases`,
    );
  }

  const dir = join(homedir(), '.gitlurk', 'downloads');
  await mkdir(dir, { recursive: true });
  let dest = join(dir, asset.name);

  console.log(`Downloading ${asset.name} (${release.tag_name})…`);
  try {
    await downloadFile(asset.browser_download_url, dest);
  } catch {
    dest = join(tmpdir(), asset.name);
    await downloadFile(asset.browser_download_url, dest);
  }

  console.log(`Saved to ${dest}`);
  launchInstaller(dest);
}
