// Pixel-art helpers: every pixel is a rectangle, and rectangles of one class
// are merged into one <path>, so a sprite costs a few paths, not hundreds of rects.

/** Draws rectangles in order; consecutive rectangles of one class share a path. */
export class Painter {
  private readonly parts: string[] = []
  private cls = ''
  private d = ''

  rect(cls: string, x: number, y: number, w: number, h: number): this {
    if (w <= 0 || h <= 0) {
      return this
    }
    if (cls !== this.cls) {
      this.flush()
      this.cls = cls
    }
    this.d += `M${x} ${y}h${w}v${h}h${-w}z`

    return this
  }

  dot(cls: string, x: number, y: number): this {
    return this.rect(cls, x, y, 1, 1)
  }

  raw(svg: string): this {
    this.flush()
    this.parts.push(svg)

    return this
  }

  toString(): string {
    this.flush()

    return this.parts.join('')
  }

  private flush(): void {
    if (this.d !== '') {
      this.parts.push(`<path class="${this.cls}" d="${this.d}"/>`)
    }
    this.d = ''
    this.cls = ''
  }
}

/** Character to classes: `cls`, or `base+overlay` for a shaded pixel. */
export type Key = Readonly<Record<string, string>>

type Run = [x: number, y: number, w: number, h: number]

/**
 * Turns rows of characters into paths, one per class, bases before overlays.
 * Runs that repeat in the next row at the same place grow taller instead of
 * adding a path segment.
 */
export const bitmap = (rows: readonly string[], key: Key, ox = 0, oy = 0): string => {
  const runs = new Map<string, Run[]>()

  rows.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const ch = row.charAt(x)
      let w = 1

      while (row.charAt(x + w) === ch) {
        w += 1
      }
      const spec = key[ch]

      if (spec !== undefined) {
        for (const cls of spec.split('+')) {
          const list = runs.get(cls) ?? []
          list.push([x, y, w, 1])
          runs.set(cls, list)
        }
      }
      x += w
    }
  })
  const overlays = new Set(Object.values(key).flatMap(spec => spec.split('+').slice(1)))
  const classes = [...runs.keys()].sort((a, b) => Number(overlays.has(a)) - Number(overlays.has(b)))
  let out = ''

  for (const cls of classes) {
    const list = (runs.get(cls) ?? []).sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1])
    const merged: Run[] = []

    for (const run of list) {
      const last = merged[merged.length - 1]

      if (last !== undefined && last[0] === run[0] && last[2] === run[2] && last[1] + last[3] === run[1]) {
        last[3] += 1
      } else {
        merged.push([run[0], run[1], run[2], run[3]])
      }
    }
    const d = merged.map(([x, y, w, h]) => `M${x + ox} ${y + oy}h${w}v${h}h${-w}z`).join('')
    out += `<path class="${cls}" d="${d}"/>`
  }

  return out
}

// A pixel font 5 rows tall, 3 wide; a glyph that needs a diagonal (N) is 4 wide.
// Digits, a few signs and the letters of the display's label.
const GLYPHS: Readonly<Record<string, string>> = {
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '111001111100111',
  '3': '111001011001111',
  '4': '101101111001001',
  '5': '111100111001111',
  '6': '111100111101111',
  '7': '111001010010010',
  '8': '111101111101111',
  '9': '111101111001111',
  '%': '101001010100101',
  '-': '000000111000000',
  '?': '111001011000010',
  C: '111100100100111',
  O: '111101101101111',
  N: '10011101101110011001',
  T: '111010010010010',
  E: '111100110100111',
  X: '101101010101101',
}

/** Columns of a glyph; an unknown character takes a blank 3. */
const glyphWidth = (ch: string): number => (GLYPHS[ch]?.length ?? 15) / 5

/** Width in pixels of `s` in the pixel font at `scale`, one blank column between glyphs. */
export const textWidth = (s: string, scale = 1): number =>
  Math.max(0, [...s].reduce((sum, ch) => sum + (glyphWidth(ch) + 1) * scale, 0) - scale)

/** Draws `s` in the pixel font as one path of class `cls`, top-left at (x, y). */
export const text = (cls: string, s: string, x: number, y: number, scale = 1): string => {
  let d = ''
  let cx = x

  for (const ch of s) {
    const glyph = GLYPHS[ch]
    const w = glyphWidth(ch)

    if (glyph !== undefined) {
      for (let i = 0; i < glyph.length; i += 1) {
        if (glyph.charAt(i) === '1') {
          d += `M${cx + (i % w) * scale} ${y + Math.floor(i / w) * scale}h${scale}v${scale}h${-scale}z`
        }
      }
    }
    cx += (w + 1) * scale
  }

  return d === '' ? '' : `<path class="${cls}" d="${d}"/>`
}

/** A small seeded random generator, so the art is the same on every draw. */
export const seeded = (seed: number): (() => number) => {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable small number from a string. */
export const hashOf = (s: string): number => {
  let h = 2166136261

  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}
