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
  | 'idle'
  | 'leave'

/** One running tool call of a worker. */
export type OfficeRun = { act: OfficeAct; at: number }

/** What the hooks know about one worker: Claude itself or a subagent. */
export type OfficeWorker = {
  kind: 'main' | 'sub'
  title: string
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
}

/** One person on the floor and the walk it is on. */
export type OfficeWalker = {
  id: string
  kind: 'main' | 'sub' | 'janitor'
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
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-office': {
      intent: Shaped<OfficeIntent>
      scene: Shaped<OfficeScene>
    }
  }
}
