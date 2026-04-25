// Generates build/icon.ico — blood moon crescent at 16, 32, 48, 256px
'use strict'
const fs = require('fs')
const path = require('path')

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx, dy = y - cy
  return dx * dx + dy * dy <= r * r
}

// Render one size. Returns BGRA pixel buffer in BMP bottom-up row order.
function renderSize(size) {
  const cx = size / 2
  const cy = size / 2
  const r1 = size * 0.42          // main circle
  const r2 = size * 0.325         // cutout circle
  const ox = size * 0.175         // cutout offset right
  const oy = size * 0.15          // cutout offset up (negative screen-y)

  const S = size >= 48 ? 4 : 3    // supersampling per axis
  const step = 1 / S

  // gold #C89B3C  →  R=200 G=155 B=60
  const R = 200, G = 155, B = 60

  const buf = Buffer.alloc(size * size * 4, 0)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = px + (sx + 0.5) * step
          const fy = py + (sy + 0.5) * step
          if (inCircle(fx, fy, cx, cy, r1) && !inCircle(fx, fy, cx + ox, cy - oy, r2)) hits++
        }
      }
      if (hits === 0) continue

      const alpha = Math.round((hits / (S * S)) * 255)
      // BMP rows are bottom-up: screen row py → file row (size-1-py)
      const off = ((size - 1 - py) * size + px) * 4
      buf[off]     = B
      buf[off + 1] = G
      buf[off + 2] = R
      buf[off + 3] = alpha
    }
  }
  return buf
}

// Wrap pixel data in a BMP DIBHEADER (no file header — ICO embeds the DIB directly)
function makeDIB(size, pixels) {
  const pixBytes = size * size * 4
  // AND mask: 1bpp, rows padded to 32-bit boundary, all zeros (alpha channel owns transparency)
  const andRowBytes = Math.ceil(size / 32) * 4
  const andBytes = andRowBytes * size

  const dib = Buffer.alloc(40 + pixBytes + andBytes, 0)
  dib.writeInt32LE(40,          0)   // BITMAPINFOHEADER size
  dib.writeInt32LE(size,        4)   // width
  dib.writeInt32LE(size * 2,    8)   // height × 2 (ICO includes AND mask in height)
  dib.writeInt16LE(1,          12)   // planes
  dib.writeInt16LE(32,         14)   // bpp
  dib.writeInt32LE(0,          16)   // BI_RGB
  dib.writeInt32LE(pixBytes,   20)   // image size
  pixels.copy(dib, 40)
  // AND mask stays zero
  return dib
}

function buildICO(sizes) {
  const frames = sizes.map(size => ({ size, dib: makeDIB(size, renderSize(size)) }))

  const dirOffset  = 6 + frames.length * 16
  let dataOffset   = dirOffset
  const offsets    = frames.map(f => { const o = dataOffset; dataOffset += f.dib.length; return o })

  const ico = Buffer.alloc(dataOffset)
  ico.writeUInt16LE(0,             0)
  ico.writeUInt16LE(1,             2)   // type = ICO
  ico.writeUInt16LE(frames.length, 4)

  frames.forEach((f, i) => {
    const b = 6 + i * 16
    const s = f.size === 256 ? 0 : f.size   // 0 encodes 256 in the ICO spec
    ico.writeUInt8(s,              b)
    ico.writeUInt8(s,              b + 1)
    ico.writeUInt8(0,              b + 2)
    ico.writeUInt8(0,              b + 3)
    ico.writeUInt16LE(1,           b + 4)   // planes
    ico.writeUInt16LE(32,          b + 6)   // bpp
    ico.writeUInt32LE(f.dib.length, b + 8)
    ico.writeUInt32LE(offsets[i],  b + 12)
  })

  frames.forEach((f, i) => f.dib.copy(ico, offsets[i]))
  return ico
}

const out = path.join(__dirname, '..', 'build', 'icon.ico')
fs.writeFileSync(out, buildICO([16, 32, 48, 256]))
console.log(`Icon written → ${out}  (${fs.statSync(out).size} bytes)`)
