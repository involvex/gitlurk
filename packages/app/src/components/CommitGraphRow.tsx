import type { GraphEntryLayout } from '../lib/graph-layout';

const CHAR_W = 7;
const ROW_H = 26;
const PAD_X = 4;

const LANE_COLORS = [
  '#3fb950',
  '#58a6ff',
  '#bc8cff',
  '#f778ba',
  '#ffa657',
  '#79c0ff',
  '#d2a8ff',
  '#7ee787',
];

function laneColor(x: number): string {
  return LANE_COLORS[Math.floor(x / 2) % LANE_COLORS.length] ?? '#3fb950';
}

export function CommitGraphRow({
  layout,
  maxChars,
}: {
  layout: GraphEntryLayout;
  maxChars: number;
}) {
  const width = Math.max(maxChars, 2) * CHAR_W + PAD_X * 2;
  const midY = ROW_H / 2;

  return (
    <svg
      width={width}
      height={ROW_H}
      viewBox={`0 0 ${width} ${ROW_H}`}
      className="shrink-0"
      aria-hidden
    >
      {layout.moves.map((move, index) => {
        const x1 = move.from * CHAR_W + PAD_X;
        const x2 = move.to * CHAR_W + PAD_X;
        if (x1 === x2) {
          return (
            <line
              key={`seg-${index}-${x1}`}
              x1={x1}
              y1={0}
              x2={x2}
              y2={ROW_H}
              stroke={laneColor(move.to)}
              strokeWidth={1.5}
            />
          );
        }
        const cx = (x1 + x2) / 2;
        return (
          <path
            key={`seg-${index}-${x1}-${x2}`}
            d={`M ${x1} 0 C ${cx} ${ROW_H * 0.25}, ${cx} ${ROW_H * 0.75}, ${x2} ${ROW_H}`}
            fill="none"
            stroke={laneColor(move.to)}
            strokeWidth={1.5}
          />
        );
      })}
      {layout.nodeX !== null ? (
        <circle
          cx={layout.nodeX * CHAR_W + PAD_X}
          cy={midY}
          r={4}
          fill={laneColor(layout.nodeX)}
          stroke="var(--color-surface, #0d1117)"
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  );
}
