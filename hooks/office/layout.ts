// The room in art pixels: a 384x216 canvas, wall on top, floor below.
// People stand on the vertices of a small walking graph; a vertex is where
// their feet are.

export const W = 384
export const H = 216
export const WALL_BOTTOM = 64
export const KITCHEN_X = 292

/** Rows of wall above the room: on desktop the app's title bar covers them. */
export const TITLE_BAR = 12

/** Walking speed, art pixels a second. */
export const SPEED = 40
export const JANITOR_SPEED = 46

export type Pt = readonly [number, number]

const TOP = 82
const MID = 130
const BOT = 182

export const V: Readonly<Record<string, Pt>> = {
  din: [66, 61],
  dr: [66, 70],
  t64: [64, TOP],
  t112: [112, TOP],
  shA: [142, TOP],
  shB: [154, TOP],
  t160: [160, TOP],
  cbA: [180, TOP],
  cbB: [192, TOP],
  t208: [208, TOP],
  t270: [270, TOP],
  rkA: [280, TOP],
  rkB: [290, TOP],
  t300: [300, TOP],
  cof: [306, TOP],
  m64: [64, MID],
  d0: [88, MID],
  m112: [112, MID],
  d1: [136, MID],
  m160: [160, MID],
  d2: [184, MID],
  m208: [208, MID],
  d3: [232, MID],
  m270: [270, MID],
  b64: [64, BOT],
  d4: [88, BOT],
  b112: [112, BOT],
  d5: [136, BOT],
  b160: [160, BOT],
  d6: [184, BOT],
  b208: [208, BOT],
  d7: [232, BOT],
  b270: [270, BOT],
  kw: [300, 90],
  // The table's seats, three down each long side: the near side is reached
  // from the kitchen aisle, the far side along the counter.
  k1: [300, 102],
  k2: [300, 117],
  km: [300, 132],
  ta: [309, 102],
  tb: [309, 117],
  tc: [309, 132],
  ke: [365, 82],
  td: [365, 102],
  te: [365, 117],
  tf: [365, 132],
  kb: [300, 196],
  sa: [323, 196],
  sb: [339, 196],
  glA: [356, 192],
  glB: [368, 200],
}

// Straight walkable runs; neighbours in a run are joined both ways.
const RUNS: readonly (readonly string[])[] = [
  ['din', 'dr', 't64'],
  ['t64', 't112', 'shA', 'shB', 't160', 'cbA', 'cbB', 't208', 't270', 'rkA', 'rkB', 't300', 'cof', 'ke'],
  ['m64', 'd0', 'm112', 'd1', 'm160', 'd2', 'm208', 'd3', 'm270'],
  ['b64', 'd4', 'b112', 'd5', 'b160', 'd6', 'b208', 'd7', 'b270'],
  ['t64', 'm64', 'b64'],
  ['t112', 'm112', 'b112'],
  ['t160', 'm160', 'b160'],
  ['t208', 'm208', 'b208'],
  ['t270', 'm270', 'b270'],
  ['t300', 'kw', 'k1', 'k2', 'km', 'kb'],
  ['k1', 'ta'],
  ['k2', 'tb'],
  ['km', 'tc'],
  ['ke', 'td', 'te', 'tf'],
  ['kb', 'sa', 'sb', 'glA', 'glB'],
  ['m270', 'km'],
  ['b270', 'kb'],
]

export const pointOf = (id: string): Pt => V[id] ?? [W / 2, H / 2]

export const distance = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1])

const EDGES: ReadonlyMap<string, readonly string[]> = (() => {
  const edges = new Map<string, string[]>()
  const join = (a: string, b: string): void => {
    edges.set(a, [...(edges.get(a) ?? []), b])
  }

  for (const run of RUNS) {
    for (let i = 1; i < run.length; i += 1) {
      const a = run[i - 1]
      const b = run[i]

      if (a !== undefined && b !== undefined) {
        join(a, b)
        join(b, a)
      }
    }
  }

  return edges
})()

/** The shortest walk between two vertices, both included. */
export const routeBetween = (from: string, to: string): string[] => {
  if (from === to) {
    return [to]
  }
  const best = new Map<string, number>([[from, 0]])
  const prev = new Map<string, string>()
  const open = new Set<string>([from])

  while (open.size > 0) {
    let here = ''
    let hereCost = Infinity

    for (const id of open) {
      const cost = best.get(id) ?? Infinity

      if (cost < hereCost) {
        here = id
        hereCost = cost
      }
    }
    open.delete(here)

    if (here === to) {
      break
    }
    for (const next of EDGES.get(here) ?? []) {
      const cost = hereCost + distance(pointOf(here), pointOf(next))

      if (cost < (best.get(next) ?? Infinity)) {
        best.set(next, cost)
        prev.set(next, here)
        open.add(next)
      }
    }
  }
  if (!prev.has(to)) {
    return [to]
  }
  const route = [to]
  let at = to

  while (at !== from) {
    const back = prev.get(at)

    if (back === undefined) {
      break
    }
    route.unshift(back)
    at = back
  }

  return route
}

/** The polyline of a walk: where it starts, then each vertex. */
export const pointsOf = (from: Pt, route: readonly string[]): Pt[] => [from, ...route.map(pointOf)]

export const lengthOf = (points: readonly Pt[]): number => {
  let sum = 0

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]

    if (a !== undefined && b !== undefined) {
      sum += distance(a, b)
    }
  }

  return sum
}

/**
 * Where a walk is after `elapsed` ms: the point, and the index in `points` of
 * the vertex it is heading to (points.length when it has arrived).
 */
export const positionOn = (points: readonly Pt[], elapsedMs: number, speed: number): { at: Pt; next: number } => {
  let left = (Math.max(0, elapsedMs) / 1000) * speed

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]

    if (a === undefined || b === undefined) {
      continue
    }
    const len = distance(a, b)

    if (left < len) {
      const k = len === 0 ? 1 : left / len

      return { at: [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)], next: i }
    }
    left -= len
  }

  return { at: points[points.length - 1] ?? [0, 0], next: points.length }
}

// Desks: two rows of four, people sit facing the wall.
export type Desk = { left: number; top: number; cx: number; spot: string; decor: 'lamp' | 'mug' | 'plant' | 'books' }

// One lamp, on Claude's desk: the desks under the chat column stay quiet.
const DECOR: readonly Desk['decor'][] = ['lamp', 'mug', 'books', 'plant', 'mug', 'plant', 'books', 'mug']

export const DESKS: readonly Desk[] = Array.from({ length: 8 }, (_, i) => {
  const left = 72 + (i % 4) * 48
  const top = i < 4 ? 96 : 146

  return { left, top, cx: left + 16, spot: `d${i}`, decor: DECOR[i] ?? 'mug' }
})

export const deskOfSpot = (spot: string): number | undefined => {
  const i = DESKS.findIndex(desk => desk.spot === spot)

  return i < 0 ? undefined : i
}

/** Shared stations: the first spot faces the thing, the second waits beside it. */
export const STATIONS = {
  shelf: ['shA', 'shB'],
  cabinet: ['cbA', 'cbB'],
  globe: ['glA', 'glB'],
  rack: ['rkA', 'rkB'],
} as const

/** The kitchen table, its long side down the room: its top's corner and size. */
export const KITCHEN_TABLE = { x: 329, y: 92, w: 16, h: 40 } as const

/** Twice the table's middle: the right side draws the left mirrored, x to MIRROR - x. */
export const TABLE_MIRROR = KITCHEN_TABLE.x * 2 + KITCHEN_TABLE.w

export type TableSeat = { side: 'left' | 'right'; y: number }

/** Kitchen seats: the table's six (a side and the floor line of the row), the sofa's two, the coffee machine. */
export const TABLE_SEATS: Readonly<Record<string, TableSeat>> = {
  ta: { side: 'left', y: 102 },
  tb: { side: 'left', y: 117 },
  tc: { side: 'left', y: 132 },
  td: { side: 'right', y: 102 },
  te: { side: 'right', y: 117 },
  tf: { side: 'right', y: 132 },
}
export const SOFA_SEATS: Readonly<Record<string, number>> = { sa: 323, sb: 339 }
// Claude takes the right sofa seat first: the left one is at the message box's edge.
// The table fills face to face from the top row.
export const MAIN_SEATS: readonly string[] = ['sb', 'sa', 'ta', 'td', 'tb', 'te', 'tc', 'tf', 'cof']
export const SUB_SEATS: readonly string[] = ['ta', 'td', 'tb', 'te', 'tc', 'tf', 'sb', 'sa', 'cof']

/** The floor globe in the kitchen corner: its sphere's top-left pixel. */
export const GLOBE = { x: 362, y: 165 } as const

/** Where extra subagents stand when every desk is taken. */
export const SPARE_SPOTS: readonly string[] = ['m160', 'b112', 'm64', 'b208', 'm112', 'b160']

/** The janitor's round: in at the door, every aisle, the kitchen, out again. */
export const JANITOR_ROUTE: readonly string[] = [
  'din', 'dr', 't64', 't112', 't160', 't208', 't270', 'm270', 'd3', 'm208', 'd2', 'm160', 'd1', 'm112', 'd0',
  'm64', 'b64', 'd4', 'b112', 'd5', 'b160', 'd6', 'b208', 'd7', 'b270', 'kb', 'sa', 'sb', 'kb', 'km', 'k2', 'k1',
  'kw', 't300', 'cof', 'ke', 'tf', 'ke', 'cof', 't300', 't270', 't208', 't160', 't112', 't64', 'dr', 'din',
]

// Paper piles that appear as the context window fills: where, what, and at
// which percent each one shows. Coordinates are the pile's bottom-left.
export type ClutterKind = 'pages' | 'stack' | 'tower' | 'box' | 'boxes' | 'ball' | 'sheets'
export type Clutter = { x: number; y: number; kind: ClutterKind; at: number; onTable?: true }

export const CLUTTER: readonly Clutter[] = [
  ...DESKS.map((desk, i): Clutter => ({ x: desk.left + 23, y: desk.top + 8, kind: 'pages', at: [10, 22, 16, 28, 34, 40, 46, 52][i] ?? 50 })),
  ...DESKS.map((desk, i): Clutter => ({ x: desk.left + 2, y: desk.top + 9, kind: 'pages', at: [60, 56, 66, 58, 70, 62, 74, 64][i] ?? 60 })),
  ...DESKS.map((desk, i): Clutter => ({ x: desk.left - 1, y: desk.top + 27, kind: i % 2 === 0 ? 'stack' : 'sheets', at: [42, 48, 54, 60, 66, 72, 76, 80][i] ?? 70 })),
  { x: 100, y: 86, kind: 'ball', at: 26 },
  { x: 196, y: 88, kind: 'ball', at: 36 },
  { x: 124, y: 136, kind: 'sheets', at: 32 },
  { x: 196, y: 137, kind: 'ball', at: 44 },
  { x: 150, y: 139, kind: 'sheets', at: 57 },
  { x: 100, y: 189, kind: 'sheets', at: 38 },
  { x: 176, y: 190, kind: 'ball', at: 50 },
  { x: 224, y: 192, kind: 'sheets', at: 68 },
  { x: 250, y: 88, kind: 'ball', at: 61 },
  { x: 166, y: 73, kind: 'stack', at: 52 },
  { x: 126, y: 73, kind: 'stack', at: 63 },
  { x: 203, y: 73, kind: 'tower', at: 71 },
  { x: 82, y: 76, kind: 'box', at: 69 },
  { x: 250, y: 113, kind: 'boxes', at: 83 },
  { x: 50, y: 150, kind: 'box', at: 77 },
  { x: 278, y: 142, kind: 'boxes', at: 87 },
  { x: 50, y: 202, kind: 'boxes', at: 91 },
  { x: 262, y: 160, kind: 'ball', at: 66 },
  { x: 247, y: 162, kind: 'ball', at: 74 },
  { x: 258, y: 164, kind: 'sheets', at: 81 },
  { x: 112, y: 112, kind: 'tower', at: 85 },
  { x: 208, y: 164, kind: 'tower', at: 89 },
  { x: 160, y: 202, kind: 'box', at: 93 },
  { x: 278, y: 198, kind: 'box', at: 95 },
  { x: 312, y: 150, kind: 'stack', at: 90 },
  { x: 333, y: 104, kind: 'pages', at: 86, onTable: true },
  { x: 334, y: 119, kind: 'pages', at: 94, onTable: true },
  { x: 346, y: 156, kind: 'boxes', at: 97 },
]
