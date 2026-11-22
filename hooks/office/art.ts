// The office's art: palette, sprites, and the furniture that never moves.
// Everything is drawn in art pixels on the 384x216 canvas from layout.ts,
// plus TITLE_BAR rows of wall above it.

import { DESKS, GLOBE, H, KITCHEN_TABLE, KITCHEN_X, TABLE_MIRROR, TABLE_SEATS, TITLE_BAR, W, WALL_BOTTOM } from './layout'
import type { ClutterKind, TableSeat } from './layout'
import { Painter, bitmap, seeded } from './pixel'
import type { Key } from './pixel'

// ---------------------------------------------------------------- palette

export const CSS = [
  '.ol{fill:#2b1d16}.hr{fill:var(--h)}.sk{fill:var(--s)}.tp{fill:var(--t)}.pn{fill:var(--p)}',
  '.ck{fill:#ef9a86}.fe{fill:#3b2a22}.wh{fill:#fff6e6}.sd{fill:#000;fill-opacity:.22}.hl{fill:#fff;fill-opacity:.32}',
  '.w1{fill:#e2b277}.w2{fill:#c48a52}.w3{fill:#925f35}.w4{fill:#5b3a23}.bsb{fill:#4e321f}.dk{fill:#24160f}',
  '.wa1{fill:#f0e3c6}.wa2{fill:#e3d1ac}.wa3{fill:#a06e46}.wa4{fill:#6e4b33}.wa5{fill:#d8c39b}',
  '.wf{fill:#f4ecdc}.sky{fill:#8fcfee}.sky2{fill:#c6eafa}.cl{fill:#fff}.hi1{fill:#7cc26a}.hi2{fill:#5aa255}',
  '.ns{fill:#1a2446}.ns2{fill:#243159}.mn{fill:#f5efcf}.st{fill:#fff8d8}.ng{fill:#0f1730}.wfn{fill:#4a4560}',
  '.cu1{fill:#d88a6e}.cu2{fill:#b56a52}',
  '.fl1{fill:#c9935e}.fl2{fill:#bc8653}.fl3{fill:#a1703f}.kt1{fill:#efe7d4}.kt2{fill:#dcd0b6}.bs1{fill:#f6f0e2}.bs2{fill:#d9cfbb}',
  '.m1{fill:#cfd8d4}.m2{fill:#a9b6b2}.m3{fill:#7b8986}.m4{fill:#4c5856}',
  '.r1{fill:#59606b}.r2{fill:#424852}.r3{fill:#2b2f36}',
  '.sc{fill:#1b2230}.sn{fill:#203049}.c1{fill:#7fd4ff}.c2{fill:#ffd36b}.c3{fill:#9be37a}.c4{fill:#ff9a7a}.c5{fill:#c8a6ff}',
  '.lg{fill:#6dff8a}.la{fill:#ffc24a}.lr{fill:#ff5a4a}.lo{fill:#2c3a32}',
  '.fr1{fill:#eef4f1}.fr2{fill:#cfdad6}.fr3{fill:#98a8a3}.ct1{fill:#ece2cd}.ct2{fill:#cdbf9f}',
  '.so1{fill:#7598cf}.so2{fill:#5a78a8}.so3{fill:#3e557e}',
  '.pm1{fill:#f7d98a}.pm2{fill:#e8b64a}.pm3{fill:#c48f2c}.pm4{fill:#8a5a1c}.pt1{fill:#f0a88a}.pt2{fill:#d9805f}.pt3{fill:#b25d40}.pt4{fill:#7a3a26}',
  '.gl1{fill:#4f9fd8}.gl2{fill:#77c46b}.gs{fill:#d8a640}',
  '.g1{fill:#73bf58}.g2{fill:#4e9946}.g3{fill:#2f6b34}.po{fill:#c8693f}.po2{fill:#964a2b}',
  '.pa1{fill:#fdfaf1}.pa2{fill:#e7dfcd}.pa3{fill:#b6ab95}.cb1{fill:#dcab6b}.cb2{fill:#b37d45}.cb3{fill:#f0dfae}',
  '.bk1{fill:#b8483a}.bk2{fill:#3f7fb3}.bk3{fill:#e0b84c}.bk4{fill:#5f9e5a}.bk5{fill:#8a5aa8}.bk6{fill:#d9774f}',
  '.chf{fill:#4c5d7d}.ex{fill:#3fae64}.mug{fill:#f4efe6}.cof{fill:#6b3e26}.lmp{fill:#4f8a5b}.lb{fill:#ffe9a8}',
  '.dl{fill:#5fb7d6}.dn{fill:#6b7a88}.dg{fill:#6dff8a}.da{fill:#ffc24a}.dr{fill:#ff5a4a}.doff{fill:#26323a}',
  '.ru1{fill:#b5523b}.ru2{fill:#8f3d2d}.fg{fill:#d8a640}.bag{fill:#e9e2d0}',
  '.shw{fill:#3b2414;fill-opacity:.2}.sun{fill:#fff4c8;fill-opacity:.3}.mlt{fill:#9db8ff;fill-opacity:.16}',
  '.nt{fill:#2e3866;fill-opacity:.8;mix-blend-mode:multiply}.glow{mix-blend-mode:screen}',
  '.lc1{fill:#ffc35c;fill-opacity:.3}.lc2{fill:#ffc35c;fill-opacity:.21}.lc3{fill:#ffc35c;fill-opacity:.14}.lp{fill:#ffd27a;fill-opacity:.24}',
  '.night{display:none}',
].join('')

/** Night shows the lamp-lit set; `force` draws it whatever the mode. */
export const nightCss = (force: boolean): string => {
  const swap = '.day{display:none}.night{display:inline}'

  return force ? swap : `@media (prefers-color-scheme: dark){${swap}}`
}

/** Keyframes every draw shares. Timing is slow on purpose: nothing flashes. */
export const MOTION = [
  '@keyframes wa{0%{opacity:1}50%{opacity:0}}@keyframes wb{0%{opacity:0}50%{opacity:1}}',
  '.fa{animation:wa .44s steps(1,end) infinite}.fb{animation:wb .44s steps(1,end) infinite}',
  '@keyframes bob{0%{transform:translate(0,0)}50%{transform:translate(0,1px)}}',
  '.ty{animation:bob .36s steps(1,end) infinite}.br{animation:bob 2.6s steps(1,end) infinite}',
  '@keyframes ap{from{opacity:0}to{opacity:1}}@keyframes hd{from{opacity:1}to{opacity:0}}',
  '@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes fo{from{opacity:1}to{opacity:0}}',
  '@keyframes d1{0%{opacity:0}25%{opacity:1}}@keyframes d2{0%{opacity:0}50%{opacity:1}}@keyframes d3{0%{opacity:0}75%{opacity:1}}',
  '.d1{animation:d1 1.8s steps(1,end) infinite}.d2{animation:d2 1.8s steps(1,end) infinite}.d3{animation:d3 1.8s steps(1,end) infinite}',
  '@keyframes stm{from{transform:translate(0,0);opacity:.9}to{transform:translate(0,-6px);opacity:0}}',
  '.stm{animation:stm 2.4s steps(6,end) infinite}',
  // The busy blink names its keyframes: the app's player reads a bare duration
  // against the longest walk and then treats the office as flashing.
  '@keyframes bl{0%{opacity:1}50%{opacity:.3}}.led{animation:bl 2.6s steps(1,end) infinite}.busy .led{animation:bl .6s steps(1,end) infinite}',
  '@keyframes sp{to{transform:translate(-12px,0)}}.spin{animation:sp 2.4s steps(12,end) infinite}',
  '@keyframes fly{from{transform:translate(0,0);opacity:1}to{transform:translate(2px,-10px);opacity:0}}',
  '.fly{animation:fly 1.4s steps(7,end) infinite}',
  '@keyframes cd{from{transform:translate(-40px,0)}to{transform:translate(40px,0)}}.cd{animation:cd 96s steps(80,end) infinite}',
  '@keyframes tw{0%{opacity:1}50%{opacity:.35}}.tw{animation:tw 3.2s steps(1,end) infinite}',
  '@keyframes scr{to{transform:translate(0,-8px)}}.scr{animation:scr 1.6s steps(4,end) infinite}',
  '@keyframes cb{0%{opacity:1}50%{opacity:0}}.cur{animation:cb 1.1s steps(1,end) infinite}',
].join('')

// ---------------------------------------------------------------- sprites

const CHAR: Key = { o: 'ol', h: 'hr', H: 'hr+sd', s: 'sk', k: 'ck', t: 'tp', T: 'tp+sd', w: 'wh', p: 'pn', f: 'fe' }

const HEAD_F = [
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
]
const HEAD_B = [
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
]
const HEAD_S = [
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
]
const BODY_F = ['...otttwwttto...', '..otTttttttTto..', '..otTttttttTto..', '..osttttttttso..', '...oTTTTTTTTo...']
const BODY_B = ['...otttttttto...', '..otTttttttTto..', '..otTttttttTto..', '..osttttttttso..', '...oTTTTTTTTo...']
const BODY_S = ['....otttttto....', '....otttttto....', '....otTTTtto....', '....ottsttto....', '....oTTTTTTo....']
const BODY_HOLD = ['...otttwwttto...', '..otTttttttTto..', '..otTttttttTto..', '..ottTssssTtto..', '...oTTTTTTTTo...']
const LEGS = ['...oppppppppo...', '...opppoopppo...', '...opppoopppo...', '...offfoofffo...', '....ooo..ooo....']
const LEGS_A = ['...oppppppppo...', '...opppoopppo...', '...opppoofffo...', '...offfo.ooo....', '....ooo.........']
const LEGS_B = ['...oppppppppo...', '...opppoopppo...', '...offfoopppo...', '....ooo.offfo...', '.........ooo....']
const LEGS_S = ['....oppppppo....', '.....oppppo.....', '.....oppppo.....', '.....offfffo....', '.....ooooooo....']
const LEGS_SW = ['....oppppppo....', '...oppppoppo....', '..oppo...oppo...', '.offo.....offfo.', '.ooo.......oooo.']
const LEGS_SIT = ['...oppppppppo...', '...oppppppppo...', '...offfoofffo...', '....ooo..ooo....']
// Seated side on, facing right: thighs forward to the knees, shins and shoes below.
const LEGS_SIT_S = ['....opppppppppo.', '....opppppppppo.', '....ooooooooppo.', '...........offfo']

const CHAIR_BACK = [
  '...oooooooooo...',
  '...occcccccco...',
  '...oCccccccCo...',
  '...oCCCCCCCCo...',
  '....oooooooo....',
  '.......oo.......',
  '.....oooooo.....',
  '....o.o..o.o....',
]

// A kitchen chair from above, its back to the left: the back rises along the
// seat's far edge, the seat shows its top, then its front edge and two legs.
const CHAIR_SIDE = [
  'ooo..........',
  'o1o..........',
  'o2o..........',
  'o2o..........',
  'o2o..........',
  'o2ooooooooooo',
  'o2o111111111o',
  'o2o111111111o',
  'o2o111111111o',
  'o2o222222222o',
  'ooooooooooooo',
  'o33333333333o',
  'ooooooooooooo',
  'oo.........oo',
  'oo.........oo',
]

const BUBBLE = [
  '.ooooooooo.',
  'owwwwwwwwwo',
  'owwwwwwwwwo',
  'owwwwwwwwwo',
  'owwwwwwwwwo',
  'owwwwwwwwwo',
  '.oowoooooo.',
  '..owo......',
  '...o.......',
]
const BOOK = ['oooooooo', 'owwoowwo', 'owwoowwo', 'obbbbbbo', 'oooooooo']
const MUG = ['oooo.', 'owwoo', 'owwoo', 'oooo.']
const PHONE = ['ooo', 'ogo', 'ogo', 'ooo']
const CART = [
  '....wwww......',
  '..owwwwwwo...o',
  '.owwwwwwwwo..o',
  '.oggggggggo.o.',
  '.oggggggggooo.',
  '.oGggggggGo...',
  '.oGGGGGGGGo...',
  '.oooooooooo...',
  '..o......o....',
  '.ooo....ooo...',
]
const LEAVES = [
  '.....cc.......',
  '...ccbbc..cc..',
  '..cbbaabccbbc.',
  '.cbaaaabbbaabc',
  '.cbaaabbaaaabc',
  'cbaabbcbbaabc.',
  'cbabbcccbbaabc',
  '.cbbc.cc.cbbc.',
  '..cc.cbbc.cc..',
  '....cbaabc....',
  '....cbaabc....',
  '.....cbbc.....',
  '......cc......',
]
// A sofa pillow: rounded, lit from above, shade along the bottom and the right.
const PILLOW = [
  '.ooooooo.',
  'ohHHHHhho',
  'oHHHHHHho',
  'ohHHHHhso',
  'ohhhhhhso',
  'ohhhhhsso',
  'ossssssso',
  '.ooooooo.',
]
const SPHERE = [
  '....oooo....',
  '..oo####oo..',
  '.o########o.',
  '.o########o.',
  'o##########o',
  'o##########o',
  'o##########o',
  'o##########o',
  '.o########o.',
  '.o########o.',
  '..oo####oo..',
  '....oooo....',
]
const LAND = [
  '..gg........',
  '.gggg....g..',
  '..ggg...ggg.',
  '...g...gggg.',
  '......ggg...',
  '.g.....g....',
  'ggg.........',
  '.ggg....gg..',
  '..g....gggg.',
  '........gg..',
]

const def = (id: string, body: string): string => `<g id="${id}">${body}</g>`
const person = (id: string, ...parts: readonly (readonly string[])[]): string => def(id, bitmap(parts.flat(), CHAR))

/** Every reusable drawing, referenced with <use href="#id">. */
const SPRITES = [
  person('fS', HEAD_F, BODY_F, LEGS),
  person('fA', HEAD_F, BODY_F, LEGS_A),
  person('fB', HEAD_F, BODY_F, LEGS_B),
  person('bS', HEAD_B, BODY_B, LEGS),
  person('bA', HEAD_B, BODY_B, LEGS_A),
  person('bB', HEAD_B, BODY_B, LEGS_B),
  person('sS', HEAD_S, BODY_S, LEGS_S),
  person('sA', HEAD_S, BODY_S, LEGS_SW),
  person('kB', HEAD_B, BODY_B),
  person('kF', HEAD_F, BODY_HOLD, LEGS_SIT),
  person('kS', HEAD_S, BODY_S, LEGS_SIT_S),
  person('rd', HEAD_F, BODY_HOLD, LEGS),
  def('chb', bitmap(CHAIR_BACK, { o: 'ol', c: 'chf', C: 'chf+sd' }, 0, 14)),
  def('bub', bitmap(BUBBLE, { o: 'ol', w: 'wh' })),
  def('book', bitmap(BOOK, { o: 'ol', w: 'pa1', b: 'bk1' })),
  def('mugS', bitmap(MUG, { o: 'ol', w: 'mug' })),
  def('phone', bitmap(PHONE, { o: 'ol', g: 'c1' })),
  def('cart', bitmap(CART, { o: 'ol', w: 'bag', g: 'm2', G: 'm2+sd' })),
  def('leaves', bitmap(LEAVES, { a: 'g1', b: 'g2', c: 'g3' })),
].join('')

// ---------------------------------------------------------------- defs

const pattern = (id: string, w: number, h: number, body: string): string =>
  `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${body}</pattern>`

const PATTERNS = (() => {
  const planks = new Painter()
    .rect('fl1', 0, 0, 48, 8)
    .rect('fl2', 0, 8, 48, 8)
    .rect('fl3', 0, 7, 48, 1)
    .rect('fl3', 0, 15, 48, 1)
    .rect('fl3', 31, 0, 1, 7)
    .rect('fl3', 15, 8, 1, 7)
    .rect('fl3', 47, 8, 1, 7)
    .rect('fl2', 5, 3, 6, 1)
    .rect('fl2', 38, 2, 4, 1)
    .rect('fl1', 22, 11, 7, 1)
    .rect('fl1', 33, 13, 4, 1)
  const tiles = new Painter().rect('kt1', 0, 0, 16, 16).rect('kt2', 0, 0, 8, 8).rect('kt2', 8, 8, 8, 8)
  const paper = new Painter().rect('wa1', 0, 0, 8, 8).rect('wa2', 0, 0, 2, 8).rect('wa2', 5, 3, 1, 1)
  const splash = new Painter().rect('bs1', 0, 0, 6, 6).rect('bs2', 5, 0, 1, 6).rect('bs2', 0, 5, 6, 1)

  return [
    pattern('pk', 48, 16, String(planks)),
    pattern('kt', 16, 16, String(tiles)),
    pattern('wp', 8, 8, String(paper)),
    pattern('bs', 6, 6, String(splash)),
  ].join('')
})()

const glowStops = (id: string, color: string, alpha: number): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

/** Bright at the heart, then a long faint tail, as a real light falls off. */
const softGlow = (id: string, color: string, alpha: number): string =>
  `<radialGradient id="${id}">${[
    [0, 1],
    [0.3, 0.55],
    [0.6, 0.2],
    [1, 0],
  ]
    .map(([at = 0, k = 0]) => `<stop offset="${at}" stop-color="${color}" stop-opacity="${Number((alpha * k).toFixed(3))}"/>`)
    .join('')}</radialGradient>`

const GRADIENTS = [
  softGlow('gc', '#9ad6ff', 0.3),
  softGlow('gh', '#ffcb7a', 0.32),
  glowStops('gg', '#6dff8a', 0.55),
].join('')

const SCREEN = { dx: -6, dy: -11, w: 12, h: 9 }

const CLIPS = [
  `<clipPath id="wcA"><rect x="95" y="17" width="26" height="24"/></clipPath>`,
  `<clipPath id="wcB"><rect x="211" y="17" width="26" height="24"/></clipPath>`,
  `<clipPath id="glc"><circle cx="${GLOBE.x + 6}" cy="${GLOBE.y + 6}" r="5.5"/></clipPath>`,
  ...DESKS.map(
    (desk, i) =>
      `<clipPath id="sc${i}"><rect x="${desk.cx + SCREEN.dx}" y="${desk.top + SCREEN.dy}" width="${SCREEN.w}" height="${SCREEN.h}"/></clipPath>`,
  ),
].join('')

export const DEFS = `<defs>${SPRITES}${PATTERNS}${GRADIENTS}${CLIPS}</defs>`

// ---------------------------------------------------------------- the room

const BOOKS = ['bk1', 'bk2', 'bk3', 'bk4', 'bk5', 'bk6']

const windowAt = (x: number, clip: string, hasMoon: boolean): { day: string; night: string } => {
  const frame = new Painter()
    .rect('w4', x - 5, 11, 42, 2)
    .rect('w4', x, 14, 32, 30)
    .rect('wf', x + 1, 15, 30, 28)
  const panes = new Painter()
    .rect('sky', x + 3, 17, 26, 24)
    .rect('sky2', x + 3, 30, 26, 11)
    .rect('hi2', x + 3, 36, 26, 5)
    .rect('hi2', x + 6, 34, 8, 2)
    .rect('hi1', x + 3, 38, 26, 3)
    .rect('hi1', x + 17, 36, 9, 2)
    .raw(
      `<g clip-path="url(#${clip})"><g class="cd">${new Painter()
        .rect('cl', x + 6, 21, 9, 2)
        .rect('cl', x + 8, 19, 4, 2)
        .rect('cl', x + 20, 25, 7, 2)
        .rect('cl', x + 22, 24, 3, 1)}</g></g>`,
    )
  const night = new Painter()
    .rect('ns', x + 3, 17, 26, 24)
    .rect('ns2', x + 3, 32, 26, 9)
    .rect('ng', x + 3, 37, 26, 4)
    .rect('ng', x + 7, 35, 7, 2)
    .raw(
      `<g class="tw">${new Painter().dot('st', x + 6, 20).dot('st', x + 23, 19).dot('st', x + 12, 26)}</g>` +
        `<g class="tw" style="animation-delay:-1.6s">${new Painter().dot('st', x + 19, 23).dot('st', x + 9, 31).dot('st', x + 26, 29)}</g>`,
    )

  if (hasMoon) {
    night.rect('mn', x + 21, 19, 4, 4).rect('mn', x + 20, 20, 6, 2).rect('ns2', x + 23, 20, 2, 2)
  }
  const mullions = (cls: string): Painter =>
    new Painter().rect(cls, x + 15, 17, 2, 24).rect(cls, x + 3, 28, 26, 2)
  const sill = new Painter().rect('w4', x - 2, 43, 36, 3).rect('wf', x - 1, 43, 34, 2).rect('wa5', x - 1, 46, 34, 1)
  const curtains = new Painter()
  for (const cx of [x - 3, x + 29]) {
    curtains.rect('cu2', cx, 12, 6, 33).rect('cu1', cx + 1, 12, 4, 32).rect('cu2', cx + 2, 14, 1, 28)
  }

  return {
    day: `${frame}<g class="day">${panes}</g>${mullions('wf')}${sill}${curtains}`,
    night: `<g class="night">${night}${mullions('wfn')}</g>`,
  }
}

const WINDOW_A = windowAt(92, 'wcA', false)
const WINDOW_B = windowAt(208, 'wcB', true)

const plantAt = (x: number, y: number): string =>
  `${new Painter()
    .rect('shw', x - 6, y - 1, 12, 2)
    .rect('po2', x - 5, y - 8, 10, 8)
    .rect('po', x - 4, y - 7, 8, 6)
    .rect('po2', x - 6, y - 9, 12, 2)}<use href="#leaves" x="${x - 7}" y="${y - 21}"/>`

const deskDecor = (left: number, top: number, decor: string): string => {
  const p = new Painter()

  if (decor === 'lamp') {
    p.rect('m4', left + 2, top + 8, 5, 1)
      .rect('m3', left + 3, top + 2, 1, 6)
      .rect('m3', left + 4, top + 1, 3, 1)
      .rect('lmp', left + 5, top, 4, 3)
  } else if (decor === 'mug') {
    p.rect('ol', left + 4, top + 5, 4, 4).rect('mug', left + 5, top + 6, 2, 2).rect('cof', left + 5, top + 6, 2, 1).rect('ol', left + 8, top + 6, 1, 2)
  } else if (decor === 'plant') {
    p.rect('po2', left + 3, top + 5, 5, 4).rect('po', left + 4, top + 5, 3, 3).rect('g2', left + 2, top + 1, 7, 4).rect('g1', left + 3, top, 4, 3)
  } else {
    p.rect('bk2', left + 2, top + 6, 8, 2).rect('pa1', left + 2, top + 6, 8, 1).rect('bk3', left + 3, top + 4, 7, 2).rect('pa1', left + 3, top + 4, 7, 1)
  }

  return String(p)
}

const deskAt = (left: number, top: number, cx: number, decor: string): string =>
  `${new Painter()
    .rect('shw', left + 1, top + 18, 31, 3)
    .rect('w4', left, top, 32, 18)
    .rect('w1', left + 1, top + 1, 30, 11)
    .rect('w2', left + 1, top + 12, 30, 1)
    .rect('w3', left + 1, top + 13, 30, 4)
    .rect('w2', left + 21, top + 13, 9, 4)
    .rect('w4', left + 24, top + 15, 3, 1)
    .rect('w4', left + 1, top + 17, 2, 5)
    .rect('w4', left + 29, top + 17, 2, 5)
    .rect('r3', cx - 8, top - 13, 16, 13)
    .rect('r2', cx - 7, top - 12, 14, 11)
    .rect('r2', cx - 1, top, 2, 2)
    .rect('r3', cx - 3, top + 2, 6, 1)
    .rect('m3', cx - 6, top + 5, 12, 3)
    .rect('m1', cx - 5, top + 5, 10, 2)}${deskDecor(left, top, decor)}`

// Seats at the table are drawn for the left side and mirrored for the right.
const mirrorRows = (rows: readonly string[]): string[] => rows.map(row => [...row].reverse().join(''))
const mirrored = (svg: string): string => `<g transform="translate(${TABLE_MIRROR} 0) scale(-1 1)">${svg}</g>`

/** An empty kitchen chair for `seat`, its back away from the table. */
const chairAt = (seat: TableSeat): string => {
  const key = { o: 'w4', 1: 'w1', 2: 'w2', 3: 'w3' }
  const x = KITCHEN_TABLE.x - 14
  const top = seat.y - 12

  return seat.side === 'left'
    ? bitmap(CHAIR_SIDE, key, x, top)
    : bitmap(mirrorRows(CHAIR_SIDE), key, TABLE_MIRROR - x - (CHAIR_SIDE[0]?.length ?? 0), top)
}

const room = (): string => {
  const p = new Painter()

  // floor and walls
  p.raw(`<rect x="0" y="${WALL_BOTTOM}" width="${KITCHEN_X}" height="${H - WALL_BOTTOM}" fill="url(#pk)"/>`)
    .raw(`<rect x="${KITCHEN_X}" y="${WALL_BOTTOM}" width="${W - KITCHEN_X}" height="${H - WALL_BOTTOM}" fill="url(#kt)"/>`)
    .rect('w3', KITCHEN_X - 1, WALL_BOTTOM, 2, H - WALL_BOTTOM)
    .rect('wa4', 0, -TITLE_BAR, W, TITLE_BAR + 6)
    .raw(`<rect x="0" y="6" width="${W}" height="52" fill="url(#wp)"/>`)
    .raw(`<rect x="${KITCHEN_X}" y="26" width="${W - KITCHEN_X}" height="32" fill="url(#bs)"/>`)
    .rect('wa5', 0, 6, W, 1)
    .rect('w4', 0, 57, W, 1)
    .rect('wa3', 0, 58, W, 5)
    .rect('w3', 0, 63, W, 1)
    .rect('shw', 0, WALL_BOTTOM, W, 3)
    .rect('wa4', 0, -TITLE_BAR, 5, H + TITLE_BAR)
    .rect('wa4', W - 5, -TITLE_BAR, 5, H + TITLE_BAR)
    .rect('w4', 5, -TITLE_BAR, 1, H + TITLE_BAR)
    .rect('w4', W - 6, -TITLE_BAR, 1, H + TITLE_BAR)

  // door, doormat, exit sign frame
  p.rect('w4', 55, 17, 26, 47)
    .rect('w2', 56, 18, 24, 46)
    .rect('w4', 58, 20, 20, 44)
    .rect('w2', 59, 21, 18, 43)
    .rect('w3', 61, 24, 14, 13)
    .rect('w3', 61, 41, 14, 19)
    .rect('w1', 62, 25, 12, 1)
    .rect('w1', 62, 42, 12, 1)
    .rect('w1', 59, 21, 1, 43)
    .rect('fg', 74, 43, 2, 2)
    .rect('ru2', 57, 64, 22, 6)
    .rect('ru1', 58, 65, 20, 4)
    .rect('ru2', 60, 66, 16, 1)
    .rect('ol', 60, 8, 16, 8)

  // windows and the sunlight they let in
  p.raw(WINDOW_A.day).raw(WINDOW_B.day)
  p.raw(`<g class="day"><polygon class="sun" points="95,64 121,64 133,100 107,100"/><polygon class="sun" points="211,64 237,64 249,100 223,100"/></g>`)

  // a painting above the cabinets
  p.rect('w4', 172, 8, 26, 18)
    .rect('fg', 173, 9, 24, 16)
    .rect('sky', 175, 11, 20, 12)
    .rect('sky2', 175, 15, 20, 4)
    .rect('hi2', 179, 15, 7, 2)
    .rect('hi2', 177, 17, 12, 2)
    .rect('hi1', 175, 19, 20, 4)
    .rect('c2', 190, 12, 2, 2)

  // bookshelf
  p.rect('w4', 132, 20, 32, 48).rect('w2', 133, 21, 30, 46).rect('w1', 133, 21, 30, 3).rect('bsb', 135, 25, 26, 36)
  const rnd = seeded(7)
  for (const bottom of [35, 48, 61]) {
    let x = 136

    while (x < 158) {
      const w = 2 + Math.floor(rnd() * 2)
      const h = 6 + Math.floor(rnd() * 4)

      if (rnd() < 0.12) {
        x += 2
        continue
      }
      const cls = BOOKS[Math.floor(rnd() * BOOKS.length)] ?? 'bk1'
      const width = Math.min(w, 160 - x)
      p.rect(cls, x, bottom - h, width, h).rect('hl', x, bottom - h + 2, width, 1).rect('sd', x + width - 1, bottom - h, 1, h)
      x += width + (rnd() < 0.2 ? 1 : 0)
    }
  }
  for (const y of [35, 48]) {
    p.rect('w1', 134, y, 28, 2).rect('w3', 134, y + 2, 28, 1)
  }
  p.rect('w3', 133, 61, 30, 6).rect('w4', 133, 66, 30, 1)

  // file cabinets
  for (const x of [170, 186]) {
    p.rect('m4', x, 30, 15, 38).rect('m2', x + 1, 31, 13, 36).rect('m1', x + 1, 31, 13, 3)
    for (const y of [35, 46, 57]) {
      p.rect('m3', x + 2, y, 11, 10)
        .rect('m1', x + 3, y + 1, 9, 8)
        .rect('m2', x + 3, y + 8, 9, 1)
        .rect('pa1', x + 5, y + 2, 5, 2)
        .rect('m4', x + 6, y + 5, 3, 1)
    }
    p.rect('m4', x + 1, 67, 13, 1)
  }

  // server rack body; its lights are drawn with the glowing things
  p.rect('r3', 268, 22, 20, 46).rect('r1', 269, 23, 18, 44).rect('m3', 269, 23, 18, 3)
  for (const y of [28, 34, 40, 46, 52, 58]) {
    p.rect('r2', 270, y, 16, 5).rect('r3', 270, y + 4, 16, 1).rect('r1', 277, y + 1, 7, 1).rect('r1', 277, y + 3, 7, 1)
  }
  p.rect('r3', 269, 64, 18, 4)

  // kitchen: counter with sink, coffee machine, microwave, fridge, display bezel
  p.rect('w4', 295, 37, 54, 31).rect('ct1', 296, 38, 52, 9).rect('ct2', 296, 47, 52, 2).rect('w2', 296, 49, 52, 18)
  for (let i = 0; i < 4; i += 1) {
    const x = 297 + i * 13
    p.rect('w3', x, 50, 12, 16).rect('w1', x + 1, 51, 10, 14).rect('m4', x + (i % 2 === 0 ? 9 : 2), 56, 1, 4)
  }
  p.rect('w4', 296, 67, 52, 1)
    .rect('m3', 318, 39, 14, 6)
    .rect('m2', 319, 40, 12, 4)
    .rect('m4', 324, 41, 2, 1)
    .rect('m4', 324, 33, 2, 6)
    .rect('m4', 321, 33, 5, 2)
    .rect('ol', 299, 24, 12, 20)
    .rect('r1', 300, 25, 10, 18)
    .rect('r2', 300, 25, 10, 3)
    .rect('m1', 301, 29, 8, 5)
    .rect('r3', 302, 35, 6, 6)
    .rect('mug', 303, 38, 3, 3)
    .rect('m4', 301, 42, 8, 1)
    .rect('ol', 334, 30, 14, 14)
    .rect('fr2', 335, 31, 12, 12)
    .rect('sc', 336, 33, 7, 7)
    .rect('fr3', 344, 33, 2, 7)
    .rect('fr3', 352, 16, 22, 52)
    .rect('fr1', 353, 17, 20, 50)
    .rect('fr2', 353, 17, 20, 3)
    .rect('fr3', 353, 35, 20, 1)
    .rect('m3', 370, 24, 1, 8)
    .rect('m3', 370, 39, 1, 12)
    .rect('c4', 357, 40, 2, 2)
    .rect('c1', 361, 44, 2, 2)
    .rect('pa1', 356, 46, 5, 6)
    .rect('pa3', 357, 48, 3, 1)
    .rect('fr3', 353, 66, 20, 2)
    .rect('m4', 329, 2, 4, 2)
    .rect('r3', 312, 4, 38, 24)
    .rect('r2', 313, 5, 36, 22)

  // desks with monitors; chairs and screens belong to the scene layer
  for (const desk of DESKS) {
    p.raw(deskAt(desk.left, desk.top, desk.cx, desk.decor))
  }

  // trash bin, plants
  p.rect('m4', 252, 150, 9, 10).rect('m3', 253, 151, 7, 8).rect('r3', 253, 151, 7, 2).rect('m2', 253, 156, 7, 1)
  p.raw(plantAt(46, 88)).raw(plantAt(284, 108)).raw(plantAt(372, 154))

  // kitchen chairs down both sides of the table, and the sofa
  for (const seat of Object.values(TABLE_SEATS)) {
    p.raw(chairAt(seat))
  }
  const sx = 310
  const sw = 42
  p.rect('shw', sx + 1, 187, sw, 3)
    .rect('so3', sx, 158, sw, 30)
    .rect('so2', sx + 1, 159, sw - 2, 12)
    .rect('so1', sx + 1, 159, sw - 2, 2)
    .rect('so1', sx + 6, 171, sw - 12, 8)
    .rect('so3', sx + sw / 2 - 1, 171, 1, 8)
    .rect('so2', sx + 6, 179, sw - 12, 7)
    .rect('so3', sx, 164, 7, 24)
    .rect('so1', sx + 1, 165, 5, 6)
    .rect('so2', sx + 1, 171, 5, 15)
    .rect('so3', sx + sw - 7, 164, 7, 24)
    .rect('so1', sx + sw - 6, 165, 5, 6)
    .rect('so2', sx + sw - 6, 171, 5, 15)
    // pillows lean on the back and rest on the seat, a row of shade under each
    .rect('sd', sx + 9, 171, 7, 1)
    .rect('sd', sx + sw - 16, 171, 7, 1)
    .raw(bitmap(PILLOW, { o: 'pm4', H: 'pm1', h: 'pm2', s: 'pm3' }, sx + 8, 163))
    .raw(bitmap(PILLOW, { o: 'pt4', H: 'pt1', h: 'pt2', s: 'pt3' }, sx + sw - 17, 163))
    .rect('w4', sx + 3, 188, 2, 2)
    .rect('w4', sx + sw - 5, 188, 2, 2)

  // floor globe beside the sofa: stand, ring, sea; the land turns in the scene layer
  const { x: gx, y: gy } = GLOBE
  p.rect('shw', gx, gy + 25, 12, 2)
    .rect('w4', gx + 1, gy + 23, 10, 3)
    .rect('w3', gx + 2, gy + 23, 8, 2)
    .rect('w4', gx + 5, gy + 12, 2, 11)
    .rect('gs', gx - 2, gy + 2, 1, 9)
    .rect('gs', gx + 13, gy + 2, 1, 9)
    .rect('gs', gx - 1, gy + 11, 2, 1)
    .rect('gs', gx + 11, gy + 11, 2, 1)
    .rect('gs', gx + 1, gy + 12, 10, 1)
    .raw(bitmap(SPHERE, { o: 'w4', '#': 'gl1' }, gx, gy))

  return String(p)
}

export const ROOM = room()

/** The kitchen table, long side down the room, drawn over the knees of the people at it. */
export const TABLE = (() => {
  const { x, y, w, h } = KITCHEN_TABLE

  return String(
    new Painter()
      .rect('shw', x, y + h + 8, w + 2, 4)
      .rect('w4', x - 1, y - 1, w + 2, h + 6)
      .rect('w1', x, y, w, h)
      .rect('w2', x, y + h, w, 2)
      .rect('w3', x, y + h + 2, w, 2)
      .rect('w4', x + 1, y + h + 4, 3, 8)
      .rect('w4', x + w - 4, y + h + 4, 3, 8),
  )
})()

/** Someone sitting at the kitchen table on `seat`: the person facing it, and their mug on it. */
export const atTable = (seat: TableSeat): { body: string; front: string } => {
  const top = seat.y - 19
  const person = `<use href="#kS" x="${KITCHEN_TABLE.x - 15}" y="${top}"/>`
  // The mug is placed for the right side, its handle toward the sitter.
  const mugX = TABLE_MIRROR - KITCHEN_TABLE.x - 6
  const mug = `<use href="#mugS" x="${mugX}" y="${top + 10}"/>${steamAt(mugX + 1, top + 8)}`

  return seat.side === 'left' ? { body: person, front: mirrored(mug) } : { body: mirrored(person), front: mug }
}

/** What shines at night: drawn over the darkness, so it keeps its color. */
export const GLOWING = [
  WINDOW_A.night,
  WINDOW_B.night,
  `<g class="night"><polygon class="mlt" points="95,64 121,64 133,100 107,100"/><polygon class="mlt" points="211,64 237,64 249,100 223,100"/></g>`,
  String(
    new Painter()
      .rect('ex', 61, 9, 14, 6)
      .rect('wh', 63, 12, 8, 1)
      .rect('wh', 69, 11, 1, 3)
      .rect('wh', 70, 12, 1, 1)
      .rect('lr', 307, 30, 1, 1)
      .rect('lg', 305, 30, 1, 1)
      .rect('lg', 344, 34, 2, 1),
  ),
  ...DESKS.filter(desk => desk.decor === 'lamp').map(desk => String(new Painter().rect('lb', desk.left + 6, desk.top + 3, 2, 1))),
].join('')

/** A desk lamp at night: a soft halo, a beam from the shade, a pool of light on the desk. */
const lampLight = (left: number, top: number): string => {
  const beam = new Painter()
  // Rows of the beam: class, offset from the desk's left, width. It widens as
  // it falls and stops at left + 9: the sitter's head starts at left + 10.
  const rows: readonly (readonly [string, number, number])[] = [
    ['lc1', 5, 4],
    ['lc1', 5, 4],
    ['lc2', 4, 6],
    ['lc2', 4, 6],
    ['lc3', 3, 7],
    ['lc3', 3, 7],
  ]

  for (const [i, [cls, dx, w]] of rows.entries()) {
    beam.rect(cls, left + dx, top + 4 + i, w, 1)
  }
  beam.rect('lp', left + 2, top + 9, 8, 1).rect('lp', left + 1, top + 10, 9, 1).rect('lp', left + 2, top + 11, 7, 1)

  return `<circle class="glow" cx="${left + 6}" cy="${top + 2}" r="10" fill="url(#gh)"/><g class="glow">${beam}</g>`
}

/** Pools of light at night, beside the ones a scene adds for busy screens. */
export const NIGHT_LIGHTS = [
  `<circle class="glow" cx="68" cy="13" r="10" fill="url(#gg)"/>`,
  `<circle class="glow" cx="278" cy="44" r="16" fill="url(#gg)"/>`,
  ...DESKS.filter(desk => desk.decor === 'lamp').map(desk => lampLight(desk.left, desk.top)),
].join('')

// ---------------------------------------------------------------- moving parts

export const doorOpen = (): string =>
  String(new Painter().rect('dk', 59, 21, 18, 43).rect('w2', 76, 21, 3, 43).rect('w4', 79, 21, 1, 43))

export const drawerOpen = (): string =>
  `${new Painter()
    .rect('m4', 187, 46, 13, 15)
    .rect('m3', 188, 47, 11, 4)
    .rect('pa1', 189, 47, 3, 4)
    .rect('pa2', 192, 47, 2, 4)
    .rect('pa1', 194, 47, 4, 4)
    .rect('m1', 188, 51, 11, 9)
    .rect('m2', 188, 59, 11, 1)
    .rect('m4', 192, 55, 3, 1)}<g class="fly">${new Painter().rect('pa1', 191, 44, 3, 2)}</g><g class="fly" style="animation-delay:-.7s">${new Painter().rect('pa2', 195, 44, 2, 2)}</g>`

export const globeLand = (isSpinning: boolean): string =>
  `<g clip-path="url(#glc)"><g${isSpinning ? ' class="spin"' : ''}>${bitmap(LAND, { g: 'gl2' }, GLOBE.x, GLOBE.y + 1)}${bitmap(LAND, { g: 'gl2' }, GLOBE.x + 12, GLOBE.y + 1)}</g></g>${new Painter().rect('hl', GLOBE.x + 2, GLOBE.y + 2, 2, 1).rect('hl', GLOBE.x + 2, GLOBE.y + 3, 1, 2)}`

export const rackLights = (isBusy: boolean): string => {
  const p = new Painter()
  let i = 0

  for (const y of [28, 34, 40, 46, 52, 58]) {
    for (const x of [271, 273]) {
      p.raw(`<rect class="led ${i % 3 === 0 ? 'la' : 'lg'}" x="${x}" y="${y + 1}" width="1" height="1" style="animation-delay:-${((i * 7) % 13) / 5}s"/>`)
      i += 1
    }
  }

  return isBusy ? `<g class="busy">${p}</g>` : String(p)
}

export const steamAt = (x: number, y: number): string =>
  `<g class="stm">${new Painter().rect('wh', x, y, 1, 2).rect('wh', x + 1, y - 2, 1, 2)}</g><g class="stm" style="animation-delay:-1.2s">${new Painter().rect('wh', x + 2, y, 1, 2).rect('wh', x + 1, y - 2, 1, 1)}</g>`

/** One monitor's screen: off, on, or with code scrolling. */
export const screenOf = (i: number, mode: 'off' | 'on' | 'type'): string => {
  const desk = DESKS[i]

  if (desk === undefined) {
    return ''
  }
  const x = desk.cx + SCREEN.dx
  const y = desk.top + SCREEN.dy

  if (mode === 'off') {
    return String(new Painter().rect('sc', x, y, SCREEN.w, SCREEN.h).rect('doff', x + 10, y + 7, 1, 1))
  }
  const rnd = seeded(31 + i)
  const colors = ['c1', 'c2', 'c3', 'c4', 'c5']
  const lines = new Painter()

  for (let row = 0; row < 8; row += 1) {
    const indent = Math.floor(rnd() * 3) * 2
    const width = 3 + Math.floor(rnd() * 6)
    const cls = colors[Math.floor(rnd() * colors.length)] ?? 'c1'
    lines.rect(cls, x + 1 + indent, y + 1 + row * 2, Math.min(width, SCREEN.w - 2 - indent), 1)
    lines.rect(cls, x + 1 + indent, y + 17 + row * 2, Math.min(width, SCREEN.w - 2 - indent), 1)
  }
  const scroll = mode === 'type' ? ' class="scr"' : ''

  return `${new Painter().rect('sn', x, y, SCREEN.w, SCREEN.h)}<g clip-path="url(#sc${i})"><g${scroll}>${lines}</g></g><g class="cur">${new Painter().rect('c3', x + 9, y + 7, 2, 1)}</g>`
}

export const screenGlow = (i: number): string => {
  const desk = DESKS[i]

  // a small halo hugging the screen, just reaching the keyboard
  return desk === undefined ? '' : `<ellipse class="glow" cx="${desk.cx}" cy="${desk.top - 5}" rx="13" ry="10" fill="url(#gc)"/>`
}

/** A pile of paper, drawn up from its bottom-left corner. */
export const clutterAt = (x: number, y: number, kind: ClutterKind): string => {
  const p = new Painter()

  switch (kind) {
    case 'pages':
      return String(p.rect('pa3', x, y - 1, 7, 1).rect('pa1', x, y - 4, 7, 3).rect('pa2', x + 1, y - 3, 4, 1).rect('pa1', x + 1, y - 5, 6, 1))
    case 'sheets':
      return String(p.rect('shw', x, y - 1, 9, 2).rect('pa1', x, y - 3, 5, 2).rect('pa2', x + 4, y - 2, 4, 2).rect('pa1', x + 5, y - 2, 3, 1))
    case 'ball':
      return String(p.rect('shw', x, y - 1, 4, 1).rect('pa3', x, y - 3, 3, 3).rect('pa1', x, y - 3, 2, 2))
    case 'stack':
      p.rect('shw', x - 1, y - 1, 10, 2)
      for (let row = 0; row < 7; row += 1) {
        p.rect(row % 2 === 0 ? 'pa1' : 'pa2', x + (row === 3 ? 1 : 0), y - 1 - row, 8, 1)
      }
      return String(p.rect('pa3', x + 7, y - 7, 1, 7).rect('pa1', x + 1, y - 9, 7, 2).rect('pa3', x + 1, y - 9, 7, 1))
    case 'tower':
      p.rect('shw', x - 1, y - 1, 11, 2)
      for (let row = 0; row < 14; row += 1) {
        p.rect(row % 2 === 0 ? 'pa1' : 'pa2', x + Math.floor(row / 5), y - 1 - row, 8, 1)
      }
      return String(p.rect('pa3', x + 2, y - 16, 7, 1).rect('pa1', x + 2, y - 15, 7, 1))
    case 'box':
      return String(
        p
          .rect('shw', x, y - 1, 13, 2)
          .rect('w4', x, y - 10, 12, 10)
          .rect('cb1', x + 1, y - 9, 10, 3)
          .rect('cb2', x + 1, y - 6, 10, 5)
          .rect('cb3', x + 5, y - 9, 2, 3)
          .rect('pa1', x + 3, y - 4, 4, 2),
      )
    case 'boxes':
      return clutterAt(x, y, 'box') + clutterAt(x + 1, y - 10, 'box')
  }
}
