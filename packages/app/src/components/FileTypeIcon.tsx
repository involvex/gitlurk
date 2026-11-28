import type { ReactNode } from 'react';
import { resolveFileIcon, type FileIconId } from '../lib/file-type-icon';

function IconSvg({ children, title }: { children: ReactNode; title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

function renderIcon(id: FileIconId) {
  switch (id) {
    case 'folder':
      return (
        <IconSvg title="Folder">
          <path
            fill="currentColor"
            d="M1.5 3h4l1 1.5H14.5v8.5H1.5z"
            opacity="0.85"
          />
        </IconSvg>
      );
    case 'folder-open':
      return (
        <IconSvg title="Open folder">
          <path
            fill="currentColor"
            d="M1.5 3h4l1 1.5H11v1H3.2L1.5 12.5V3zm2.2 4H14.5l-1.5 6H2.2z"
            opacity="0.85"
          />
        </IconSvg>
      );
    case 'typescript':
      return (
        <IconSvg title="TypeScript">
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="13"
            rx="1.5"
            fill="currentColor"
            opacity="0.2"
          />
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="7"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            TS
          </text>
        </IconSvg>
      );
    case 'javascript':
      return (
        <IconSvg title="JavaScript">
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="13"
            rx="1.5"
            fill="currentColor"
            opacity="0.2"
          />
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="7"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            JS
          </text>
        </IconSvg>
      );
    case 'json':
      return (
        <IconSvg title="JSON">
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            {'{}'}
          </text>
        </IconSvg>
      );
    case 'markdown':
      return (
        <IconSvg title="Markdown">
          <path
            fill="currentColor"
            d="M2 3.5h12v9H2zm2.2 7V6.2L5.8 8.5 7.4 6.2V10.5h1.2V5.5H7.2L5.8 7.3 4.4 5.5H3V10.5zm7.3 0 2-2.7h-1.4V5.5H10.5v2.3H9.1z"
          />
        </IconSvg>
      );
    case 'rust':
      return (
        <IconSvg title="Rust">
          <circle
            cx="8"
            cy="8"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
        </IconSvg>
      );
    case 'css':
      return (
        <IconSvg title="CSS">
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            CSS
          </text>
        </IconSvg>
      );
    case 'html':
      return (
        <IconSvg title="HTML">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M3.5 4.5 2.5 11.5 8 13.5 13.5 11.5 12.5 4.5z"
          />
        </IconSvg>
      );
    case 'image':
      return (
        <IconSvg title="Image">
          <rect
            x="2"
            y="3"
            width="12"
            height="10"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="5.5" cy="6.5" r="1.2" fill="currentColor" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M2.5 11.5 6 8.5 8.5 10.5 13.5 5.5"
          />
        </IconSvg>
      );
    case 'lock':
      return (
        <IconSvg title="Lockfile">
          <rect
            x="4"
            y="7"
            width="8"
            height="6"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
          />
        </IconSvg>
      );
    case 'git':
      return (
        <IconSvg title="Git">
          <circle cx="5" cy="11" r="1.4" fill="currentColor" />
          <circle cx="11" cy="5" r="1.4" fill="currentColor" />
          <circle cx="11" cy="11" r="1.4" fill="currentColor" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M5 11V5.5M5 5.5 11 5M11 5v6"
          />
        </IconSvg>
      );
    case 'yaml':
      return (
        <IconSvg title="YAML">
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="6"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            YML
          </text>
        </IconSvg>
      );
    case 'toml':
      return (
        <IconSvg title="TOML">
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="5.5"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            TOML
          </text>
        </IconSvg>
      );
    case 'env':
      return (
        <IconSvg title="Env">
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="6"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            ENV
          </text>
        </IconSvg>
      );
    case 'python':
      return (
        <IconSvg title="Python">
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="7"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            PY
          </text>
        </IconSvg>
      );
    case 'shell':
      return (
        <IconSvg title="Shell">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M3 5.5 6.5 8 3 10.5M8 11h5"
          />
        </IconSvg>
      );
    default:
      return (
        <IconSvg title="File">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M4 2.5h5.5L12.5 5.5V13.5H4z"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M9.5 2.5V5.5H12.5"
          />
        </IconSvg>
      );
  }
}

export function FileTypeIcon({
  name,
  kind,
  open = false,
}: {
  name: string;
  kind: 'file' | 'dir';
  open?: boolean;
}) {
  return renderIcon(resolveFileIcon(name, kind, open));
}
