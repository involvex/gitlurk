import { describe, expect, test } from 'bun:test';
import { layoutCommitGraph, maxGraphColumns } from '../graph-layout';

describe('layoutCommitGraph', () => {
  test('linear history keeps a single lane at column 0', () => {
    const layouts = layoutCommitGraph([
      { graph: '* ' },
      { graph: '* ' },
      { graph: '* ' },
    ]);
    expect(layouts.map((l) => l.nodeX)).toEqual([0, 0, 0]);
    expect(layouts[0].inCols).toEqual([]);
    for (const layout of layouts) {
      expect(layout.outCols).toEqual([0]);
      expect(layout.moves).toContainEqual({ from: 0, to: 0 });
    }
    expect(layouts[1].inCols).toEqual([0]);
    expect(layouts[2].inCols).toEqual([0]);
  });

  test('merge branch: fork row spawns lane, merge row collapses it', () => {
    // Mirrors real git output:
    //   *   M
    //   |\
    //   | * P2
    //   |/
    //   * P1
    const layouts = layoutCommitGraph([
      { graph: '*   ' },
      { graph: '| * ', graphExtra: ['|\\'] },
      { graph: '*   ', graphExtra: ['|/'] },
    ]);

    const [mergeRow, featureRow, mainRow] = layouts;

    expect(mergeRow.nodeX).toBe(0);
    expect(mergeRow.outCols).toEqual([0]);

    expect(featureRow.inCols).toEqual([0]);
    // The fork: existing lane continues AND a diagonal spawns the side lane.
    expect(featureRow.moves).toContainEqual({ from: 0, to: 0 });
    expect(featureRow.moves).toContainEqual({ from: 0, to: 2 });
    expect(featureRow.nodeX).toBe(2);
    expect(featureRow.outCols).toEqual([0, 2]);

    expect(mainRow.inCols).toEqual([0, 2]);
    expect(mainRow.moves).toContainEqual({ from: 2, to: 0 });
    expect(mainRow.nodeX).toBe(0);
    expect(mainRow.outCols).toEqual([0]);
  });

  test('parallel lanes render both columns with nodes in place', () => {
    const layouts = layoutCommitGraph([
      { graph: '| *' },
      { graph: '* |' },
      { graph: '|/' },
      { graph: '*' },
    ]);
    expect(layouts[0].nodeX).toBe(2);
    expect(layouts[1].nodeX).toBe(0);
    expect(layouts[2].nodeX).toBeNull();
    expect(layouts[2].moves).toContainEqual({ from: 2, to: 0 });
    expect(layouts[2].outCols).toEqual([0]);
    expect(layouts[3].nodeX).toBe(0);
    expect(layouts[3].outCols).toEqual([0]);
  });

  test('first entry with no prior lines seeds from its own marker', () => {
    const [first] = layoutCommitGraph([{ graph: '*   abc' }]);
    expect(first.nodeX).toBe(0);
    expect(first.outCols).toEqual([0]);
  });

  test('empty input produces empty output', () => {
    expect(layoutCommitGraph([])).toEqual([]);
  });
});

describe('maxGraphColumns', () => {
  test('uses the widest prefix including extra rows', () => {
    const max = maxGraphColumns([
      { graph: '* ' },
      { graph: '| *', graphExtra: ['|\\'] },
      { graph: '| | *' },
    ]);
    expect(max).toBeGreaterThanOrEqual(5);
  });

  test('blank input yields one column minimum', () => {
    expect(maxGraphColumns([{ graph: '' }])).toBe(1);
  });
});
