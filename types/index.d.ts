/** What a worker does at its destination. */
export type OfficeAct =
  | 'type'
  | 'think'
  | 'ask'
  | 'rest'
  | 'search'
  | 'read'
  | 'bash'
  | 'web'
  | 'memory'
  | 'idle'
  | 'leave'

/** Who a person looks like: the family of the model it runs on. */
export type OfficeCast = 'plain' | 'opus' | 'fable' | 'sonnet' | 'haiku'

/** One running tool call of a worker. */
export type OfficeRun = { act: OfficeAct; at: number }

/** What the hooks know about one worker: Claude itself or a subagent. */
export type OfficeWorker = {
  kind: 'main' | 'sub'
  title: string
  /** The model it runs on, as the engine names it. */
  model?: string
  createdAt: number
  running: Record<string, OfficeRun>
  lastAct?: OfficeRun
  isTurnActive: boolean
  turnEndedAt?: number
  doneAt?: number
}

/** Everything the hooks heard, written by events and read by the tick. */
export type OfficeIntent = {
  workers: Record<string, OfficeWorker>
  percent?: number
  compactAt?: number
  compactLevel?: number
  isCompacting?: boolean
  /** Memories saved this session: each one is a sticky note on the fridge. */
  notes?: number
}

/** One person on the floor and the walk it is on. */
export type OfficeWalker = {
  id: string
  kind: 'main' | 'sub' | 'janitor'
  cast: OfficeCast
  /** Which of its cast's looks. */
  look: number
  title: string
  act: OfficeAct
  from: [number, number]
  route: string[]
  departAt: number
  arriveAt: number
  bornAt?: number
  desk?: number
  seat?: string
}

/** What the backdrop draws. */
export type OfficeScene = {
  walkers: OfficeWalker[]
  level?: number
  janitor?: { startedAt: number; level: number; arriveAt: number }
  cleanedAt?: number
  notes?: number
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-office': {
      intent: Shaped<OfficeIntent>
      scene: Shaped<OfficeScene>
    }
  }
}
