import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import NeuralSwarm from '../../components/synapse/NeuralSwarm'

let now: number
let frame: FrameRequestCallback
let reduced: boolean
let ground: number[]
let labels: { text: string; x: number; y: number; font: string }[]
let context: Record<string, any>

beforeEach(() => {
    now = 0
    reduced = false
    ground = []
    labels = []
    context = {
        font: '', clearRect: jest.fn(), setTransform: jest.fn(), drawImage: jest.fn(),
        beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn(),
        arc: jest.fn(), fill: jest.fn(), fillRect: jest.fn(), strokeRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
        roundRect: (_x: number, _y: number, w: number) => ground.push(w),
        createLinearGradient: () => ({ addColorStop: jest.fn() }),
        getImageData: () => ({ data: new Uint8ClampedArray(140 * 140 * 4).fill(255) }),
        measureText: (text: string) => ({ width: text.length * 8 }),
        fillText: (text: string, x: number, y: number) => labels.push({ text, x, y, font: context.font }),
    }
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as any)
    jest.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1440, height: 900, left: 0, top: 0 } as DOMRect)
    jest.spyOn(performance, 'now').mockImplementation(() => now)
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1 })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    window.matchMedia = jest.fn().mockImplementation(query => ({ matches: query.includes('reduced-motion') ? reduced : true }))
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: () => Promise.resolve() })
    HTMLCanvasElement.prototype.setPointerCapture = jest.fn()
    HTMLCanvasElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(false)
    // jsdom has no native PointerEvent; retain coordinates and pointer identity.
    window.PointerEvent = class extends MouseEvent {
        pointerId = 1
        pointerType = 'touch'
    } as typeof PointerEvent
    Element.prototype.scrollIntoView = jest.fn()
    window.history.replaceState(null, '', '/en')
})
afterEach(() => jest.restoreAllMocks())

async function mount() {
    const targets = Array.from({ length: 24 }, (_, i) => ({ label: `Section ${i}`, href: '#destination', kind: 'section' as const }))
    let result: ReturnType<typeof render>
    await act(async () => { result = render(<><NeuralSwarm targets={targets} /><div id="destination" /></>) })
    return result!.container.querySelector('canvas')!
}
function tick(time: number) {
    now = time
    ground = []
    labels = []
    act(() => frame(time))
    return ground[0] || 0
}

test('automatic scene changes start at the source shape without a one-frame destination flash', async () => {
    await mount()
    tick(1400)
    tick(3550)
    expect(tick(3566)).toBe(0)
    expect(tick(3582)).toBeLessThan(10)
    tick(5300)
    tick(21300)
    expect(tick(21316)).toBeCloseTo(617.472, 1)
    expect(tick(21332)).toBeCloseTo(617.472, 1)
    tick(23000)
    tick(29200)
    expect(tick(29216)).toBeCloseTo(451.584, 1)
})

test('brain labels use readable type and clicking the label text follows its link', async () => {
    reduced = true
    const canvas = await mount()
    const label = labels.find(item => item.text.startsWith('Section'))!
    expect(label).toBeDefined()
    expect(Number(label.font.match(/(\d+)px/)?.[1])).toBeGreaterThanOrEqual(16)
    // Label end is well outside the old 22px neuron hit radius.
    const clientX = label.x + label.text.length * 8 - 4
    const clientY = label.y - 6
    fireEvent.pointerDown(canvas, { clientX, clientY, pointerId: 1, pointerType: 'touch' })
    fireEvent.pointerUp(window, { clientX, clientY, pointerId: 1, pointerType: 'touch' })
    expect(window.location.hash).toBe('#destination')
})
