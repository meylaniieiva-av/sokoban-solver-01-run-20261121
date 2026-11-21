// Verify the solver's answers on a directory of levels: replay each
// solution.txt and report pushes against the expected push-optimal counts.
// Usage: node tests/verify.mjs <levels dir> <output dir>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED = { i001: 13, i002: 16, i003: 29, i004: 47, i005: 60 };

const levelsDir = process.argv[2];
const outDir = process.argv[3];
if (!levelsDir || !outDir) {
  console.error('usage: node tests/verify.mjs <levels dir> <output dir>');
  process.exit(2);
}

function parseLevel(text) {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const w = Math.max(...rows.map((r) => r.length));
  const wall = new Uint8Array(w * rows.length).fill(1);
  const goal = new Uint8Array(w * rows.length);
  const box = new Uint8Array(w * rows.length);
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if ('.*+'.includes(ch)) goal[i] = 1;
      if ('$*'.includes(ch)) box[i] = 1;
      if ('@+'.includes(ch)) player = i;
    }
  });
  return { w, wall, goal, box, player };
}

let ok = true;
for (const id of readdirSync(levelsDir).sort()) {
  const level = parseLevel(readFileSync(join(levelsDir, id, 'level.txt'), 'utf8'));
  const moves = readFileSync(join(outDir, id, 'solution.txt'), 'utf8').replace(/\s+/g, '');
  const { w, wall, goal, box } = level;
  let player = level.player;
  let pushes = 0;
  let illegal = null;
  for (let k = 0; k < moves.length; k++) {
    const ch = moves[k].toLowerCase();
    const d = ch === 'u' ? -w : ch === 'd' ? w : ch === 'l' ? -1 : 1;
    const next = player + d;
    if (wall[next]) { illegal = `move ${k + 1} walks into a wall`; break; }
    if (box[next]) {
      const beyond = next + d;
      if (wall[beyond] || box[beyond]) { illegal = `move ${k + 1} pushes a box into a wall or box`; break; }
      box[next] = 0;
      box[beyond] = 1;
      pushes++;
    }
    player = next;
  }
  const solved = illegal === null && !box.some((b, i) => b && !goal[i]);
  const want = EXPECTED[id];
  const line = `${id}: ${illegal ?? (solved ? `solved in ${pushes} pushes (P* ${want})` : `unsolved after ${pushes} pushes`)}`;
  console.log(line);
  if (!solved || (want !== undefined && pushes !== want)) ok = false;
}
process.exit(ok ? 0 : 1);
