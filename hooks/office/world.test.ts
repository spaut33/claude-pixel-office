// Tests for the pure logic in world.ts. Run: deno test --unstable-sloppy-imports

import assert from 'node:assert/strict'

import type { OfficeIntent, OfficeScene, OfficeWorker } from '../../types'
import {
  MAIN,
  REST_MS,
  actForTool,
  advance,
  desiredAct,
  destOf,
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
} from './world'
import { STATIONS } from './layout'

const MEMORY = '/Users/me/.claude/projects/-Users-me-app/memory/notes.md'

const worker = (change: Partial<OfficeWorker> = {}): OfficeWorker => ({
  kind: 'main',
  title: 'Claude',
  createdAt: 0,
  running: {},
  isTurnActive: false,
  ...change,
})

Deno.test('actForTool: built-in tools go to their station', () => {
  assert.equal(actForTool('Grep'), 'search')
  assert.equal(actForTool('Glob'), 'search')
  assert.equal(actForTool('Read'), 'read')
  assert.equal(actForTool('Skill'), 'read')
  assert.equal(actForTool('WebFetch'), 'web')
  assert.equal(actForTool('WebSearch'), 'web')
  assert.equal(actForTool('Edit'), 'type')
  assert.equal(actForTool('Write'), 'type')
  assert.equal(actForTool('TodoWrite'), 'type')
  assert.equal(actForTool('AskUserQuestion'), 'ask')
})

Deno.test('actForTool: an unknown tool makes Claude think', () => {
  assert.equal(actForTool('SomethingNew'), 'think')
})

Deno.test('actForTool: Bash goes by the first real command', () => {
  assert.equal(actForTool('Bash', 'rg foo src'), 'search')
  assert.equal(actForTool('Bash', 'cd app && grep -rn foo .'), 'search')
  assert.equal(actForTool('Bash', 'git grep foo'), 'search')
  assert.equal(actForTool('Bash', 'cat README.md'), 'read')
  assert.equal(actForTool('Bash', 'FOO=1 sudo head -5 file'), 'read')
  assert.equal(actForTool('Bash', 'npm test'), 'bash')
  assert.equal(actForTool('Bash', 'cd app && npm test'), 'bash')
  assert.equal(actForTool('Bash'), 'bash')
})

Deno.test('actForTool: the auto-memory folder is the fridge, whatever the tool', () => {
  assert.equal(actForTool('Read', undefined, [MEMORY]), 'memory')
  assert.equal(actForTool('Write', undefined, [MEMORY]), 'memory')
  assert.equal(actForTool('Bash', `cat ${MEMORY}`), 'memory')
  assert.equal(actForTool('Read', undefined, ['/Users/me/.claude/agent-memory/reviewer/a.md']), 'memory')
  assert.equal(actForTool('Read', undefined, ['/Users/me/app/src/memory.ts']), 'read')
})

Deno.test('actForTool: MCP tools go by their name', () => {
  assert.equal(actForTool('mcp__chrome__navigate'), 'web')
  assert.equal(actForTool('mcp__docs__get_page'), 'web')
  assert.equal(actForTool('mcp__jira__jira_get_issue'), 'read')
  assert.equal(actForTool('mcp__jira__jira_list_components'), 'read')
  assert.equal(actForTool('mcp__jira__jira_search'), 'search')
  assert.equal(actForTool('mcp__jira__jira_create_issue'), 'type')
})

Deno.test('isMemorySave: file tools write, shell lines write only when they redirect, copy or move', () => {
  assert.equal(isMemorySave('Write'), true)
  assert.equal(isMemorySave('Edit'), true)
  assert.equal(isMemorySave('Read'), false)
  assert.equal(isMemorySave('Bash', `echo hi > ${MEMORY}`), true)
  assert.equal(isMemorySave('Bash', `echo hi >> ${MEMORY}`), true)
  assert.equal(isMemorySave('Bash', `echo hi | tee ${MEMORY}`), true)
  assert.equal(isMemorySave('Bash', `cp a.md ${MEMORY}`), true)
  assert.equal(isMemorySave('Bash', `cat ${MEMORY}`), false)
  assert.equal(isMemorySave('Bash', `cat ${MEMORY} 2>/dev/null`), false)
  assert.equal(isMemorySave('Bash', `cat ${MEMORY} 2>&1`), false)
  assert.equal(isMemorySave('Bash'), false)
})

Deno.test('memorySaved: each save is one more note', () => {
  const once = memorySaved(emptyIntent())
  assert.equal(once.notes, 1)
  assert.equal(memorySaved(once).notes, 2)
})

Deno.test('intent: a tool call is tracked from start to finish', () => {
  let intent = ensureMain(emptyIntent(), 0)
  intent = toolStarted(intent, MAIN, 'c1', 'read', 100)
  assert.deepEqual(intent.workers[MAIN]?.running, { c1: { act: 'read', at: 100 } })

  intent = toolFinished(intent, MAIN, 'c1', 200)
  assert.deepEqual(intent.workers[MAIN]?.running, {})
  assert.deepEqual(intent.workers[MAIN]?.lastAct, { act: 'read', at: 200 })
})

Deno.test('intent: finishing an unknown call changes nothing', () => {
  const intent = ensureMain(emptyIntent(), 0)
  assert.equal(toolFinished(intent, MAIN, 'nope', 5), intent)
  assert.equal(toolFinished(intent, 'ghost', 'c1', 5), intent)
})

Deno.test('intent: a subagent is named by its task and done when its turn ends', () => {
  let intent = spawned(emptyIntent(), 'a1', '  Review the diff  ', 0, 'claude-opus-5-5')
  assert.equal(intent.workers.a1?.title, 'Review the diff')
  assert.equal(intent.workers.a1?.model, 'claude-opus-5-5')

  intent = turnStarted(intent, 'a1', 10)
  assert.equal(intent.workers.a1?.isTurnActive, true)
  intent = turnEnded(intent, 'a1', 20)
  assert.equal(intent.workers.a1?.isTurnActive, false)
  assert.equal(intent.workers.a1?.doneAt, 20)
})

Deno.test('intent: a turn end for an unknown subagent is ignored, Claude always gets one', () => {
  const intent = emptyIntent()
  assert.equal(turnEnded(intent, 'ghost', 5), intent)
  assert.equal(turnEnded(intent, MAIN, 5).workers[MAIN]?.turnEndedAt, 5)
})

Deno.test('setPercent: rounds, clamps, and holds still during a compaction', () => {
  const intent = emptyIntent()
  assert.equal(setPercent(intent, 41.6).percent, 42)
  assert.equal(setPercent(intent, 140).percent, 100)
  assert.equal(setPercent(intent, -5).percent, 0)
  assert.equal('percent' in setPercent({ ...intent, percent: 10 }, undefined), false)

  const same = { ...intent, percent: 42 }
  assert.equal(setPercent(same, 42), same)

  const compacting = { ...intent, percent: 80, isCompacting: true }
  assert.equal(setPercent(compacting, 5), compacting)
})

Deno.test('dropWorkers: removes subagents, never Claude', () => {
  let intent = ensureMain(spawned(emptyIntent(), 'a1', 'Task', 0), 0)
  intent = dropWorkers(intent, ['a1', MAIN, 'ghost'])
  assert.deepEqual(Object.keys(intent.workers), [MAIN])

  const nothing = dropWorkers(intent, ['ghost'])
  assert.equal(nothing, intent)
})

Deno.test('desiredAct: a running tool wins, the latest one if several', () => {
  const now = 10_000
  const running = { a: { act: 'read', at: 100 }, b: { act: 'bash', at: 200 } } as const

  assert.equal(desiredAct(worker({ running: { ...running }, isTurnActive: true }), now), 'bash')
})

Deno.test('desiredAct: a station is kept briefly after the tool returned, then Claude thinks or rests', () => {
  const lastAct = { act: 'search', at: 10_000 } as const

  assert.equal(desiredAct(worker({ lastAct, isTurnActive: true }), 11_000), 'search')
  assert.equal(desiredAct(worker({ lastAct, isTurnActive: true }), 13_000), 'think')
  assert.equal(desiredAct(worker({ lastAct, isTurnActive: false, turnEndedAt: 12_000 }), 14_000), 'think')
  assert.equal(desiredAct(worker({ turnEndedAt: 1000 }), 20_000), 'idle')
  assert.equal(desiredAct(worker(), 1000), 'idle')
})

Deno.test('desiredAct: a finished subagent rests in the kitchen, then leaves', () => {
  const done = worker({ kind: 'sub', doneAt: 1000 })

  assert.equal(desiredAct(done, 1000 + REST_MS - 1), 'idle')
  assert.equal(desiredAct(done, 1000 + REST_MS), 'leave')
  assert.equal(desiredAct(worker({ kind: 'sub' }), 1000), 'rest')
})

const read = (intent: OfficeIntent, now: number): OfficeIntent =>
  toolStarted(turnStarted(ensureMain(intent, now), MAIN, now), MAIN, 'c1', 'read', now)

Deno.test('advance: Claude sits down, then walks to the shelf for a read', () => {
  let scene: OfficeScene = emptyScene()
  const idle = ensureMain(emptyIntent(), 0)

  scene = advance(scene, idle, 0).scene
  assert.equal(scene.walkers.length, 1)
  assert.equal(scene.walkers[0]?.id, MAIN)

  scene = advance(scene, read(idle, 5000), 5000).scene
  const claude = scene.walkers[0]
  assert.equal(claude?.act, 'read')
  assert.ok(claude !== undefined && (STATIONS.shelf as readonly string[]).includes(destOf(claude)))
})

Deno.test('advance: same input, same output, and the scene itself when nothing moved', () => {
  const intent = ensureMain(emptyIntent(), 0)
  const first = advance(emptyScene(), intent, 0)
  const again = advance(emptyScene(), intent, 0)
  assert.deepEqual(first, again)

  const quiet = advance(first.scene, intent, 1)
  assert.equal(quiet.scene, first.scene)
  assert.deepEqual(quiet.departed, [])
})

Deno.test('advance: a subagent walks in, rests, goes home, and is reported as departed', () => {
  let intent = ensureMain(spawned(emptyIntent(), 'a1', 'Task', 0), 0)
  intent = turnStarted(intent, 'a1', 0)
  let { scene } = advance(emptyScene(), intent, 0)
  assert.deepEqual(scene.walkers.map(one => one.id).sort(), ['a1', MAIN])

  intent = turnEnded(intent, 'a1', 1000)
  scene = advance(scene, intent, 1000).scene

  const leaving = advance(scene, intent, 1000 + REST_MS + 1)
  assert.equal(leaving.scene.walkers.find(one => one.id === 'a1')?.act, 'leave')

  const gone = advance(leaving.scene, intent, 1000 + REST_MS + 60_000)
  // The id may be reported twice (arrival at the door, then the intent still lists it): dropWorkers is idempotent.
  assert.deepEqual([...new Set(gone.departed)], ['a1'])
  assert.equal(gone.scene.walkers.some(one => one.id === 'a1'), false)
})

Deno.test('advance: a compaction sends the janitor round once', () => {
  const base = ensureMain(emptyIntent(), 0)
  const intent: OfficeIntent = { ...base, compactAt: 100, compactLevel: 80 }
  const { scene } = advance(emptyScene(), intent, 100)

  assert.equal(scene.walkers.filter(one => one.kind === 'janitor').length, 1)
  assert.equal(scene.janitor?.level, 80)

  const again = advance(scene, intent, 200)
  assert.equal(again.scene.walkers.filter(one => one.kind === 'janitor').length, 1)
})
