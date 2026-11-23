// What the office does. Hooks note what Claude and its subagents are doing
// (the intent); a tick turns that into walks across the room (the scene).
// Everything here is pure: same input, same output.

import type { OfficeAct, OfficeCast, OfficeIntent, OfficeScene, OfficeWalker, OfficeWorker } from '../../types'
import { LOOK_COUNT, castOf } from './casts'
import {
  DESKS,
  JANITOR_ROUTE,
  JANITOR_SPEED,
  MAIN_SEATS,
  SPARE_SPOTS,
  SPEED,
  STATIONS,
  SUB_SEATS,
  lengthOf,
  pointOf,
  pointsOf,
  positionOn,
  routeBetween,
} from './layout'
import type { Pt } from './layout'
import { hashOf } from './pixel'

export const MAIN = 'main'

/** How long a finished subagent sits in the kitchen before it goes home. */
export const REST_MS = 120_000
/** How long a worker stays at a station after its tool returned. */
const LINGER_MS = 2500
/** How long Claude waits after a turn before it goes for coffee. */
const IDLE_MS = 8000
/** The shortest stay after arriving, so a burst of quick tools doesn't jitter. */
const DWELL_MS = 1200
/** The shortest stay at a station: long enough to see the drawer open. */
const STATION_DWELL_MS = 2000

export const emptyIntent = (): OfficeIntent => ({ workers: {} })
export const emptyScene = (): OfficeScene => ({ walkers: [] })

// ---------------------------------------------------------------- intent

/** `o` without `key`: state values are JSON, so a field is left out, never undefined. */
const without = <T extends object, K extends keyof T>(o: T, key: K): Omit<T, K> => {
  const copy = { ...o }
  delete copy[key]

  return copy
}

const newWorker = (id: string, now: number): OfficeWorker => ({
  kind: id === MAIN ? 'main' : 'sub',
  title: id === MAIN ? 'Claude' : 'Subagent',
  createdAt: now,
  running: {},
  isTurnActive: false,
})

const withWorker = (
  intent: OfficeIntent,
  id: string,
  now: number,
  change: (worker: OfficeWorker) => OfficeWorker,
): OfficeIntent => ({
  ...intent,
  workers: { ...intent.workers, [id]: change(intent.workers[id] ?? newWorker(id, now)) },
})

export const ensureMain = (intent: OfficeIntent, now: number): OfficeIntent =>
  intent.workers[MAIN] === undefined ? withWorker(intent, MAIN, now, worker => worker) : intent

export const toolStarted = (intent: OfficeIntent, id: string, callId: string, act: OfficeAct, now: number): OfficeIntent =>
  withWorker(intent, id, now, worker => ({ ...worker, running: { ...worker.running, [callId]: { act, at: now } } }))

export const toolFinished = (intent: OfficeIntent, id: string, callId: string, now: number): OfficeIntent => {
  const worker = intent.workers[id]
  const run = worker?.running[callId]

  if (worker === undefined || run === undefined) {
    return intent
  }

  return {
    ...intent,
    workers: { ...intent.workers, [id]: { ...worker, running: without(worker.running, callId), lastAct: { act: run.act, at: now } } },
  }
}

export const turnStarted = (intent: OfficeIntent, id: string, now: number): OfficeIntent =>
  withWorker(intent, id, now, worker => ({ ...without(worker, 'doneAt'), isTurnActive: true }))

export const turnEnded = (intent: OfficeIntent, id: string, now: number): OfficeIntent => {
  if (id !== MAIN && intent.workers[id] === undefined) {
    return intent
  }

  return withWorker(intent, id, now, worker => ({
    ...worker,
    running: {},
    isTurnActive: false,
    turnEndedAt: now,
    ...(worker.kind === 'sub' ? { doneAt: now } : {}),
  }))
}

/** A subagent started: its task's short description is its name, and its model its looks. */
export const spawned = (intent: OfficeIntent, id: string, title: string, now: number, model?: string): OfficeIntent =>
  withWorker(intent, id, now, worker => ({
    ...worker,
    title: title.trim() === '' ? worker.title : title.trim(),
    ...(model === undefined ? {} : { model }),
  }))

/** The model a worker runs on now: Claude's changes with `/model`. */
export const setModel = (intent: OfficeIntent, id: string, model: string, now: number): OfficeIntent =>
  intent.workers[id]?.model === model ? intent : withWorker(intent, id, now, worker => ({ ...worker, model }))

export const compactStarted = (intent: OfficeIntent, now: number): OfficeIntent => ({
  ...without(intent, 'percent'),
  compactAt: now,
  compactLevel: intent.percent ?? 0,
  isCompacting: true,
})

export const compactEnded = (intent: OfficeIntent): OfficeIntent => without(without(intent, 'percent'), 'isCompacting')

/** The context window's fill, held still while a compaction runs. */
export const setPercent = (intent: OfficeIntent, percent: number | undefined): OfficeIntent => {
  if (intent.isCompacting === true) {
    return intent
  }
  const value = percent === undefined ? undefined : Math.max(0, Math.min(100, Math.round(percent)))

  if (value === intent.percent) {
    return intent
  }

  return value === undefined ? without(intent, 'percent') : { ...intent, percent: value }
}

export const dropWorkers = (intent: OfficeIntent, ids: readonly string[]): OfficeIntent => {
  const gone = ids.filter(id => id !== MAIN && intent.workers[id] !== undefined)

  if (gone.length === 0) {
    return intent
  }
  const workers = { ...intent.workers }

  for (const id of gone) {
    delete workers[id]
  }

  return { ...intent, workers }
}

// ---------------------------------------------------------------- tools

const SEARCH_CMD = /^(rg|grep|egrep|fgrep|ag|ack|find|fd|ls|tree|locate)\b|^git\s+(grep|ls-files)\b/
const READ_CMD = /^(cat|head|tail|less|more|bat|wc|jq|yq|nl|xxd|stat|file|sed\s+-n)\b/

/** The command a shell line runs first, past `cd`, variables and `sudo`. */
const firstCommand = (line: string): string => {
  for (const part of line.split(/&&|\|\||[;|\n]/)) {
    const words = part
      .trim()
      .replace(/^(\w+=\S*\s+)+/, '')
      .replace(/^(sudo|time|env|command|exec)\s+/, '')

    if (words !== '' && !/^(cd|pushd|export|set|source|\.)\b/.test(words)) {
      return words
    }
  }

  return ''
}

/** The auto-memory: a project's memory folder, or an agent's own. */
const MEMORY_PATH = /\.claude\/(?:projects\/[^/\s]+\/memory|agent-memory(?:-local)?)\//

const SAVE_TOOLS: ReadonlySet<string> = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

/** Whether a memory call writes: a file tool, or a shell line that redirects, copies or moves. */
export const isMemorySave = (tool: string, command?: string): boolean =>
  SAVE_TOOLS.has(tool) || (tool === 'Bash' && /[^2&]>|\btee\b|\bmv\b|\bcp\b/.test(command ?? ''))

/** One more memory saved: one more sticky note on the fridge. */
export const memorySaved = (intent: OfficeIntent): OfficeIntent => ({ ...intent, notes: (intent.notes ?? 0) + 1 })

/** Which station a tool sends its caller to: `paths` are the files or folders it touches. */
export const actForTool = (tool: string, command?: string, paths: readonly (string | undefined)[] = []): OfficeAct => {
  if ([command, ...paths].some(one => one !== undefined && MEMORY_PATH.test(one))) {
    return 'memory'
  }
  switch (tool) {
    case 'Grep':
    case 'Glob':
    case 'LS':
    case 'ToolSearch':
      return 'search'
    case 'Read':
    case 'NotebookRead':
    case 'Skill':
      return 'read'
    case 'WebFetch':
    case 'WebSearch':
      return 'web'
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
    case 'TodoWrite':
      return 'type'
    case 'AskUserQuestion':
      return 'ask'
    case 'Bash': {
      const first = firstCommand(command ?? '')

      return SEARCH_CMD.test(first) ? 'search' : READ_CMD.test(first) ? 'read' : 'bash'
    }
  }
  if (tool.startsWith('mcp__')) {
    const name = tool.toLowerCase()

    if (/browser|chrome|navigate|web|fetch|http|url|page|tab/.test(name)) {
      return 'web'
    }
    if (/docs?\b|read|get_|list|view/.test(name)) {
      return 'read'
    }
    if (/search|query|find|grep/.test(name)) {
      return 'search'
    }

    return 'type'
  }

  return 'think'
}

/** What a worker wants to be doing now. */
export const desiredAct = (worker: OfficeWorker, now: number): OfficeAct => {
  if (worker.kind === 'sub' && worker.doneAt !== undefined) {
    return now - worker.doneAt < REST_MS ? 'idle' : 'leave'
  }
  const runs = Object.values(worker.running)

  if (runs.length > 0) {
    return runs.reduce((a, b) => (b.at >= a.at ? b : a)).act
  }
  if (worker.lastAct !== undefined && now - worker.lastAct.at < LINGER_MS) {
    return worker.lastAct.act
  }
  if (worker.isTurnActive) {
    return 'think'
  }
  if (worker.kind === 'main') {
    return worker.turnEndedAt !== undefined && now - worker.turnEndedAt < IDLE_MS ? 'think' : 'idle'
  }

  return 'rest'
}

// ---------------------------------------------------------------- spots

const DESK_ACTS: ReadonlySet<OfficeAct> = new Set<OfficeAct>(['type', 'think', 'ask', 'rest'])
const STATION_ACTS: ReadonlySet<OfficeAct> = new Set<OfficeAct>(['search', 'read', 'bash', 'web', 'memory'])

const STATION_OF: Partial<Record<OfficeAct, readonly string[]>> = {
  search: STATIONS.cabinet,
  read: STATIONS.shelf,
  bash: STATIONS.rack,
  web: STATIONS.globe,
  memory: STATIONS.fridge,
}

export const destOf = (walker: Pick<OfficeWalker, 'route'>): string => walker.route[walker.route.length - 1] ?? 'din'

type Spot = { spot: string; act: OfficeAct; desk?: number; seat?: string }

const pickSpot = (walker: Pick<OfficeWalker, 'kind' | 'desk' | 'seat' | 'route'>, act: OfficeAct, others: readonly OfficeWalker[]): Spot => {
  const own = walker.route.length > 0 ? destOf(walker) : undefined
  const isTaken = (spot: string): boolean => spot !== own && others.some(other => destOf(other) === spot)
  const isMain = walker.kind === 'main'

  if (act === 'leave') {
    return { spot: 'din', act }
  }
  if (act === 'idle') {
    const seats = isMain ? MAIN_SEATS : SUB_SEATS
    const seat = walker.seat !== undefined && !isTaken(walker.seat) ? walker.seat : seats.find(one => !isTaken(one))

    if (seat !== undefined) {
      return { spot: seat, act, seat }
    }

    return isMain ? { spot: 'kw', act } : { spot: 'din', act: 'leave' }
  }
  const desk = isMain
    ? 0
    : (walker.desk ?? DESKS.findIndex((_, i) => i > 0 && !others.some(other => other.desk === i)))
  const hasDesk = desk !== undefined && desk >= 0
  const deskPart = hasDesk ? { desk } : {}
  const station = STATION_OF[act]

  if (station !== undefined) {
    return { spot: station.find(one => !isTaken(one)) ?? station[1] ?? station[0] ?? 'm160', act, ...deskPart }
  }
  if (hasDesk) {
    return { spot: DESKS[desk]?.spot ?? 'd0', act: DESK_ACTS.has(act) ? act : 'think', desk }
  }

  return { spot: SPARE_SPOTS.find(one => !isTaken(one)) ?? SPARE_SPOTS[0] ?? 'm160', act }
}

// ---------------------------------------------------------------- walks

type Walk = Pick<OfficeWalker, 'from' | 'route' | 'departAt' | 'arriveAt'>

const same = (a: Pt, b: Pt): boolean => a[0] === b[0] && a[1] === b[1]

/** A walk from a point along vertices; a first vertex at the start is dropped. */
const walk = (from: Pt, route: readonly string[], now: number, speed: number): Walk => {
  const first = route[0]
  const path = route.length > 1 && first !== undefined && same(pointOf(first), from) ? route.slice(1) : [...route]
  const ms = Math.round((lengthOf(pointsOf(from, path)) / speed) * 1000)

  return { from: [from[0], from[1]], route: path, departAt: now, arriveAt: now + ms }
}

const speedOf = (walker: Pick<OfficeWalker, 'kind'>): number => (walker.kind === 'janitor' ? JANITOR_SPEED : SPEED)

/** Turns a walker toward `to` from wherever it is, staying on the paths. */
const reroute = (walker: OfficeWalker, to: string, now: number): Walk => {
  const points = pointsOf(walker.from, walker.route)
  const { at, next } = positionOn(points, now - walker.departAt, speedOf(walker))

  const speed = speedOf(walker)

  if (next >= points.length) {
    return walk(at, routeBetween(destOf(walker), to), now, speed)
  }
  const ahead = walker.route[next - 1] ?? destOf(walker)
  const behind = next >= 2 ? walker.route[next - 2] : undefined
  const onward = routeBetween(ahead, to)

  // Heading back the way it came: turn around on the spot.
  if (behind !== undefined && onward[1] === behind) {
    return walk(at, routeBetween(behind, to), now, speed)
  }

  return walk(at, onward, now, speed)
}

/** Where a walker is now. */
export const placeOf = (walker: OfficeWalker, now: number): Pt =>
  positionOn(pointsOf(walker.from, walker.route), now - walker.departAt, speedOf(walker)).at

/**
 * Which look of its cast a person wears: Claude the first, a subagent one no
 * one else of its cast wears while there is one free.
 */
const lookOf = (id: string, cast: OfficeCast, others: readonly OfficeWalker[]): number => {
  if (id === MAIN) {
    return 0
  }
  const taken = new Set(others.filter(other => other.kind === 'sub' && other.cast === cast).map(other => other.look))
  const start = hashOf(id) % LOOK_COUNT

  for (let i = 0; i < LOOK_COUNT; i += 1) {
    const look = (start + i) % LOOK_COUNT

    if (!taken.has(look)) {
      return look
    }
  }

  return start
}

const optional = <K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> =>
  value === undefined ? {} : ({ [key]: value } as Record<K, V>)

/** A walker of `id` with its walk and what it does when it gets there. */
const settle = (walker: OfficeWalker, spot: Spot, walkPart: Walk): OfficeWalker => ({
  ...without(without(without(walker, 'desk'), 'seat'), 'route'),
  ...walkPart,
  act: spot.act,
  ...optional('desk', spot.desk),
  ...optional('seat', spot.seat),
})

const walkOf = (walker: OfficeWalker): Walk => ({
  from: walker.from,
  route: walker.route,
  departAt: walker.departAt,
  arriveAt: walker.arriveAt,
})

const sameWalker = (a: OfficeWalker, b: OfficeWalker): boolean => {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()

  return JSON.stringify(a, keys) === JSON.stringify(b, keys)
}

/**
 * One step of the office: workers that want elsewhere set off, arrivals at the
 * door leave, the janitor comes and goes. Returns the scene itself when nothing
 * moved, and the ids of the workers who went home.
 */
export const advance = (scene: OfficeScene, intent: OfficeIntent, now: number): { scene: OfficeScene; departed: string[] } => {
  const departed: string[] = []
  let isChanged = false
  let walkers: OfficeWalker[] = []
  let { janitor, cleanedAt } = scene

  for (const walker of scene.walkers) {
    const isHome = walker.act === 'leave' && destOf(walker) === 'din' && now >= walker.arriveAt

    if (walker.kind === 'janitor' && now >= walker.arriveAt) {
      janitor = undefined
      cleanedAt = now
      isChanged = true
    } else if (walker.kind !== 'janitor' && isHome) {
      departed.push(walker.id)
      isChanged = true
    } else {
      walkers.push(walker)
    }
  }

  const ids = Object.keys(intent.workers).sort((a, b) => {
    const wa = intent.workers[a]
    const wb = intent.workers[b]

    return Number(b === MAIN) - Number(a === MAIN) || (wa?.createdAt ?? 0) - (wb?.createdAt ?? 0)
  })
  const stray = walkers.filter(walker => walker.kind !== 'janitor' && intent.workers[walker.id] === undefined)

  for (const id of [...ids, ...stray.map(walker => walker.id)]) {
    const worker = intent.workers[id]
    const act: OfficeAct = worker === undefined ? 'leave' : desiredAct(worker, now)
    const current = walkers.find(walker => walker.id === id)
    const others = walkers.filter(walker => walker.id !== id && walker.kind !== 'janitor')

    if (current === undefined) {
      if (worker === undefined || act === 'leave') {
        departed.push(id)
        continue
      }
      const spot = pickSpot({ kind: worker.kind, route: [] }, act, others)
      const isMain = worker.kind === 'main'
      const start = isMain ? pointOf(spot.spot) : pointOf('din')
      const born: OfficeWalker = settle(
        {
          id,
          kind: worker.kind,
          cast: castOf(worker.model),
          look: lookOf(id, castOf(worker.model), others),
          title: worker.title,
          act: spot.act,
          from: [start[0], start[1]],
          route: [],
          departAt: now,
          arriveAt: now,
          ...(isMain ? {} : { bornAt: now }),
        },
        spot,
        walk(start, isMain ? [spot.spot] : routeBetween('din', spot.spot), now, SPEED),
      )
      walkers = [...walkers, born]
      isChanged = true
      continue
    }
    const isAtStation = STATION_ACTS.has(current.act)
    const dwell = isAtStation ? STATION_DWELL_MS : DWELL_MS
    const isDwelling = now >= current.arriveAt && now < current.arriveAt + dwell
    // A quick tool is over before its caller reaches the station: it still goes.
    const isFinishingErrand =
      now < current.arriveAt && isAtStation && worker !== undefined && Object.keys(worker.running).length === 0

    if ((isDwelling || isFinishingErrand) && act !== current.act) {
      continue
    }
    const spot = pickSpot(current, act, others)
    let next = settle(current, spot, spot.spot === destOf(current) ? walkOf(current) : reroute(current, spot.spot, now))
    const title = worker?.title ?? current.title
    const cast = worker === undefined ? current.cast : castOf(worker.model)

    if (title !== next.title) {
      next = { ...next, title }
    }
    if (cast !== next.cast) {
      next = { ...next, cast, look: lookOf(id, cast, others) }
    }
    if (!sameWalker(current, next)) {
      walkers = walkers.map(walker => (walker.id === id ? next : walker))
      isChanged = true
    }
  }

  const hasJanitor = walkers.some(walker => walker.kind === 'janitor')

  if (!hasJanitor && janitor === undefined && intent.compactAt !== undefined && intent.compactAt > (cleanedAt ?? 0)) {
    const door = pointOf('din')
    const round = walk(door, JANITOR_ROUTE, now, JANITOR_SPEED)
    walkers = [
      ...walkers,
      { id: 'janitor', kind: 'janitor', cast: 'plain', look: 0, title: 'Janitor', act: 'leave', bornAt: now, ...round },
    ]
    janitor = { startedAt: now, level: intent.compactLevel ?? 0, arriveAt: round.arriveAt }
    isChanged = true
  }

  const level = intent.percent

  if (level !== scene.level || intent.notes !== scene.notes) {
    isChanged = true
  }
  if (!isChanged) {
    return { scene, departed }
  }

  return {
    scene: {
      walkers,
      ...optional('level', level),
      ...optional('janitor', janitor),
      ...optional('cleanedAt', cleanedAt),
      ...optional('notes', intent.notes),
    },
    departed,
  }
}
