// Who people look like: each model family has its own cast, with a head for
// each view and eight sets of colors, so five subagents on one model still
// differ in hair and clothes.

import type { OfficeCast } from '../../types'

export const CASTS: readonly OfficeCast[] = ['plain', 'opus', 'fable', 'sonnet', 'haiku']

/** The cast of a model id or name: its family, else the plain office worker. */
export const castOf = (model: string | undefined): OfficeCast => {
  const name = (model ?? '').toLowerCase()

  return CASTS.find(cast => cast !== 'plain' && name.includes(cast)) ?? 'plain'
}

/** Colors a cast comes in: hair, skin, shirt, trousers. */
export type Look = readonly [string, string, string, string]

/** How many looks each cast has. */
export const LOOK_COUNT = 8

/** Claude's own shirt, whatever its cast. */
export const CLAUDE_SHIRT = '#d97757'

export const LOOKS: Readonly<Record<OfficeCast, readonly Look[]>> = {
  plain: [
    ['#5a3a24', '#f2c59b', '#4f8fc0', '#3d4a66'],
    ['#c7843a', '#f6d2b0', '#6bab5e', '#4a4a52'],
    ['#8a4b2a', '#d9a47a', '#b55d8a', '#33405c'],
    ['#e3c36a', '#f6d6b8', '#5f6fd1', '#514238'],
    ['#3a2418', '#b8835c', '#e0b04a', '#2f3a4a'],
    ['#a33b2b', '#f4cfa8', '#4aa39a', '#3c3c48'],
    ['#1f1f24', '#c99572', '#7d9a4a', '#2e4057'],
    ['#6e6e78', '#f1caa6', '#8f6bc2', '#434a40'],
  ],
  // Bearded, short hair, flannel colors.
  opus: [
    ['#4a2f1d', '#f0c29a', '#2f6b4f', '#3a3f4a'],
    ['#1f1a17', '#c98f68', '#7a2e35', '#33384a'],
    ['#b5602e', '#f4cfae', '#2f4f7a', '#4a4238'],
    ['#8d8d8d', '#e8bc94', '#5a6e3a', '#2f3640'],
    ['#6b4a2b', '#a9734f', '#c08a2e', '#3b3b45'],
    ['#2e2420', '#f2cba8', '#3d7a86', '#40362e'],
    ['#a0703c', '#d9a77d', '#55606e', '#2c3a4f'],
    ['#5c2c1c', '#8a5a3c', '#9b4f2f', '#34363d'],
  ],
  // Bearded, long hair, glasses.
  fable: [
    ['#3a2a20', '#efc6a0', '#6a4a8c', '#34384a'],
    ['#c9c4bd', '#e6b892', '#3f5d8c', '#3d3a34'],
    ['#7a3b20', '#f3cdb0', '#7c6a2e', '#2f3a48'],
    ['#151515', '#b98260', '#8a3d5c', '#30343c'],
    ['#b88a4a', '#f1c9a4', '#2f6a5a', '#454039'],
    ['#5a4636', '#d2a07a', '#a3542f', '#2c3442'],
    ['#9a9aa0', '#c48c66', '#3c4a6b', '#3a2f2a'],
    ['#d8b070', '#f5d3b6', '#5c7d3a', '#3b3f55'],
  ],
  // Young and reckless: spiky dyed hair, headphones, hoodies.
  sonnet: [
    ['#2f7dff', '#f0c8a0', '#1e1e24', '#2a3550'],
    ['#7be03a', '#e8b98f', '#c23a3a', '#2d2d33'],
    ['#ff4fa0', '#f6d2b0', '#2b2b33', '#3a3f55'],
    ['#f2f2f2', '#c99572', '#e8862e', '#2f3a4a'],
    ['#e0362c', '#f4cfa8', '#2b8fbf', '#33333b'],
    ['#151515', '#a8714d', '#8f3fd1', '#2e2e36'],
    ['#ffd23a', '#f1caa6', '#2c6e49', '#3a3a42'],
    ['#29c7c7', '#d9a47a', '#d1d1d1', '#2a2f3a'],
  ],
  // A young woman: two buns, long hair, pastels.
  haiku: [
    ['#ff9ccf', '#f6d6b8', '#b9a2ff', '#5d7fb8'],
    ['#b48cff', '#f0c8a0', '#ffd36b', '#3e4a66'],
    ['#7fe0c0', '#e8b98f', '#ff9a8a', '#4a4a5a'],
    ['#f5e6a8', '#f4cfa8', '#8fd0ff', '#6b5a8a'],
    ['#1f1f24', '#c99572', '#ff7ab6', '#2f3a4a'],
    ['#e07a3a', '#f6d2b0', '#a8e68a', '#5a6e9a'],
    ['#5a8cff', '#f1caa6', '#f4efe6', '#4a3f5a'],
    ['#c0392b', '#b8835c', '#ffe27a', '#3a4a7a'],
  ],
}

/** The janitor's own colors, whatever the model. */
export const JANITOR: Look = ['#2f6cb3', '#e8b98f', '#3f78c0', '#2f5a8f']

// Heads, 16 wide, from the sprite's top: front, back, and side facing right.
// Rows past 10 hang over the shirt (a beard, long hair). Keys: o outline,
// h/H hair and its shade, s skin, k cheek, w white, r headphones.

export type Heads = { f: readonly string[]; b: readonly string[]; s: readonly string[] }

export const HEADS: Readonly<Record<OfficeCast, Heads>> = {
  plain: {
    f: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhsssssshho..',
      '..ohssssssssho..',
      '..ohsossssosho..',
      '..ohsossssosho..',
      '...okssssssko...',
      '....oossssoo....',
    ],
    b: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..oHhhhhhhhhHo..',
      '...oHHhhhhHHo...',
      '....oossssoo....',
    ],
    s: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhssso..',
      '..ohhhhhhsssso..',
      '..ohhhhhhssoso..',
      '..oHhhhhhssoso..',
      '...oHhhhssskso..',
      '.....oossssoo...',
    ],
  },
  opus: {
    f: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhsssssshho..',
      '..ohsHHssHHsho..',
      '..ohsossssosho..',
      '..ohsossssosho..',
      '..ohhsshhsshho..',
      '..ohhhhkkhhhho..',
      '...ohhhhhhhho...',
      '....oHhhhhHo....',
      '.....oHhhHo.....',
      '......oooo......',
    ],
    b: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..oHhhhhhhhhHo..',
      '..ohHHHHHHHHho..',
      '..ohssssssssho..',
      '...ohoossoohho..',
    ],
    s: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhsso..',
      '..ohhhhhhhsHHo..',
      '..ohhhhhhsssso..',
      '..ohhhhhhssoso..',
      '..oHhhhhhhhsso..',
      '...oHhhhhhhhho..',
      '....ohhhhhhhho..',
      '.....oHhhhhHo...',
      '......oHhhho....',
      '.......oooo.....',
    ],
  },
  fable: {
    f: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '.ohhhhssssshhho.',
      '.ohhsssssssshho.',
      '.ohowwossowwoho.',
      '.ohsoossssoosho.',
      '.ohhhsshhsshhho.',
      '.ohhhhhkkhhhhho.',
      '.ohhhhhhhhhhhho.',
      '.oho.ohhhho.oho.',
      '.oo...oHHo...oo.',
      '.......oo.......',
    ],
    b: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '.ohhhhhhhhhhhho.',
      '.ohhhhhhhhhhhho.',
      '.ohhhhhhhhhhhho.',
      '.ohhhhhhhhhhhho.',
      '.ohhhhhhhhhhhho.',
      '.oHhhhhhhhhhhHo.',
      '..oHhhhhhhhhHo..',
      '...oHhhhhhhHo...',
      '....oHHHHHHo....',
      '.....oooooo.....',
    ],
    s: [
      '................',
      '....oooooooo....',
      '...ohhhhhhhho...',
      '..ohhhhhhhhhho..',
      '.ohhhhhhhhhsso..',
      '.ohhhhhhhhsHHo..',
      '.ohhhhhhhssoso..',
      '.ohhhhhhhoowso..',
      '.ohhhhhhhhhoso..',
      '.ohhhhhhhhhhho..',
      '.ohhhhhhhhhhho..',
      '.oHhho.ohhhhho..',
      '..oo....oHHHo...',
      '.........ooo....',
    ],
  },
  sonnet: {
    f: [
      '...o..o..o..o...',
      '..ohoohoohooho..',
      '..ohrrrrrrrrho..',
      '..ohhhhhhhhhho..',
      '..ohhhhssshhho..',
      '..ohhsssssssho..',
      '.rrhsssssssshrr.',
      '.rrhsossssoshrr.',
      '.rrhsossssoshrr.',
      '...oksswwssko...',
      '....oossssoo....',
    ],
    b: [
      '...o..o..o..o...',
      '..ohoohoohooho..',
      '..ohrrrrrrrrho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '.rrhhhhhhhhhhrr.',
      '.rrhhhhhhhhhhrr.',
      '.rrHhhhhhhhhHrr.',
      '...oHHhhhhHHo...',
      '....oossssoo....',
    ],
    s: [
      '...o..o..o......',
      '..ohoohoohoooo..',
      '..ohhhhrrhhhho..',
      '..ohhhhrrhhhho..',
      '..ohhhhrrhhhho..',
      '..ohhhhrrhhsso..',
      '..ohhhrrrrssso..',
      '..ohhhrrrrsoso..',
      '..oHhhrrrrssso..',
      '...oHhhhssskso..',
      '.....oossssoo...',
    ],
  },
  haiku: {
    f: [
      '..oo........oo..',
      '.ohhoooooooohho.',
      '.ohhhhhhhhhhhho.',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhshhhhshho..',
      '..ohssssssssho..',
      '..ohoossssooho..',
      '..ohsossssosho..',
      '..ohksssssskho..',
      '..ohhoossoohho..',
      '..ohho....ohho..',
      '..oHho....oHho..',
      '...oo......oo...',
    ],
    b: [
      '..oo........oo..',
      '.ohhoooooooohho.',
      '.ohhhhhhhhhhhho.',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..oHhhhhhhhhHo..',
      '...oHHHHHHHHo...',
      '....oooooooo....',
    ],
    s: [
      '...oo...........',
      '..ohhooooooo....',
      '..ohhhhhhhhho...',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhhhhhhhhso..',
      '..ohhhhhhhssso..',
      '..ohhhhhhsooso..',
      '..ohhhhhhssoso..',
      '..ohhhhhhsskso..',
      '..ohhhhoossoo...',
      '..ohhhho........',
      '..oHhhho........',
      '...oooo.........',
    ],
  },
}
