/**
 * Turns `git log --graph` prefixes into per-entry SVG layout data.
 *
 * Git renders lanes two characters apart (even indices); diagonal connectors
 * '\' and '/' sit on the odd indices BETWEEN lanes. Decoration-only rows
 * (`|\`, `|/`, ...) arrive separately via `graphExtra`.
 */

export interface GraphMove {
  /** Character column where the line enters this band (top edge). */
  from: number;
  /** Character column where the line leaves this band (bottom edge). */
  to: number;
}

export interface GraphEntryLayout {
  /** Character column of the commit marker ('*'), or null for pure connectors. */
  nodeX: number | null;
  /** Line bands drawn inside this entry's block, top edge -> bottom edge. */
  moves: GraphMove[];
  /** Active columns entering from the previous entry. */
  inCols: number[];
  /** Active columns leaving toward the next entry. */
  outCols: number[];
}

interface ActiveLine {
  x: number;
}

const NODE_CHARS = new Set(['*', '>', '<']);

function trimRow(row: string): string {
  return row.replace(/\s+$/g, '');
}

function processRow(
  row: string,
  lines: ActiveLine[],
): { nodeX: number | null; moves: GraphMove[]; lines: ActiveLine[] } {
  const chars = trimRow(row);
  const at = (i: number) => chars[i] ?? ' ';

  const moves: GraphMove[] = [];
  let nodeX: number | null = null;
  for (let i = 0; i < chars.length; i += 1) {
    if (NODE_CHARS.has(chars[i])) {
      nodeX = i;
      break;
    }
  }

  const nextLines: ActiveLine[] = [];

  // 1) Carry existing straight lanes ('|', '*', '-', ' ') downward.
  for (const line of lines) {
    nextLines.push({ x: line.x });
    moves.push({ from: line.x, to: line.x });
  }

  // 2) Odd-column connectors between lanes.
  for (let j = 1; j < chars.length; j += 2) {
    const ch = chars[j];
    if (ch === '\\') {
      // A new branch forks off the lane on the left, heading down-right.
      const source = j - 1;
      const target = j + 1;
      if (!nextLines.some((l) => l.x === target)) {
        nextLines.push({ x: target });
        moves.push({ from: source, to: target });
      } else {
        moves.push({ from: source, to: target });
      }
    } else if (ch === '/') {
      // The lane on the right merges back into the one on the left.
      const source = j + 1;
      const target = j - 1;
      const idx = nextLines.findIndex((l) => l.x === source);
      if (idx >= 0) {
        nextLines.splice(idx, 1);
        moves.push({ from: source, to: target });
      }
    }
  }

  // 3) Spawn any remaining untouched lanes shown in this row.
  for (let i = 0; i < chars.length; i += 2) {
    if (!isLaneStart(at(i))) continue;
    if (nextLines.some((l) => l.x === i)) continue;
    nextLines.push({ x: i });
    moves.push({ from: i, to: i });
  }

  if (nodeX !== null && !nextLines.some((l) => l.x === nodeX)) {
    nextLines.push({ x: nodeX });
    moves.push({ from: nodeX, to: nodeX });
  }

  nextLines.sort((a, b) => a.x - b.x);
  return { nodeX, moves, lines: nextLines };
}

function isLaneStart(ch: string): boolean {
  return ch === '|' || ch === '*' || ch === '\\';
}

/**
 * Lays out a full commit sequence. Entries are processed in display order
 * (newest first); each entry may carry decoration rows captured before it.
 */
export function layoutCommitGraph(
  entries: Array<{ graph: string; graphExtra?: string[] }>,
): GraphEntryLayout[] {
  const result: GraphEntryLayout[] = [];
  let lines: ActiveLine[] = [];

  for (const entry of entries) {
    const inCols = lines.map((l) => l.x);
    const rows = [...(entry.graphExtra ?? []), entry.graph];
    const allMoves: GraphMove[] = [];
    let nodeX: number | null = null;

    for (const row of rows) {
      if (trimRow(row).length === 0) continue;
      const step = processRow(row, lines);
      allMoves.push(...step.moves);
      lines = step.lines;
      if (step.nodeX !== null) {
        nodeX = step.nodeX;
      }
    }

    result.push({
      nodeX,
      moves: allMoves,
      inCols,
      outCols: lines.map((l) => l.x),
    });
  }

  return result;
}

/** Widest prefix width (in characters) needed to size rows consistently. */
export function maxGraphColumns(
  entries: Array<{ graph: string; graphExtra?: string[] }>,
): number {
  let max = 1;
  for (const entry of entries) {
    for (const row of [...(entry.graphExtra ?? []), entry.graph]) {
      max = Math.max(max, trimRow(row).length);
    }
  }
  return max;
}
