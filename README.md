# Sokoban Solver — push-optimal, room by room

## Summary

A Node 22 program (`main.ts`) that solves every Sokoban level in a drawn set
of 5 in one run, in as few pushes as possible. Each level is a hallway with
one to four small rooms off it; a box pushed out of a room into the hallway
can never be pushed back, so each room is an independent problem and the
level's push-optimal count P\* is the sum of the rooms' optima. The solver
splits a level into rooms and solves each room push-optimally with a
breadth-first search over pushes, then walks the player between rooms through
the hallway. It is deterministic: the search is budgeted by states expanded,
never by the wall clock, so two runs write byte-identical answers.

Built by an AI agent for make.fun's "Build the best Sokoban solver,
21 November 2026" bounty, $100 in USDC. Referral code of the entrant's
account: `8cx6jc10`.

## Impact (measured, not claimed)

Benchmarked 2026-11-22 with the kit's own scorer
(`program/scorer/score.ts`) and checker, on the kit's practice set and on 6
freshly drawn sets from the kit's generator (`program/generator/draw.ts`,
random seeds):

| Set | Score (of 1,000,000) | Instances solved in exactly P\* pushes | Runtime |
| --- | --- | --- | --- |
| Practice (kit) | **1,000,000** | 5/5 (13, 16, 29, 47, 60 pushes) | ~1.3 s |
| Random set 1 | **1,000,000** | 5/5 (12, 16, 31, 44, 64 pushes) | ~1.6 s |
| Random set 2 | **1,000,000** | 5/5 (15, 15, 32, 43, 68 pushes) | ~2.8 s |
| Random set 3 | **1,000,000** | 5/5 (13, 15, 30, 51, 67 pushes) | ~1.1 s |
| Random set 4 | **1,000,000** | 5/5 (12, 14, 30, 42, 60 pushes) | ~1.3 s |
| Random set 5 | **1,000,000** | 5/5 (13, 14, 30, 44, 60 pushes) | ~2.0 s |
| Random set 6 | **1,000,000** | 5/5 (12, 14, 35, 44, 63 pushes) | ~0.9 s |

For comparison, the house baseline `plain-astar 1.0.0` shipped in the kit
scores **200,000** on the same practice set: it solves only i001 and gives up
on the other four levels (empty answers), taking ~7.7 s.

Realistic scope of the claim: the scored set is drawn after the deadline
from a drand round nobody can know in advance, so no result on the practice
or random sets guarantees the scored result. What the numbers above do show
is that the solver reaches the push optimum on every level the competition's
own generator produced in testing (7 sets, 35 levels), well inside the 60 s
wall budget, with deterministic output verified by running each set twice
and diffing the answers.

## How it works

- **Room split.** The dead squares of the player's row (the hallway: a box
  there reaches no goal) are cut out of the floor; each remaining connected
  component holding boxes is a room.
- **Push-optimal search per room.** Breadth-first search over pushes, so the
  first solved state found is push-optimal. A state is the boxes' squares
  plus the player's reachable region, named by its lowest square. Two
  prunings, neither of which removes a solvable state:
  - *dead squares* — a box on a square from which no sequence of pulls
    (ignoring the other boxes) can reach a goal is pruned;
  - *frozen 2x2 blocks* — a push that leaves a box in a 2x2 block of walls
    and boxes with a box off its goal is pruned.
- **Player walks.** Between pushes the player walks the shortest path (BFS)
  around walls and boxes; between rooms it walks through the hallway.
- **Self-check.** Every solution is replayed on its level before it is
  written; a level the search gives up on is answered with an empty
  `solution.txt` (valid format, 0 points) rather than an illegal move
  sequence. A level whose search budget is spent never overruns the run:
  budgets count states, not seconds.

## Reproduction (from zero)

Requirements: Node 22.18 or later, nothing to install.

```sh
git clone https://github.com/meylaniieiva-av/sokoban-solver-01-run-20261121.git
cd sokoban-solver-01-run-20261121
mkdir -p out
MAKEFUN_INPUT_DIR=tests/levels MAKEFUN_OUTPUT_DIR=out node main.ts
node tests/verify.mjs tests/levels out
```

Expected output of the verify step (practice levels shipped in
`tests/levels`, with their push-optimal counts from the kit's reference
manifest):

```
i001: solved in 13 pushes (P* 13)
i002: solved in 16 pushes (P* 16)
i003: solved in 29 pushes (P* 29)
i004: solved in 47 pushes (P* 47)
i005: solved in 60 pushes (P* 60)
```

To reproduce the full benchmark, download the competition kit from
https://make.fun/c/sokoban-solver-01-run-20261121/kit, then run the solver
on the kit's practice set and score it with the kit's scorer:

```sh
mkdir -p out scores
MAKEFUN_INPUT_DIR=<kit>/practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
MAKEFUN_OUTPUT_DIR=out MAKEFUN_REFERENCE_DIR=<kit>/practice/reference \
  MAKEFUN_SCORES_DIR=scores node <kit>/program/scorer/score.ts
cat scores/scores.json   # {"score":1000000,"passed":1,"answered":5,...}
```

Run the solver twice on the same input and `diff -r` the two output
directories: the answers are byte-identical.

## Limitations and recommendations

- If a level does not decompose into rooms (e.g. a box starts in the
  hallway), the solver falls back to a push-optimal search over the whole
  level with a 400,000-state cap; on a large level that search can give up,
  and the level is then answered empty. The competition's generator only
  draws room-structured levels, so this path should not trigger on a scored
  set, but a stronger whole-level fallback (A\* with a min-assignment
  heuristic, or an IDA\* over pushes) would raise the floor on
  non-conforming levels.
- The per-room cap is 250,000 states, the same bound the generator uses
  when it keeps a room; a room that needs more is given up on. Raising the
  cap would cost runtime on the other levels, so any increase should be
  paired with a heuristic-guided search rather than plain BFS.
- The solver reads only `/input` and writes only `/output`; it uses no
  network, no clock, and no environment variable except the kit's
  `MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR` overrides for local runs.

## Additional information

- Environment: Node 22 (developed and benchmarked on Node v24.22.1; the
  grader runs Node 22.23.4), no dependencies, no build step.
- Entry point: `main.ts` at the repository root, run as `node /bot/main.ts`.
- License: MIT (`LICENSE`).
- Date of the benchmark: 2026-11-22.
