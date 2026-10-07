'use client'

import { useEffect, useRef } from 'react'

export interface SwarmTarget {
    label: string
    /** `#section` scrolls the home page; anything else navigates. */
    href: string
    kind: 'section' | 'project'
}

interface NeuralSwarmProps {
    /** Portfolio sections and projects; each rides on a neuron and can be clicked. */
    targets?: SwarmTarget[]
    /** The monogram the swarm assembles into (a transparent PNG). */
    markSrc?: string
    className?: string
}

const CREAM = [250, 248, 245]
const CORAL = [253, 67, 69]
const NAVY = [26, 36, 51]
const BORDEAUX = '#800020'

/** The three scenes the swarm moves through: who (mark), the machine (chip), the mind (brain). */
type Scene = 'scatter' | 'mark' | 'chip' | 'brain' | 'snap'

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`
const mix = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Deterministic pseudo-random so every visit draws the same brain and chip. */
function rng(seed: number) {
    let s = seed >>> 0
    return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** A board trace in canvas pixels: a polyline with its cumulative segment lengths. */
interface Wire {
    pts: number[]
    acc: number[]
    total: number
    coral: boolean
}

/**
 * Interconnects on the dot grid, PCB style: bundles of parallel traces come in from the edges,
 * run straight, jog 45° toward the centre, run straight again and stop in a via short of the swarm.
 * Cells are claimed on a doubled grid (points and segment midpoints) so no two traces touch or cross.
 */
function routeWires(
    cols: number,
    rows: number,
    toPx: (c: number, r: number) => [number, number],
    centreCell: [number, number],
    centrePx: [number, number],
    keepOut: number,
    avoid: (x: number, y: number) => boolean,
    want: number,
): Wire[] {
    const rand = rng(29)
    const taken = new Set<number>()
    const key = (c2: number, r2: number) => (c2 + 4) * 100003 + (r2 + 4)
    const wires: Wire[] = []
    // Local frame per edge: u runs inward from the edge, v runs along it.
    const frames = [
        (u: number, v: number): [number, number] => [u, v],
        (u: number, v: number): [number, number] => [cols - 1 - u, v],
        (u: number, v: number): [number, number] => [v, u],
        (u: number, v: number): [number, number] => [v, rows - 1 - u],
    ]
    const span = [rows, rows, cols, cols]
    for (let attempt = 0; attempt < 1200 && wires.length < want; attempt++) {
        const edge = Math.floor(rand() * 4)
        const frame = frames[edge]
        const b = 2 + Math.floor(rand() * 5)
        const v0 = Math.floor(rand() * Math.max(1, span[edge] - b))
        // Where the centre sits in this frame, to jog toward it.
        const vc = edge < 2 ? centreCell[1] : centreCell[0]
        const gap = vc - (v0 + b / 2)
        const sigma = Math.abs(gap) < 2 ? (rand() < 0.5 ? -1 : 1) : Math.sign(gap)
        const a = 1 + Math.floor(rand() * 9)
        const d = Math.max(1, Math.min(Math.abs(gap) | 0, 2 + Math.floor(rand() * 6)))
        for (let k = 0; k < b; k++) {
            const v = v0 + k
            const turn = a + (sigma < 0 ? k : b - 1 - k)
            const cells: [number, number][] = []
            for (let u = -1; u <= turn; u++) cells.push(frame(u, v))
            for (let s = 1; s <= d; s++) cells.push(frame(turn + s, v + sigma * s))
            let u = turn + d
            const vEnd = v + sigma * d
            for (let steps = 0; steps < 60; steps++) {
                const [c, r] = frame(u + 1, vEnd)
                if (c < 0 || r < 0 || c >= cols || r >= rows) break
                const [px, py] = toPx(c, r)
                if (Math.hypot(px - centrePx[0], py - centrePx[1]) < keepOut) break
                cells.push([c, r])
                u++
            }
            if (u - (turn + d) < 2) continue
            // Claim the cells and the midpoints between them; reject any trace that touches another.
            const claim: number[] = []
            let ok = true
            for (let i = 0; i < cells.length && ok; i++) {
                const [c, r] = cells[i]
                const [px, py] = toPx(c, r)
                if (i > 0 && avoid(px, py)) ok = false
                claim.push(key(c * 2, r * 2))
                if (i > 0) claim.push(key(c + cells[i - 1][0], r + cells[i - 1][1]))
            }
            if (!ok || claim.some((id) => taken.has(id))) continue
            claim.forEach((id) => taken.add(id))
            // Keep only the corners.
            const pts: number[] = []
            cells.forEach(([c, r], i) => {
                const prev = cells[i - 1], next = cells[i + 1]
                if (prev && next && c - prev[0] === next[0] - c && r - prev[1] === next[1] - r) return
                const [px, py] = toPx(c, r)
                pts.push(px, py)
            })
            const acc = [0]
            for (let i = 2; i < pts.length; i += 2) acc.push(acc[acc.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]))
            wires.push({ pts, acc, total: acc[acc.length - 1], coral: rand() < 0.3 })
        }
    }
    return wires
}

/** A two-hemisphere, gently folded ellipsoid point cloud (unit-ish space). */
function brainCloud(count: number) {
    const rand = rng(1816)
    const pts = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        const inner = rand() < 0.22
        const u = rand() * 2 - 1
        const a = rand() * Math.PI * 2
        const r0 = Math.sqrt(1 - u * u)
        let x = r0 * Math.cos(a), y = u, z = r0 * Math.sin(a)
        // Gyri: radial ripples so the surface reads as folded tissue.
        const fold = 1 + 0.06 * Math.sin(7 * x + 3 * y) * Math.cos(6 * z - 2 * y) + 0.035 * Math.sin(13 * y + 5 * z)
        const r = inner ? 0.35 + rand() * 0.55 : fold
        x *= r * 1.18; y *= r * 0.86; z *= r
        if (y > 0.55) y = 0.55 + (y - 0.55) * 0.5
        x += Math.sign(x || 1) * 0.07
        pts[i * 3] = x; pts[i * 3 + 1] = y; pts[i * 3 + 2] = z
    }
    return pts
}

interface MarkSample { xs: Float32Array; ys: Float32Array; coral: Uint8Array }

/** Samples the monogram's opaque pixels into target points and their colours. */
async function sampleMark(src: string, count: number): Promise<MarkSample> {
    const img = new Image()
    img.src = src
    await img.decode()
    const size = 140
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0, size, size)
    const data = g.getImageData(0, 0, size, size).data
    const pool: { x: number; y: number; coral: boolean }[] = []
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const k = (y * size + x) * 4
            if (data[k + 3] < 140) continue
            pool.push({ x: x / size - 0.5, y: y / size - 0.5, coral: data[k] > 110 && data[k + 1] < 90 })
        }
    }
    if (!pool.length) throw new Error('empty mark')
    const rand = rng(26)
    const xs = new Float32Array(count), ys = new Float32Array(count), coral = new Uint8Array(count)
    for (let i = 0; i < count; i++) {
        const p = pool[Math.floor(rand() * pool.length)]
        xs[i] = p.x + (rand() - 0.5) * 0.006
        ys[i] = p.y + (rand() - 0.5) * 0.006
        coral[i] = p.coral ? 1 : 0
    }
    return { xs, ys, coral }
}

/**
 * A processor in units of `scale`: die frame, pins on four sides, traces running out to vias,
 * and the monogram engraved at the core. Returns particle targets plus the trace paths signals ride.
 */
function chipLayout(count: number, mark: MarkSample | null) {
    const rand = rng(404)
    const die = 0.74
    const pinLen = 0.2
    const pins = 6
    const traces: number[][][] = []
    const pinSegments: number[][][] = []
    for (let side = 0; side < 4; side++) {
        for (let p = 0; p < pins; p++) {
            const along = -die * 0.78 + (p / (pins - 1)) * die * 1.56
            // Build on the right side, then rotate into place.
            const out1 = die + pinLen
            const run = 0.16 + rand() * 0.3
            const turn = (p % 2 === 0 ? 1 : -1) * (0.12 + rand() * 0.22)
            const local = [[die, along], [out1, along]]
            const trace = [[out1, along], [out1 + run, along], [out1 + run + 0.08, along + turn], [out1 + run + 0.08 + 0.18 + rand() * 0.2, along + turn]]
            const rot = (pt: number[]) => {
                const [x, y] = pt
                return side === 0 ? [x, y] : side === 1 ? [-y, x] : side === 2 ? [-x, -y] : [y, -x]
            }
            pinSegments.push(local.map(rot))
            traces.push(trace.map(rot))
        }
    }
    const xs = new Float32Array(count), ys = new Float32Array(count), coral = new Uint8Array(count)
    const pointOnPath = (path: number[][], t: number) => {
        const lens: number[] = []
        let total = 0
        for (let k = 1; k < path.length; k++) {
            const l = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1])
            lens.push(l)
            total += l
        }
        let d = t * total
        for (let k = 0; k < lens.length; k++) {
            if (d <= lens[k]) {
                const f = d / lens[k]
                return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f]
            }
            d -= lens[k]
        }
        return path[path.length - 1]
    }
    for (let i = 0; i < count; i++) {
        const r = rand()
        let x = 0, y = 0
        if (r < 0.22) {
            // Die frame: an outer and an inner ring.
            const ring = rand() < 0.62 ? die : die * 0.88
            const t = rand() * 4
            const s = (t % 1) * 2 - 1
            const e = Math.floor(t)
            x = e === 0 ? ring : e === 1 ? -ring : s * ring
            y = e === 2 ? ring : e === 3 ? -ring : s * ring
        } else if (r < 0.33) {
            const seg = pinSegments[Math.floor(rand() * pinSegments.length)]
            ;[x, y] = pointOnPath(seg, rand())
        } else if (r < 0.54) {
            const path = traces[Math.floor(rand() * traces.length)]
            ;[x, y] = pointOnPath(path, rand())
        } else if (r < 0.59) {
            const path = traces[Math.floor(rand() * traces.length)]
            const end = path[path.length - 1]
            const a = rand() * Math.PI * 2
            x = end[0] + Math.cos(a) * 0.035
            y = end[1] + Math.sin(a) * 0.035
        } else if (mark) {
            // The monogram engraved at the core.
            const k = Math.floor(rand() * mark.xs.length)
            x = mark.xs[k] * die * 1.35
            y = mark.ys[k] * die * 1.35
            coral[i] = mark.coral[k]
        } else {
            x = (rand() - 0.5) * die * 1.2
            y = (rand() - 0.5) * die * 1.2
        }
        xs[i] = x + (rand() - 0.5) * 0.006
        ys[i] = y + (rand() - 0.5) * 0.006
    }
    return { xs, ys, coral, traces }
}

export default function NeuralSwarm({ targets = [], markSrc = '/il-logo-mark.png', className }: NeuralSwarmProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const finePointer = window.matchMedia('(pointer: fine)').matches
        const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim() || 'ui-monospace'
        const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim() || 'system-ui'

        let width = 0, height = 0, dpr = 1
        let cx = 0, cy = 0, scale = 0, markSize = 0
        let n = 0
        let brain = new Float32Array(0)
        let markX = new Float32Array(0), markY = new Float32Array(0), isCoral = new Uint8Array(0)
        let chipX = new Float32Array(0), chipY = new Float32Array(0), chipCoral = new Uint8Array(0)
        let traces: number[][][] = []
        let startX = new Float32Array(0), startY = new Float32Array(0), delay = new Float32Array(0)
        let ox = new Float32Array(0), oy = new Float32Array(0)
        let sx = new Float32Array(0), sy = new Float32Array(0), sz = new Float32Array(0)
        let edges: [number, number][] = []
        let neighbours: number[][] = []
        let neurons: number[] = []
        let anchors: number[] = []

        // Thoughts: a few streaks drawn toward the centre from the edges.
        let m = 0
        let ax = new Float32Array(0), ay = new Float32Array(0), apx = new Float32Array(0), apy = new Float32Array(0)
        let aCoral = new Uint8Array(0)

        // Scene director: a transition from one scene to another, then a hold.
        const scene = { from: 'scatter' as Scene, to: 'mark' as Scene, start: performance.now(), dur: 1400, settledAt: 0, fromBrain: 0, fromChip: 0 }
        // Where every particle was when a transition got interrupted, so the next one continues from there.
        let snapX = new Float32Array(0), snapY = new Float32Array(0)
        const go = (to: Scene, dur: number, now: number) => {
            if (!scene.settledAt && scene.from !== 'scatter') {
                snapX.set(sx)
                snapY.set(sy)
                scene.fromBrain = brainness
                scene.fromChip = chipness
                scene.from = 'snap'
            } else {
                scene.fromBrain = scene.to === 'brain' ? 1 : 0
                scene.fromChip = scene.to === 'chip' ? 1 : 0
                scene.from = scene.to
            }
            scene.to = to
            scene.start = now
            scene.dur = dur
            scene.settledAt = 0
        }

        let rotY = 0.4, tiltX = -0.18
        let velY = 0, velX = 0
        const pointer = { x: -9999, y: -9999, inside: false, active: false }
        const eased = { x: -9999, y: -9999 }
        const drag = { on: false, id: -1, lastX: 0, lastY: 0, moved: 0, target: -1 }
        let hovered = -1
        let lastInteraction = -Infinity
        const beats: number[] = []
        let lastBeat = 0
        const signals: { a: number; b: number; t: number; v: number }[] = []
        const pulses: { path: number; t: number; v: number }[] = []
        let lastPulse = 0
        const fire = new Map<number, number>()
        // Neon interconnects: the board under everything, with light running along it into the swarm.
        let gs = 22, gx = 0, gy = 0, gCols = 0, gRows = 0
        let wires: Wire[] = []
        const wireLayer = document.createElement('canvas')
        const wctx = wireLayer.getContext('2d')
        const currents: { wire: number; s: number; v: number; arrived: boolean }[] = []
        const viaFlash = new Map<number, number>()
        let lastCurrent = 0
        let running = false, visible = true, frame = 0, lastSpawn = 0

        const layout = () => {
            if (width >= 1024) {
                cx = width * 0.72; cy = height * 0.53
                scale = Math.min(width * 0.16, height * 0.29)
            } else {
                cx = width * 0.5; cy = height * 0.72
                scale = Math.min(width * 0.29, height * 0.19)
            }
            markSize = scale * 2.3
            gs = width >= 1024 ? 22 : 20
            gCols = Math.ceil(width / gs) + 1
            gRows = Math.ceil(height / gs) + 1
            gx = (width - (gCols - 1) * gs) / 2
            gy = (height - (gRows - 1) * gs) / 2
            wires = routeWires(
                gCols,
                gRows,
                (c, r) => [gx + c * gs, gy + r * gs],
                [Math.round((cx - gx) / gs), Math.round((cy - gy) / gs)],
                [cx, cy],
                scale * 1.55,
                (x, y) => behindCopy(x, y, 28),
                width >= 1024 ? 110 : 40,
            )
            currents.length = 0
            viaFlash.clear()
            paintWires()
        }
        // The idle board is painted once per size; only the light moving along it is drawn per frame.
        const paintWires = () => {
            if (!wctx) return
            wireLayer.width = Math.max(1, Math.round(width * dpr))
            wireLayer.height = Math.max(1, Math.round(height * dpr))
            wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            wctx.lineJoin = 'miter'
            wctx.lineCap = 'square'
            for (const wire of wires) {
                wctx.strokeStyle = wire.coral ? rgba(CORAL, 0.34) : rgba(CREAM, 0.15)
                wctx.lineWidth = 1.2
                wctx.beginPath()
                wctx.moveTo(wire.pts[0], wire.pts[1])
                for (let i = 2; i < wire.pts.length; i += 2) wctx.lineTo(wire.pts[i], wire.pts[i + 1])
                wctx.stroke()
                const ex = wire.pts[wire.pts.length - 2], ey = wire.pts[wire.pts.length - 1]
                wctx.strokeStyle = wire.coral ? rgba(CORAL, 0.7) : rgba(CREAM, 0.4)
                wctx.beginPath()
                wctx.arc(ex, ey, 3.2, 0, Math.PI * 2)
                wctx.stroke()
            }
            // Let the board fade out under the navigation bar.
            const fade = wctx.createLinearGradient(0, 0, 0, 96)
            fade.addColorStop(0, 'rgba(0,0,0,0.9)')
            fade.addColorStop(1, 'rgba(0,0,0,0)')
            wctx.globalCompositeOperation = 'destination-out'
            wctx.fillStyle = fade
            wctx.fillRect(0, 0, width, 96)
            wctx.globalCompositeOperation = 'source-over'
        }
        const wireAt = (wire: Wire, d: number): [number, number] => {
            const { pts, acc } = wire
            for (let k = 1; k < acc.length; k++) {
                if (d <= acc[k]) {
                    const f = (d - acc[k - 1]) / (acc[k] - acc[k - 1] || 1)
                    const i = (k - 1) * 2
                    return [pts[i] + (pts[i + 2] - pts[i]) * f, pts[i + 1] + (pts[i + 3] - pts[i + 1]) * f]
                }
            }
            return [pts[pts.length - 2], pts[pts.length - 1]]
        }

        const build = (mark: MarkSample | null) => {
            n = width >= 1024 ? 1600 : 900
            brain = brainCloud(n)
            const rand = rng(7)
            markX = new Float32Array(n); markY = new Float32Array(n); isCoral = new Uint8Array(n)
            for (let i = 0; i < n; i++) {
                if (mark) {
                    markX[i] = mark.xs[i % mark.xs.length]
                    markY[i] = mark.ys[i % mark.ys.length]
                    isCoral[i] = mark.coral[i % mark.coral.length]
                } else isCoral[i] = rand() < 0.12 ? 1 : 0
            }
            const chip = chipLayout(n, mark)
            chipX = chip.xs; chipY = chip.ys; chipCoral = chip.coral; traces = chip.traces
            startX = new Float32Array(n); startY = new Float32Array(n); delay = new Float32Array(n)
            for (let i = 0; i < n; i++) {
                const a = rand() * Math.PI * 2
                const r = 1.6 + rand() * 1.4
                startX[i] = Math.cos(a) * r
                startY[i] = Math.sin(a) * r
                delay[i] = rand() * 650
            }
            ox = new Float32Array(n); oy = new Float32Array(n)
            sx = new Float32Array(n); sy = new Float32Array(n); sz = new Float32Array(n)
            snapX = new Float32Array(n); snapY = new Float32Array(n)
            neurons = []
            for (let i = 0; i < n; i += 6) neurons.push(i)
            edges = []
            neighbours = neurons.map(() => [])
            for (let a = 0; a < neurons.length; a++) {
                const ia = neurons[a]
                let d1 = Infinity, b1 = -1, d2 = Infinity, b2 = -1
                for (let b = 0; b < neurons.length; b++) {
                    if (a === b) continue
                    const ib = neurons[b]
                    const dx = brain[ia * 3] - brain[ib * 3]
                    const dy = brain[ia * 3 + 1] - brain[ib * 3 + 1]
                    const dz = brain[ia * 3 + 2] - brain[ib * 3 + 2]
                    const d = dx * dx + dy * dy + dz * dz
                    if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = b } else if (d < d2) { d2 = d; b2 = b }
                }
                for (const b of [b1, b2]) {
                    if (b < 0) continue
                    if (a < b) edges.push([a, b])
                    neighbours[a].push(b)
                    neighbours[b].push(a)
                }
            }
            anchors = targets.map((_, i) => Math.floor((((i + 1) * 0.618034) % 1) * neurons.length))
            m = width >= 1024 ? 160 : 70
            ax = new Float32Array(m); ay = new Float32Array(m); apx = new Float32Array(m); apy = new Float32Array(m); aCoral = new Uint8Array(m)
            for (let i = 0; i < m; i++) {
                ax[i] = apx[i] = rand() * width
                ay[i] = apy[i] = rand() * height
                aCoral[i] = rand() < 0.3 ? 1 : 0
            }
            const now = performance.now()
            if (reduce || !mark) {
                scene.from = 'brain'
                scene.to = 'brain'
                scene.fromBrain = 1
                scene.fromChip = 0
                scene.start = now - 10000
                scene.dur = 1
            } else {
                scene.from = 'scatter'
                scene.to = 'mark'
                scene.fromBrain = 0
                scene.fromChip = 0
                scene.start = now
                scene.dur = 1400
            }
            scene.settledAt = 0
        }

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            width = rect.width
            height = rect.height
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            layout()
            if (n && !running) draw(performance.now())
        }

        const spawn = (from: number, now: number) => {
            const options = neighbours[from]
            if (!options?.length || signals.length > 60) return
            signals.push({ a: from, b: options[Math.floor(Math.random() * options.length)], t: 0, v: 0.0016 + Math.random() * 0.0014 })
            fire.set(from, 1)
            lastSpawn = now
        }
        const behindCopy = (x: number, y: number, pad = 0) =>
            width >= 1024 ? x < width * 0.47 + pad && y > height * 0.22 - pad && y < height * 0.78 + pad : y < height * 0.5 + pad
        const tracePoint = (path: number[][], t: number) => {
            // t runs 1 -> 0: from the via inward to the pin.
            let total = 0
            const lens: number[] = []
            for (let k = 1; k < path.length; k++) {
                const l = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1])
                lens.push(l)
                total += l
            }
            let d = clamp01(t) * total
            for (let k = 0; k < lens.length; k++) {
                if (d <= lens[k]) {
                    const f = d / lens[k]
                    return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f]
                }
                d -= lens[k]
            }
            return path[path.length - 1]
        }

        let previous = performance.now()
        let brainness = 0
        let chipness = 0
        const draw = (now: number) => {
            const dt = Math.min(now - previous, 48)
            previous = now
            ctx.clearRect(0, 0, width, height)
            if (!n) return
            const interacting = drag.on || now - lastInteraction < 16000

            // Director: mark -> brain -> (16s untouched) -> chip -> mark -> brain ...
            const raw = clamp01((now - scene.start) / scene.dur)
            const p = scene.from === 'scatter' ? 1 : easeInOut(raw)
            if (raw >= 1 && !scene.settledAt) scene.settledAt = now
            if (scene.settledAt && !reduce) {
                const held = now - scene.settledAt
                if (scene.to === 'mark' && held > (scene.from === 'scatter' ? 650 + 1500 : 1300)) go('brain', 1700, now)
                else if (scene.to === 'brain' && !interacting && held > 16000) go('chip', 1600, now)
                else if (scene.to === 'chip' && held > 6200 && !interacting) go('mark', 1300, now)
            }
            const fromWeight = (s: Scene) => (s === 'brain' ? scene.fromBrain : s === 'chip' ? scene.fromChip : scene.from === s ? 1 : 0)
            const weight = (s: Scene) => fromWeight(s) * (1 - p) + (scene.to === s ? p : 0)
            brainness = weight('brain')
            chipness = weight('chip')

            // Rotation: drag spins it with inertia; idle, it turns slowly on its own.
            if (!drag.on) {
                rotY += velY * dt
                tiltX += velX * dt
                velY *= 0.95
                velX *= 0.95
                if (!reduce) rotY += dt * 0.00018
                tiltX += (-0.18 - tiltX) * 0.004
            }
            tiltX = Math.max(-1.1, Math.min(1.1, tiltX))
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY)
            const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX)
            const breath = reduce ? 1 : 1 + 0.028 * Math.sin(now * 0.0011)
            const bScale = scale * breath

            // Heartbeat rings (lub-dub) shared by the dot field and the brain.
            if (!reduce && brainness > 0.9 && now - lastBeat > 2800) {
                beats.push(now, now + 260)
                lastBeat = now
            }
            const rings: { r: number; p: number }[] = []
            for (let b = beats.length - 1; b >= 0; b--) {
                const age = now - beats[b]
                if (age < 0) continue
                const pr = age / 2600
                if (pr >= 1) {
                    beats.splice(b, 1)
                    continue
                }
                rings.push({ r: scale * (0.15 + pr * 3.4), p: pr })
            }

            // Dot field across the whole hero (after ethos.ar): parts around the pointer, ripples with each heartbeat.
            if (!pointer.active || !finePointer) {
                const t = now / 1000
                pointer.x = width * (0.55 + 0.38 * Math.sin(t * 0.21))
                pointer.y = height * (0.5 + 0.34 * Math.sin(t * 0.33 + 1.1))
            }
            if (eased.x < -9000) { eased.x = pointer.x; eased.y = pointer.y }
            eased.x += (pointer.x - eased.x) * 0.1
            eased.y += (pointer.y - eased.y) * 0.1
            const spacing = gs, cols = gCols, rows = gRows, offX = gx, offY = gy
            const wave = reduce ? 0 : now / 2400
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    let x = offX + col * spacing
                    let y = offY + row * spacing
                    let alpha = 0.12 + (reduce ? 0 : 0.05 * Math.sin(wave + col * 0.23 + row * 0.17))
                    let size = 1.6
                    const dx = x - eased.x, dy = y - eased.y
                    const d = Math.sqrt(dx * dx + dy * dy)
                    if (d < 150) {
                        const f = (1 - d / 150) ** 2
                        if (d > 0.001) {
                            x += (dx / d) * f * spacing * 0.9
                            y += (dy / d) * f * spacing * 0.9
                        }
                        alpha += 0.6 * f
                        size += 1.4 * f
                    }
                    let tint = CREAM
                    if (rings.length) {
                        const rx = x - cx, ry = y - cy
                        const rd = Math.sqrt(rx * rx + ry * ry) || 1
                        for (const ring of rings) {
                            const near = 1 - Math.abs(rd - ring.r) / 26
                            if (near > 0) {
                                const k = near * (1 - ring.p)
                                alpha += 0.7 * k
                                size += 1.6 * k
                                x += (rx / rd) * 5 * k
                                y += (ry / rd) * 5 * k
                                if (k > 0.35) tint = CORAL
                            }
                        }
                    }
                    ctx.fillStyle = rgba(tint, behindCopy(x, y) ? alpha * 0.35 : alpha)
                    ctx.fillRect(x - size / 2, y - size / 2, size, size)
                }
            }

            // The board, then neon current running in from the edges; each arrival makes the brain fire.
            if (wires.length) {
                ctx.drawImage(wireLayer, 0, 0, width, height)
                if (!reduce) {
                    const every = chipness > 0.6 ? 70 : width >= 1024 ? 150 : 300
                    if (now - lastCurrent > every && currents.length < (width >= 1024 ? 26 : 10)) {
                        currents.push({ wire: Math.floor(Math.random() * wires.length), s: 0, v: 0.32 + Math.random() * 0.34, arrived: false })
                        lastCurrent = now
                    }
                    ctx.save()
                    ctx.globalCompositeOperation = 'lighter'
                    ctx.lineCap = 'round'
                    const tail = width >= 1024 ? 170 : 120
                    for (let k = currents.length - 1; k >= 0; k--) {
                        const cur = currents[k]
                        const wire = wires[cur.wire]
                        if (!wire) { currents.splice(k, 1); continue }
                        cur.s += cur.v * dt
                        if (!cur.arrived && cur.s >= wire.total) {
                            cur.arrived = true
                            viaFlash.set(cur.wire, 1)
                            if (brainness > 0.9 && neurons.length) spawn(Math.floor(Math.random() * neurons.length), now)
                        }
                        if (cur.s - tail >= wire.total) { currents.splice(k, 1); continue }
                        const col = wire.coral ? CORAL : CREAM
                        const head = Math.min(cur.s, wire.total)
                        const from = Math.max(0, cur.s - tail)
                        const steps = 9
                        // Three strokes per step (halo, core, filament) read as a lit tube without any blur.
                        for (const [lw, la] of [[9, 0.08], [3.5, 0.28], [1.4, 1]] as const) {
                            ctx.lineWidth = lw
                            let [px, py] = wireAt(wire, from)
                            for (let st = 1; st <= steps; st++) {
                                const d = from + ((head - from) * st) / steps
                                const [qx, qy] = wireAt(wire, d)
                                const f = (1 - (cur.s - d) / tail) * (0.1 + 0.9 * clamp01((qy - 40) / 60))
                                ctx.strokeStyle = rgba(col, la * f * f)
                                ctx.beginPath()
                                ctx.moveTo(px, py)
                                ctx.lineTo(qx, qy)
                                ctx.stroke()
                                px = qx
                                py = qy
                            }
                        }
                    }
                    for (const [w, v] of viaFlash) {
                        const wire = wires[w]
                        const ex = wire.pts[wire.pts.length - 2], ey = wire.pts[wire.pts.length - 1]
                        const col = wire.coral ? CORAL : CREAM
                        ctx.fillStyle = rgba(col, v * 0.9)
                        ctx.beginPath()
                        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2)
                        ctx.fill()
                        ctx.strokeStyle = rgba(col, v * 0.35)
                        ctx.lineWidth = 1
                        ctx.beginPath()
                        ctx.arc(ex, ey, 3.2 + (1 - v) * 12, 0, Math.PI * 2)
                        ctx.stroke()
                        const next = v - dt * 0.0016
                        if (next <= 0) viaFlash.delete(w)
                        else viaFlash.set(w, next)
                    }
                    ctx.restore()
                }
            }

            // Thoughts streaming toward the centre.
            ctx.lineWidth = 1
            for (let i = 0; i < m; i++) {
                apx[i] = ax[i]
                apy[i] = ay[i]
                if (!reduce) {
                    const angle = (Math.sin(ax[i] * 0.0032 + now * 0.00011) + Math.cos(ay[i] * 0.0041 - now * 0.00009)) * 1.5
                    let vx = Math.cos(angle) * 0.04 * dt
                    let vy = Math.sin(angle) * 0.04 * dt
                    const dx = cx - ax[i], dy = cy - ay[i]
                    const d = Math.sqrt(dx * dx + dy * dy) || 1
                    const pull = 0.07 * dt * Math.max(0.25, brainness + chipness)
                    vx += (dx / d) * pull
                    vy += (dy / d) * pull
                    ax[i] += vx
                    ay[i] += vy
                    if ((brainness + chipness > 0.5 && d < scale * 0.9) || ax[i] < -30 || ax[i] > width + 30 || ay[i] < -30 || ay[i] > height + 30) {
                        const edge = Math.floor(Math.random() * 4)
                        ax[i] = apx[i] = edge === 0 ? -20 : edge === 1 ? width + 20 : Math.random() * width
                        ay[i] = apy[i] = edge === 2 ? -20 : edge === 3 ? height + 20 : Math.random() * height
                        continue
                    }
                }
                const col = aCoral[i] ? CORAL : CREAM
                ctx.strokeStyle = rgba(col, (aCoral[i] ? 0.75 : 0.45) * (behindCopy(ax[i], ay[i]) ? 0.3 : 1))
                ctx.beginPath()
                ctx.moveTo(apx[i] - (ax[i] - apx[i]) * 9, apy[i] - (ay[i] - apy[i]) * 9)
                ctx.lineTo(ax[i], ay[i])
                ctx.stroke()
            }

            // The flat bordeaux ground: a disc under the brain, morphing into the silicon square under the chip.
            const ground = clamp01(brainness + chipness)
            if (ground > 0.01) {
                const g = easeOut(ground)
                const share = brainness + chipness > 0 ? chipness / (brainness + chipness) : 0
                const half = scale * (1.34 * (1 - share) + 0.98 * share) * g
                const radius = half * (1 - share) + scale * 0.1 * share
                ctx.fillStyle = BORDEAUX
                ctx.beginPath()
                ctx.roundRect(cx - half, cy - half, half * 2, half * 2, radius)
                ctx.fill()
                if (brainness > 0.01) {
                    const r = scale * 1.34 * easeOut(brainness)
                    ctx.strokeStyle = rgba(CREAM, 0.35 * brainness)
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.arc(cx, cy, r * 1.13, 0, Math.PI * 2)
                    ctx.stroke()
                    const orbit = now * 0.00035
                    ctx.fillStyle = rgba(CORAL, brainness)
                    ctx.beginPath()
                    ctx.arc(cx + Math.cos(orbit) * r * 1.13, cy + Math.sin(orbit) * r * 1.13, 4, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.fillStyle = rgba(CREAM, brainness)
                    ctx.beginPath()
                    ctx.arc(cx + Math.cos(orbit + Math.PI) * r * 1.13, cy + Math.sin(orbit + Math.PI) * r * 1.13, 2.5, 0, Math.PI * 2)
                    ctx.fill()
                    for (const ring of rings) {
                        if (ring.r > r * 1.1) continue
                        ctx.strokeStyle = rgba(CREAM, (1 - ring.p) * 0.45)
                        ctx.lineWidth = 1.5
                        ctx.beginPath()
                        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2)
                        ctx.stroke()
                    }
                }
            }

            // Particles: each scene's target, blended across the transition with a per-particle stagger.
            const target = (s: Scene, i: number, bX: number, bY: number) => {
                if (s === 'brain') return [bX, bY]
                if (s === 'mark') return [cx + markX[i] * markSize, cy + markY[i] * markSize]
                if (s === 'chip') return [cx + chipX[i] * scale, cy + chipY[i] * scale]
                if (s === 'snap') return [snapX[i], snapY[i]]
                return [cx + startX[i] * scale, cy + startY[i] * scale]
            }
            for (let i = 0; i < n; i++) {
                const wob = reduce ? 0 : 0.014
                const bx = brain[i * 3] + Math.sin(now * 0.0009 + i * 0.37) * wob
                const by = brain[i * 3 + 1] + Math.cos(now * 0.0008 + i * 0.53) * wob
                const bz = brain[i * 3 + 2]
                const x1 = bx * cosY + bz * sinY
                const z1 = -bx * sinY + bz * cosY
                const y2 = by * cosX - z1 * sinX
                const z2 = by * sinX + z1 * cosX
                const persp = 2.6 / (2.6 - z2)
                const brainX = cx + x1 * bScale * persp
                const brainY = cy + y2 * bScale * persp
                const [fx, fy] = target(scene.from, i, brainX, brainY)
                const [tx, ty] = target(scene.to, i, brainX, brainY)
                // Each particle leaves on its own beat so a change ripples across the shape.
                const e = scene.from === 'scatter'
                    ? easeOut(clamp01((now - scene.start - delay[i]) / scene.dur))
                    : easeInOut(clamp01(raw * 1.35 - (delay[i] / 650) * 0.35))
                const x = fx + (tx - fx) * e
                const y = fy + (ty - fy) * e
                if (pointer.active && !drag.on && !reduce) {
                    const dx = x + ox[i] - pointer.x
                    const dy = y + oy[i] - pointer.y
                    const d2 = dx * dx + dy * dy
                    if (d2 < 3600 && d2 > 1) {
                        const d = Math.sqrt(d2)
                        ox[i] += (dx / d) * (1 - d / 60) * 1.4
                        oy[i] += (dy / d) * (1 - d / 60) * 1.4
                    }
                }
                if (rings.length && brainness > 0.9) {
                    const dx = x - cx, dy = y - cy
                    const d = Math.sqrt(dx * dx + dy * dy) || 1
                    for (const ring of rings) {
                        if (Math.abs(d - ring.r) < 14) {
                            ox[i] += (dx / d) * 0.9
                            oy[i] += (dy / d) * 0.9
                        }
                    }
                }
                ox[i] *= 0.9
                oy[i] *= 0.9
                sx[i] = x + ox[i]
                sy[i] = y + oy[i]
                sz[i] = z2 * brainness
            }

            if (brainness > 0.05) {
                ctx.lineWidth = 1
                for (const [a, b] of edges) {
                    const ia = neurons[a], ib = neurons[b]
                    const depth = (sz[ia] + sz[ib]) / 2
                    ctx.strokeStyle = rgba(CREAM, (0.08 + Math.max(0, depth + 1) * 0.09) * brainness)
                    ctx.beginPath()
                    ctx.moveTo(sx[ia], sy[ia])
                    ctx.lineTo(sx[ib], sy[ib])
                    ctx.stroke()
                }
            }

            const markness = Math.max(0, 1 - brainness - chipness)
            for (let i = 0; i < n; i++) {
                const depth = sz[i]
                const size = 2 * markness + (1.1 + (depth + 1.2) * 0.75) * brainness + 2 * chipness
                const alpha = 0.95 * markness + (0.35 + (depth + 1) * 0.3) * brainness + 0.92 * chipness
                // Red-and-white per scene: coral in the mark, navy specks on the brain's disc, the engraved mark on the chip.
                const markCol = isCoral[i] ? CORAL : CREAM
                const brainCol = isCoral[i] ? NAVY : CREAM
                const chipCol = chipCoral[i] ? CORAL : CREAM
                const col = mix(mix(markCol, brainCol, brainness), chipCol, chipness)
                ctx.fillStyle = rgba(col, isCoral[i] ? alpha + 0.3 * brainness : alpha)
                ctx.fillRect(sx[i] - size / 2, sy[i] - size / 2, size, size)
            }

            // Chip scene: data pulses race along the traces into the die.
            if (chipness > 0.6 && !reduce) {
                if (now - lastPulse > 120 && pulses.length < 30) {
                    pulses.push({ path: Math.floor(Math.random() * traces.length), t: 1, v: 0.0011 + Math.random() * 0.0012 })
                    lastPulse = now
                }
                for (let k = pulses.length - 1; k >= 0; k--) {
                    const pulse = pulses[k]
                    pulse.t -= pulse.v * dt
                    if (pulse.t <= 0) {
                        pulses.splice(k, 1)
                        continue
                    }
                    const path = traces[pulse.path]
                    const [hx, hy] = tracePoint(path, pulse.t)
                    const [tx2, ty2] = tracePoint(path, Math.min(1, pulse.t + 0.22))
                    ctx.strokeStyle = rgba(CREAM, 0.9 * chipness)
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.moveTo(cx + tx2 * scale, cy + ty2 * scale)
                    ctx.lineTo(cx + hx * scale, cy + hy * scale)
                    ctx.stroke()
                    ctx.fillStyle = rgba(CORAL, chipness)
                    ctx.fillRect(cx + hx * scale - 3, cy + hy * scale - 3, 6, 6)
                }
            } else if (chipness < 0.1) pulses.length = 0

            hovered = -1
            if (brainness > 0.6) {
                for (let s = signals.length - 1; s >= 0; s--) {
                    const sig = signals[s]
                    sig.t += sig.v * dt
                    const ia = neurons[sig.a], ib = neurons[sig.b]
                    const t = Math.min(1, sig.t)
                    const hx = sx[ia] + (sx[ib] - sx[ia]) * t
                    const hy = sy[ia] + (sy[ib] - sy[ia]) * t
                    const tail = Math.max(0, t - 0.35)
                    ctx.strokeStyle = rgba(CREAM, 0.95)
                    ctx.lineWidth = 1.8
                    ctx.beginPath()
                    ctx.moveTo(sx[ia] + (sx[ib] - sx[ia]) * tail, sy[ia] + (sy[ib] - sy[ia]) * tail)
                    ctx.lineTo(hx, hy)
                    ctx.stroke()
                    ctx.fillStyle = rgba(CREAM, 1)
                    ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5)
                    if (sig.t >= 1) {
                        signals.splice(s, 1)
                        fire.set(sig.b, 1)
                        if (Math.random() < 0.55) spawn(sig.b, now)
                    }
                }
                for (const [k, v] of fire) {
                    const i = neurons[k]
                    ctx.strokeStyle = rgba(CREAM, v * 0.9)
                    ctx.lineWidth = 1
                    ctx.strokeRect(sx[i] - 4, sy[i] - 4, 8, 8)
                    const next = v - dt * 0.0025
                    if (next <= 0) fire.delete(k)
                    else fire.set(k, next)
                }
                if (!reduce && now - lastSpawn > 140) spawn(Math.floor(Math.random() * neurons.length), now)

                // Clickable targets: sections and projects riding on front-facing neurons.
                let best = 22
                if (pointer.active && !drag.on) {
                    anchors.forEach((k, idx) => {
                        const i = neurons[k]
                        if (sz[i] < 0.05) return
                        const d = Math.hypot(sx[i] - pointer.x, sy[i] - pointer.y)
                        if (d < best) {
                            best = d
                            hovered = idx
                        }
                    })
                }
                // Labels are placed in priority order (hover, sections, then nearest projects); a label that
                // would collide with one already placed is skipped and its node keeps only its dot.
                const placed: { x: number; y: number; w: number; h: number }[] = []
                const order = anchors
                    .map((k, idx) => ({ idx, z: sz[neurons[k]] }))
                    .sort((a, b) => (a.idx === hovered ? -1 : b.idx === hovered ? 1 : 0)
                        || (targets[a.idx].kind === targets[b.idx].kind ? 0 : targets[a.idx].kind === 'section' ? -1 : 1)
                        || b.z - a.z)
                order.forEach(({ idx }) => {
                    const i = neurons[anchors[idx]]
                    const front = sz[i]
                    const isHover = idx === hovered
                    if (front < 0.05 && !isHover) return
                    const a = isHover ? 1 : Math.min(1, (front - 0.05) * 2.4) * brainness
                    if (a <= 0.02) return
                    const item = targets[idx]
                    const section = item.kind === 'section'
                    const dot = isHover ? 9 : section ? 7 : 5
                    ctx.fillStyle = rgba(section ? CREAM : CORAL, a)
                    ctx.fillRect(sx[i] - dot / 2, sy[i] - dot / 2, dot, dot)
                    if (isHover) {
                        ctx.strokeStyle = rgba(CREAM, 1)
                        ctx.lineWidth = 1.5
                        ctx.strokeRect(sx[i] - 9, sy[i] - 9, 18, 18)
                    }
                    if (width < 640 && !isHover) return
                    ctx.font = section ? `600 ${isHover ? 14 : 12}px ${sans}` : `500 ${isHover ? 12 : 11}px ${mono}`
                    const text = isHover ? `${item.label}  →` : item.label
                    const w = ctx.measureText(text).width
                    const side = sx[i] > cx && sx[i] + 26 + w < width - 12 ? 1 : -1
                    const lx = Math.min(width - w - 8, Math.max(8, side > 0 ? sx[i] + 22 : sx[i] - 22 - w))
                    const box = { x: lx - 8, y: sy[i] - 36, w: w + 16, h: 26 }
                    if (!isHover && placed.some((r) => box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y)) return
                    placed.push(box)
                    ctx.strokeStyle = rgba(CREAM, a * 0.55)
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.moveTo(sx[i] + 5 * side, sy[i] - 5)
                    ctx.lineTo(sx[i] + 18 * side, sy[i] - 18)
                    ctx.stroke()
                    if (isHover) {
                        ctx.fillStyle = rgba(CREAM, 1)
                        ctx.fillRect(lx - 7, sy[i] - 35, w + 14, 24)
                        ctx.fillStyle = rgba(NAVY, 1)
                    } else ctx.fillStyle = rgba(CREAM, a)
                    ctx.fillText(text, lx, sy[i] - 18)
                })
            }
            const overShape = pointer.active && Math.hypot(pointer.x - cx, pointer.y - cy) < scale * 1.4
            canvas.style.cursor = drag.on ? 'grabbing' : hovered >= 0 ? 'pointer' : overShape ? (brainness > 0.9 ? 'grab' : 'pointer') : ''
        }

        const loop = (now: number) => {
            draw(now)
            if (running) frame = requestAnimationFrame(loop)
        }
        const start = () => {
            if (running || reduce || !visible || document.hidden || !n) return
            running = true
            previous = performance.now()
            frame = requestAnimationFrame(loop)
        }
        const stop = () => {
            running = false
            cancelAnimationFrame(frame)
        }
        const redrawIfStill = () => {
            if (!running && n) draw(performance.now())
        }

        const local = (event: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            return { x: event.clientX - rect.left, y: event.clientY - rect.top, h: rect.height }
        }
        const onPointerMove = (event: PointerEvent) => {
            const pt = local(event)
            pointer.x = pt.x
            pointer.y = pt.y
            pointer.inside = pt.y >= 0 && pt.y <= pt.h
            pointer.active = pointer.inside && (event.pointerType === 'mouse' || event.pointerType === 'pen' || drag.on)
            if (drag.on && event.pointerId === drag.id) {
                const dx = event.clientX - drag.lastX
                const dy = event.clientY - drag.lastY
                drag.lastX = event.clientX
                drag.lastY = event.clientY
                drag.moved += Math.abs(dx) + Math.abs(dy)
                rotY += dx * 0.009
                tiltX += dy * 0.007
                velY = dx * 0.0006
                velX = dy * 0.0005
                lastInteraction = performance.now()
            } else if (pointer.inside && Math.hypot(pt.x - cx, pt.y - cy) < scale * 1.5) {
                lastInteraction = performance.now()
            }
            redrawIfStill()
        }
        const onPointerDown = (event: PointerEvent) => {
            const pt = local(event)
            const onShape = Math.hypot(pt.x - cx, pt.y - cy) < scale * 1.5
            // Tapping the chip or the mark brings the brain back.
            if (onShape && scene.to !== 'brain' && scene.from !== 'scatter') {
                go('brain', 1400, performance.now())
                lastInteraction = performance.now()
                return
            }
            if (hovered < 0 && (brainness < 0.9 || !onShape)) return
            drag.on = true
            drag.id = event.pointerId
            drag.lastX = event.clientX
            drag.lastY = event.clientY
            drag.moved = 0
            drag.target = hovered
            pointer.x = pt.x
            pointer.y = pt.y
            lastInteraction = performance.now()
            canvas.setPointerCapture(event.pointerId)
            event.preventDefault()
        }
        const onPointerUp = (event: PointerEvent) => {
            if (!drag.on || event.pointerId !== drag.id) return
            const wasClick = drag.moved < 6
            drag.on = false
            if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
            lastInteraction = performance.now()
            if (!wasClick) return
            // A tap opens the node under the cursor when pressed, else the nearest front-facing one.
            const pt = local(event)
            let pick = drag.target
            let best = pick >= 0 ? -1 : 28
            anchors.forEach((k, idx) => {
                const i = neurons[k]
                if (sz[i] < 0.05) return
                const d = Math.hypot(sx[i] - pt.x, sy[i] - pt.y)
                if (d < best) {
                    best = d
                    pick = idx
                }
            })
            if (pick < 0) return
            const href = targets[pick].href
            if (href.startsWith('#')) {
                const el = document.getElementById(href.slice(1))
                if (el) {
                    el.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth' })
                    window.history.pushState(null, '', `${window.location.pathname}${href}`)
                }
            } else window.location.assign(href)
        }
        const onLeave = () => {
            pointer.active = false
            pointer.inside = false
        }
        const onVisibility = () => (document.hidden ? stop() : start())

        let cancelled = false
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            if (visible) start()
            else stop()
        })
        io.observe(canvas)
        window.addEventListener('pointermove', onPointerMove, { passive: true })
        canvas.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointercancel', onPointerUp)
        document.addEventListener('pointerleave', onLeave)
        document.addEventListener('visibilitychange', onVisibility)
        resize()

        sampleMark(markSrc, width >= 1024 ? 1600 : 900)
            .catch(() => null)
            .then((mark) => {
                if (cancelled) return
                build(mark)
                if (reduce) draw(performance.now())
                else start()
            })

        return () => {
            cancelled = true
            stop()
            ro.disconnect()
            io.disconnect()
            window.removeEventListener('pointermove', onPointerMove)
            canvas.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('pointercancel', onPointerUp)
            document.removeEventListener('pointerleave', onLeave)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [targets, markSrc])

    return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ touchAction: 'pan-y' }} />
}
