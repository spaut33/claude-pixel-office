// Pixel office: a backdrop where Claude and its subagents walk to the
// station of each tool they run, and paper piles up as the context fills.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage } from 'claude-code'

import type { OfficeIntent } from '../types'
import { describeOffice, renderOffice } from './office/scene'
import {
  MAIN,
  actForTool,
  advance,
  compactEnded,
  compactStarted,
  dropWorkers,
  emptyIntent,
  emptyScene,
  ensureMain,
  isMemorySave,
  memorySaved,
  setPercent,
  spawned,
  toolFinished,
  toolStarted,
  turnEnded,
  turnStarted,
} from './office/world'

const SCENE = 'office'

/** A string field of a tool call's input, whichever tool it is. */
const fieldOf = (input: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(input, key)

  return typeof value === 'string' ? value : undefined
}

// Change a tag when that value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const intentAtom = atom({ plugin: 'pixel-office', key: 'intent' } as const, emptyIntent(), { shape: 'intent-1' })
const sceneAtom = atom({ plugin: 'pixel-office', key: 'scene' } as const, emptyScene(), { shape: 'scene-1' })

// One change at a time: each job reads, changes and writes the state, and the
// next starts only when it is done, so events and the tick never race.
let queue: Promise<void> = Promise.resolve()

const serial = ($: EngineInterface, job: () => Promise<void>): Promise<void> => {
  const run = queue.then(job).catch((error: unknown) => {
    $.ui.log(`pixel-office: ${error instanceof Error ? error.message : String(error)}`)
  })
  queue = run

  return run
}

/** Moves the office on to now and writes the scene if anyone moved. */
const step = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  const intent = await read($, intentAtom)
  const scene = await read($, sceneAtom)
  const moved = advance(scene, intent, now)

  if (moved.scene !== scene) {
    await update($, sceneAtom, () => moved.scene)
  }
  if (moved.departed.length > 0) {
    await update($, intentAtom, current => dropWorkers(current, moved.departed))
  }
}

/** Notes an event in the intent, then moves the office at once. */
const note = ($: EngineInterface, change: (intent: OfficeIntent, now: number) => OfficeIntent): void => {
  void serial($, async () => {
    const now = await $.clock.now()
    await update($, intentAtom, intent => change(intent, now))
    await step($)
  })
}

// The app's context meter measures against the compaction window (the
// auto-compact setting), not the model's whole window. Working that window out
// estimates every category, so it is re-read twice a minute, not every tick.
const WINDOW_EVERY_MS = 30_000
let compactWindow: { tokens: number; readAt: number } | undefined

/** The context fill as the app's meter shows it; undefined before the first response. */
const fillOf = async ($: EngineInterface, context: SessionContextUsage): Promise<number | undefined> => {
  if (context.tokens === undefined) {
    return undefined
  }
  const now = await $.clock.now()

  if (compactWindow === undefined || now - compactWindow.readAt >= WINDOW_EVERY_MS) {
    let tokens = context.window

    try {
      tokens = (await $.session.usage({ breakdown: 'summary' })).context.breakdown?.rawMaxTokens ?? context.window
    } catch {
      // no breakdown here: measure against the model's window rather than stop the board
    }
    compactWindow = { tokens, readAt: now }
  }

  return compactWindow.tokens > 0 ? (context.tokens / compactWindow.tokens) * 100 : context.percent
}

let isTicking = false

/** Once a second: the context window's fill, then a step. */
const tick = ($: EngineInterface): void => {
  if (isTicking) {
    return
  }
  isTicking = true
  void serial($, async () => {
    try {
      const { context } = await $.session.usage()
      const percent = await fillOf($, context)
      const intent = await read($, intentAtom)

      if (setPercent(intent, percent) !== intent) {
        await update($, intentAtom, current => setPercent(current, percent))
      }
      await step($)
    } finally {
      isTicking = false
    }
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Light glass: the office stays visible behind the chat, the text still reads.
    await $.theme.set({ backdrop: { scene: SCENE, glass: { blur: 2, opacity: 0.45 } } })
    note($, (intent, now) => ensureMain(intent, now))
    $.clock.every(1000, () => tick($))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const who = e.agentId ?? MAIN
    const id = e.tool_use_id
    const paths = ['file_path', 'path', 'notebook_path'].map(key => fieldOf(e, key))
    const act = actForTool(e.tool, e.tool === 'Bash' ? e.command : undefined, paths)

    // Only Claude and the subagents it started: engine forks stay off the floor.
    // The engine's memory fork saves for Claude, so Claude goes to the fridge.
    const isSave = act === 'memory' && isMemorySave(e.tool, e.tool === 'Bash' ? e.command : undefined)

    note($, (intent, now) => {
      const noted = isSave ? memorySaved(intent) : intent

      if (who === MAIN || intent.workers[who] !== undefined) {
        return toolStarted(noted, who, id, act, now)
      }

      return act === 'memory' ? toolStarted(noted, MAIN, id, act, now) : intent
    })
    try {
      return await next(e)
    } finally {
      note($, (intent, now) => toolFinished(toolFinished(intent, who, id, now), MAIN, id, now))
    }
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const id = 'agentId' in started ? started.agentId : undefined

    if (id !== undefined) {
      note($, (intent, now) => spawned(intent, id, e.description, now))
    }

    return started
  }).catch(($, e, next) => next(e))

  on('turn.start', ($, e, next) => {
    note($, (intent, now) => turnStarted(intent, e.agentId ?? MAIN, now))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', ($, e, next) => {
    note($, (intent, now) => turnEnded(intent, e.agentId ?? MAIN, now))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined || e.trigger === 'precompute') {
      return next(e)
    }
    note($, (intent, now) => compactStarted(intent, now))
    try {
      return await next(e)
    } finally {
      note($, intent => compactEnded(intent))
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const isOurs = e.props.plugin === $.plugin.name && e.props.scene === SCENE

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || !isOurs) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const scene = await read($, sceneAtom)
    const now = await $.clock.now()

    return <Svg source={renderOffice(scene, now)} alt={describeOffice(scene)} isInteractive />
  }).catch(($, e, next) => next(e))
}
