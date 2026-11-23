// Draws the office: the room, then everyone where the scene puts them. Walks
// run in CSS, timed against `now`, so a redraw picks a walk up where it is.

import type { OfficeAct, OfficeCast, OfficeScene, OfficeWalker } from '../../types'
import {
  CSS,
  DEFS,
  GLOWING,
  MOTION,
  NIGHT_LIGHTS,
  ROOM,
  STICKY_SPOTS,
  TABLE,
  atTable,
  clutterAt,
  doorOpen,
  drawerOpen,
  fridgeLight,
  fridgeOpen,
  stickyAt,
  globeLand,
  nightCss,
  rackLights,
  screenGlow,
  screenOf,
  steamAt,
} from './art'
import { CLAUDE_SHIRT, JANITOR as JANITOR_LOOK, LOOKS } from './casts'
import { CLUTTER, DESKS, H, JANITOR_SPEED, SOFA_SEATS, TABLE_SEATS, TITLE_BAR, W, deskOfSpot, lengthOf, pointOf, pointsOf } from './layout'
import type { Clutter, Pt } from './layout'
import { text, textWidth } from './pixel'
import { destOf, placeOf } from './world'

const DESK_ACTS: ReadonlySet<OfficeAct> = new Set<OfficeAct>(['type', 'think', 'ask', 'rest'])

const ms = (n: number): string => `${Math.round(n)}ms`
const pct = (n: number): string => `${Number(n.toFixed(3))}%`

/** A person's colors and which cast's head it wears; Claude keeps its own shirt. */
const lookStyle = (walker: OfficeWalker): string => {
  const looks = LOOKS[walker.cast] ?? LOOKS.plain
  const [h, s, shirt, p] = walker.kind === 'janitor' ? JANITOR_LOOK : (looks[walker.look % looks.length] ?? JANITOR_LOOK)
  const t = walker.kind === 'main' ? CLAUDE_SHIRT : shirt

  return `--h:${h};--s:${s};--t:${t};--p:${p};--c-${walker.kind === 'janitor' ? 'plain' : walker.cast}:inline`
}

// The wait is the animation itself, not a delay before a 1 ms one: an image
// player that skips that millisecond keeps the waiting state, and Claude stayed
// unseen at a station until the next redraw. A short wait starts part-way
// through 400 ms, since the app's player takes anything quicker for flashing.
const switchAt = (name: string, wait: number): string => {
  const run = Math.max(wait, 400)

  return `animation:${name} ${ms(run)} steps(1,end) ${ms(wait - run)} both`
}

/** Shows `body` from `at` on; drawn plainly once `at` has passed. */
const showFrom = (at: number, now: number, body: string): string =>
  at > now ? `<g style="${switchAt('ap', at - now)}">${body}</g>` : body

/** Shows `body` until `at`. */
const showUntil = (at: number, now: number, body: string): string =>
  at > now ? `<g style="${switchAt('hd', at - now)}">${body}</g>` : ''

const use = (id: string, x: number, y: number, cls?: string): string =>
  `<use href="#${id}" x="${x}" y="${y}"${cls === undefined ? '' : ` class="${cls}"`}/>`

const shadow = (x: number, y: number): string => `<path class="shw" d="M${x - 5} ${y - 1}h10v2h-10z"/>`

// ---------------------------------------------------------------- walking

type Dir = 'd' | 'u' | 'r' | 'l'
const DIRS: readonly Dir[] = ['d', 'u', 'r', 'l']

type Segment = { a: Pt; len: number; dir: Dir }

const segmentsOf = (points: readonly Pt[]): Segment[] => {
  const out: Segment[] = []

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]

    if (a === undefined || b === undefined) {
      continue
    }
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)

    if (len > 0) {
      const dir: Dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'r' : 'l') : dy >= 0 ? 'd' : 'u'
      out.push({ a, len, dir })
    }
  }

  return out
}

const frames = (a: string, b: string): string =>
  `${shadow(0, 0)}${use(a, -8, -21, 'fa')}${use(b, -8, -21, 'fb')}`

const PERSON: Readonly<Record<Dir, string>> = {
  d: frames('fA', 'fB'),
  u: frames('bA', 'bB'),
  r: frames('sA', 'sS'),
  l: `<g transform="scale(-1 1)">${frames('sA', 'sS')}</g>`,
}

const JANITOR: Readonly<Record<Dir, string>> = {
  d: `${PERSON.d}${use('cart', -7, -7)}`,
  u: `${use('cart', -7, -25)}${PERSON.u}`,
  r: `${PERSON.r}${use('cart', 6, -11)}`,
  l: `<g transform="scale(-1 1)">${PERSON.r}${use('cart', 6, -11)}</g>`,
}

/** A walk as CSS keyframes: one move, and which way the walker faces when. */
const walking = (walker: OfficeWalker, name: string, now: number): { css: string; svg: string } => {
  const points = pointsOf(walker.from, walker.route)
  const segments = segmentsOf(points)
  const dest = points[points.length - 1]
  const total = segments.reduce((sum, one) => sum + one.len, 0)

  if (dest === undefined || total === 0 || walker.arriveAt <= now) {
    return { css: '', svg: '' }
  }
  const timing = `${ms(walker.arriveAt - walker.departAt)} steps(1,end) ${ms(walker.departAt - now)} both`
  const facing: Record<Dir, string> = { d: '', u: '', r: '', l: '' }
  const used = new Set<Dir>()
  let move = ''
  let done = 0

  for (const one of segments) {
    const at = pct((done / total) * 100)
    move += `${at}{transform:translate(${one.a[0] - dest[0]}px,${one.a[1] - dest[1]}px);animation-timing-function:steps(${Math.max(1, Math.round(one.len))},end)}`

    for (const dir of DIRS) {
      facing[dir] += `${at}{opacity:${one.dir === dir ? 1 : 0}}`
    }
    used.add(one.dir)
    done += one.len
  }
  const look = walker.kind === 'janitor' ? JANITOR : PERSON
  let css = `@keyframes ${name}{${move}100%{transform:translate(0px,0px)}}`
  let body = ''

  for (const dir of DIRS) {
    if (used.has(dir)) {
      css += `@keyframes ${name}${dir}{${facing[dir]}100%{opacity:0}}`
      body += `<g opacity="0" style="animation:${name}${dir} ${timing}">${look[dir]}</g>`
    }
  }
  const born = walker.bornAt !== undefined && now - walker.bornAt < 600 ? walker.bornAt : undefined
  const fade = born === undefined ? '' : ` style="animation:fi 400ms steps(4,end) ${ms(born - now)} both"`

  return {
    css,
    svg: `<g transform="translate(${dest[0]} ${dest[1]})"${fade}><g style="animation:${name} ${timing}">${body}</g></g>`,
  }
}

type Layered = { y: number; svg: string }

/**
 * A walk cut where it crosses the depth of something that stands still: each
 * piece sits at its own depth and shows only while the walker is on it. Sorted
 * once at the walk's start, a chair below the start stayed over the walker
 * after it went past, until the next redraw.
 */
const byDepth = (walker: OfficeWalker, svg: string, depths: readonly number[], now: number): Layered[] => {
  const points = pointsOf(walker.from, walker.route)
  const total = lengthOf(points)
  const span = walker.arriveAt - walker.departAt

  if (total === 0 || span <= 0) {
    return [{ y: placeOf(walker, now)[1], svg }]
  }
  // Where along the walk it crosses a depth, and its depth halfway along each piece.
  const cuts: number[] = [0, total]
  const yAt = (along: number): number => {
    let left = along

    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]
      const b = points[i]

      if (a === undefined || b === undefined) {
        continue
      }
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])

      if (left <= len) {
        return a[1] + (b[1] - a[1]) * (len === 0 ? 1 : left / len)
      }
      left -= len
    }

    return points[points.length - 1]?.[1] ?? 0
  }
  let done = 0

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]

    if (a === undefined || b === undefined) {
      continue
    }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])

    for (const depth of depths) {
      if ((a[1] - depth) * (b[1] - depth) < 0) {
        cuts.push(done + (len * (depth - a[1])) / (b[1] - a[1]))
      }
    }
    done += len
  }
  cuts.sort((a, b) => a - b)
  const timeAt = (along: number): number => walker.departAt + (along / total) * span
  const pieces: Layered[] = []

  for (let i = 1; i < cuts.length; i += 1) {
    const from = cuts[i - 1] ?? 0
    const to = cuts[i] ?? total

    if (to - from <= 0) {
      continue
    }
    const start = timeAt(from)
    const end = timeAt(to)
    const isLast = i === cuts.length - 1

    if (!isLast && end <= now) {
      continue
    }
    // The last piece ends with the walk itself, which hides at arrival.
    const until = isLast ? svg : showUntil(end, now, svg)
    pieces.push({ y: yAt((from + to) / 2), svg: showFrom(start, now, until) })
  }

  return pieces
}

// ---------------------------------------------------------------- poses

const bubble = (act: OfficeAct, x: number, y: number): string => {
  if (act === 'think') {
    return `${use('bub', x, y)}<path class="ol d1" d="M${x + 2} ${y + 3}h1v1h-1z"/><path class="ol d2" d="M${x + 5} ${y + 3}h1v1h-1z"/><path class="ol d3" d="M${x + 8} ${y + 3}h1v1h-1z"/>`
  }
  if (act === 'ask') {
    return `${use('bub', x, y)}${text('ol', '?', x + 4, y + 1)}`
  }

  return ''
}

/** What a walker looks like once there: the person, what goes over the table, its bubble. */
type Pose = { body: string; front: string; over: string; y: number }

const poseOf = (walker: OfficeWalker): Pose | undefined => {
  const spot = destOf(walker)
  const [x, y] = pointOf(spot)
  const desk = deskOfSpot(spot)
  const table = TABLE_SEATS[spot]
  const sofa = SOFA_SEATS[spot]

  if (spot === 'din') {
    return undefined
  }
  if (desk !== undefined && DESK_ACTS.has(walker.act)) {
    const at = DESKS[desk]

    if (at !== undefined) {
      const bob = walker.act === 'type' ? 'ty' : walker.act === 'think' ? 'br' : undefined
      const left = at.cx - 8
      const top = at.top + 6

      return { body: `${use('kB', left, top, bob)}${use('chb', left, top)}`, front: '', over: bubble(walker.act, at.cx + 5, at.top - 5), y: at.top + 27 }
    }
  }
  if (table !== undefined) {
    return { ...atTable(table), over: '', y: table.y }
  }
  if (sofa !== undefined) {
    return { body: `${use('kF', sofa - 8, 160)}${use('phone', sofa - 1, 172)}`, front: '', over: '', y: 180 }
  }
  let body: string

  if (spot === 'shA' || spot === 'shB') {
    body = `${use('rd', x - 8, y - 21)}${use('book', x - 4, y - 9)}`
  } else if (spot === 'glA') {
    body = use('sS', x - 8, y - 21)
  } else if (spot === 'frA' && walker.act === 'memory') {
    body = `<g class="rum">${use('bS', x - 8, y - 21)}</g>`
  } else if (spot === 'kw') {
    body = use('fS', x - 8, y - 21)
  } else {
    body = use('bS', x - 8, y - 21)
  }

  return { body: `${shadow(x, y)}${body}`, front: '', over: bubble(walker.act, x + 3, y - 31), y }
}

// ---------------------------------------------------------------- paper

/** When the janitor passes nearest to `pile`, in ms from its start. */
const passOf = (janitor: OfficeWalker, pile: Clutter): number => {
  const points = pointsOf(janitor.from, janitor.route)
  const px = pile.x + 4
  const py = pile.y - 4
  let best = Infinity
  let bestAt = 0
  let done = 0

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]

    if (a === undefined || b === undefined) {
      continue
    }
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)
    const k = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (len * len)))
    const gap = Math.hypot(a[0] + dx * k - px, a[1] + dy * k - py)

    if (gap < best) {
      best = gap
      bestAt = done + len * k
    }
    done += len
  }

  return (bestAt / JANITOR_SPEED) * 1000
}

const paper = (scene: OfficeScene, janitor: OfficeWalker | undefined, now: number, isOnTable: boolean): string => {
  const level = scene.level ?? 0
  const swept = scene.janitor !== undefined && janitor !== undefined ? scene.janitor.level : -1
  let out = ''

  for (const pile of CLUTTER) {
    if ((pile.onTable === true) !== isOnTable) {
      continue
    }
    const drawn = clutterAt(pile.x, pile.y, pile.kind)

    if (pile.at <= level) {
      out += drawn
    } else if (janitor !== undefined && pile.at <= swept) {
      const gone = janitor.departAt + passOf(janitor, pile)

      if (gone + 600 > now) {
        out += `<g style="animation:fo 600ms steps(3,end) ${ms(gone - now)} both">${drawn}</g>`
      }
    }
  }

  return out
}

// ---------------------------------------------------------------- the board

const BOARD_LABEL = 'CONTEXT'

const board = (level: number | undefined): string => {
  const label = level === undefined ? '--%' : `${level}%`
  const color = level === undefined ? 'dn' : level >= 80 ? 'lr' : level >= 50 ? 'la' : 'lg'
  const digits = text(color, label, Math.round(331 - textWidth(label, 2) / 2), 13, 2)
  const lit = level === undefined ? 0 : Math.round(level / 10)
  let bar = ''

  for (let i = 0; i < 10; i += 1) {
    bar += `<path class="${i < lit ? color : 'doff'}" d="M${316 + i * 3} 24h2v2h-2z"/>`
  }

  return `<path class="sc" d="M314 6h34v20h-34z"/>${text('dl', BOARD_LABEL, Math.round(331 - textWidth(BOARD_LABEL) / 2), 7)}${digits}${bar}`
}

// ---------------------------------------------------------------- the office

const isAt = (walker: OfficeWalker, spots: readonly string[], act: OfficeAct): boolean =>
  walker.act === act && spots.includes(destOf(walker))

/** The whole backdrop for this scene at `now`; `dark` draws the night whatever the mode. */
export const renderOffice = (scene: OfficeScene, now: number, opts: { dark?: boolean } = {}): string => {
  const people = scene.walkers.filter(walker => walker.kind !== 'janitor')
  const janitor = scene.walkers.find(walker => walker.kind === 'janitor')
  const layer: Layered[] = []
  const walks: { walker: OfficeWalker; svg: string }[] = []
  let css = ''
  let front = ''
  let over = ''
  let back = ''
  let glow = ''

  scene.walkers.forEach((walker, i) => {
    const walk = walking(walker, `k${i}`, now)
    const pose = poseOf(walker)
    const style = ` style="${lookStyle(walker)}"`
    css += walk.css

    if (walk.svg !== '') {
      walks.push({ walker, svg: `<g${style}>${walk.svg}</g>` })
    }
    if (pose !== undefined) {
      layer.push({ y: pose.y, svg: `<g${style}>${showFrom(walker.arriveAt, now, pose.body)}</g>` })
      front += showFrom(walker.arriveAt, now, pose.front)
      over += showFrom(walker.arriveAt, now, pose.over)
    }
    if (walker.bornAt !== undefined && now - walker.bornAt < 1600) {
      back += showUntil(walker.bornAt + 1600, now, doorOpen())
    }
    if (destOf(walker) === 'din' && walker.arriveAt > now) {
      back += showFrom(walker.arriveAt - 1200, now, doorOpen())
    }
  })

  // Desks: a chair waits empty, or holds someone with the screen on.
  let screens = ''

  DESKS.forEach((desk, i) => {
    const sitter = people.find(walker => walker.desk === i && deskOfSpot(destOf(walker)) === i && DESK_ACTS.has(walker.act))

    // Half a row up, so a chair someone is walking to stays behind them once
    // they sit: drawn over them it hid their shirt until the next redraw.
    if (sitter === undefined || sitter.arriveAt > now) {
      layer.push({
        y: desk.top + 26.5,
        svg: `<path class="chf" d="M${desk.cx - 5} ${desk.top + 17}h10v3h-10z"/>${use('chb', desk.cx - 8, desk.top + 6)}`,
      })
    }
    if (sitter === undefined) {
      screens += screenOf(i, 'off')
      return
    }
    const mode = sitter.act === 'type' ? 'type' : 'on'
    screens += sitter.arriveAt > now ? screenOf(i, 'off') + showFrom(sitter.arriveAt, now, screenOf(i, mode)) : screenOf(i, mode)
    glow += showFrom(sitter.arriveAt, now, screenGlow(i))
  })

  const searcher = people.find(walker => isAt(walker, ['cbA', 'cbB'], 'search'))
  const brewer = people.find(walker => destOf(walker) === 'cof')
  back += searcher === undefined ? '' : showFrom(searcher.arriveAt, now, drawerOpen())
  back += globeLand(people.some(walker => isAt(walker, ['glA', 'glB'], 'web')))
  back += brewer === undefined ? '' : showFrom(brewer.arriveAt, now, steamAt(303, 36))

  // The fridge: open while someone looks inside; a new sticky goes up once they are there.
  const fridger = people.find(walker => isAt(walker, ['frA'], 'memory'))
  back += fridger === undefined ? '' : showFrom(fridger.arriveAt, now, fridgeOpen())
  glow += fridger === undefined ? '' : showFrom(fridger.arriveAt, now, fridgeLight())
  const notes = Math.min(scene.notes ?? 0, STICKY_SPOTS.length)

  for (let i = 0; i < notes; i += 1) {
    const isNewest = i === notes - 1 && fridger !== undefined
    back += isNewest ? showFrom(fridger.arriveAt + 900, now, stickyAt(i)) : stickyAt(i)
  }

  // Walks go in last, cut at the depths of everything standing still.
  const depths = [...new Set(layer.map(one => one.y))]

  for (const one of walks) {
    layer.push(...byDepth(one.walker, one.svg, depths, now))
  }
  const bodies = layer
    .sort((a, b) => a.y - b.y)
    .map(one => one.svg)
    .join('')
  const busy = people.some(walker => isAt(walker, ['rkA', 'rkB'], 'bash'))
  const lit = `${screens}${rackLights(busy)}${board(scene.level)}`

  return [
    // The top stays in view and a wide window crops the floor: the board is up there.
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-TITLE_BAR} ${W} ${H + TITLE_BAR}" preserveAspectRatio="xMidYMin slice" shape-rendering="crispEdges">`,
    // Long loops keep their phase across redraws instead of starting over.
    `<style>${CSS}${MOTION}${nightCss(opts.dark === true)}.cd{animation-delay:-${now % 96_000}ms}${css}</style>`,
    DEFS,
    ROOM,
    back,
    paper(scene, janitor, now, false),
    bodies,
    TABLE,
    front,
    paper(scene, janitor, now, true),
    `<path class="night nt" d="M0 ${-TITLE_BAR}h${W}v${H + TITLE_BAR}h-${W}z"/>`,
    GLOWING,
    lit,
    over,
    `<g class="night">${NIGHT_LIGHTS}${glow}</g>`,
    '</svg>',
  ].join('')
}

const ACTS: Readonly<Record<OfficeAct, string>> = {
  type: 'is typing at the desk',
  think: 'is thinking at the desk',
  ask: 'is waiting for an answer',
  rest: 'is sitting at the desk',
  search: 'is searching the filing cabinet',
  read: 'is reading at the bookcase',
  bash: 'is working at the server rack',
  web: 'is spinning the globe',
  memory: 'is looking in the fridge',
  idle: 'is resting in the kitchen',
  leave: 'is going home',
}

/** The backdrop in words, for a reader that cannot see it. */
const MODEL_NAMES: Readonly<Record<OfficeCast, string>> = {
  plain: 'another model',
  opus: 'Opus',
  fable: 'Fable',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
}

/** How many subagents run on each model, the most first: "2 on Opus, 1 on Haiku". */
const modelsOf = (subs: readonly OfficeWalker[]): string => {
  const counts = new Map<OfficeCast, number>()

  for (const walker of subs) {
    counts.set(walker.cast, (counts.get(walker.cast) ?? 0) + 1)
  }

  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([cast, n]) => `${n} on ${MODEL_NAMES[cast]}`)
    .join(', ')
}

export const describeOffice = (scene: OfficeScene): string => {
  const main = scene.walkers.find(walker => walker.kind === 'main')
  const subs = scene.walkers.filter(walker => walker.kind === 'sub')
  const parts = ['A pixel office.']

  if (main !== undefined) {
    const model = main.cast === 'plain' ? '' : ` (${MODEL_NAMES[main.cast]})`
    parts.push(`Claude${model} ${ACTS[main.act]}.`)
  }
  if (subs.length > 0) {
    parts.push(`Subagents in the office: ${subs.length} (${modelsOf(subs)}).`)
  }
  parts.push(scene.level === undefined ? 'Context fill is not known yet.' : `Context is ${scene.level}% full.`)

  if ((scene.notes ?? 0) > 0) {
    parts.push(`Sticky notes on the fridge: ${Math.min(scene.notes ?? 0, STICKY_SPOTS.length)}.`)
  }
  if (scene.janitor !== undefined) {
    parts.push('The janitor is clearing away the papers after the context was compacted.')
  }

  return parts.join(' ')
}
