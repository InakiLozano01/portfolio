// Runs inside a Playwright container (--network host). Opens artifacts with uploaded videos in Chromium, plays and
// seeks the ready one, reads the notes of the failed and the pending ones, and prints one JSON line of observations.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || '/app/node_modules/playwright-core')

const { APP, READY_SLUG, PENDING_SLUG } = process.env
const until = (fr, fn, arg) => fr.waitForFunction(fn, arg, { timeout: 30000 })

async function contentFrame(page) {
  await page.frameLocator('#f').locator('body').waitFor()
  return page.frames().find((f) => f.url().includes('/c/'))
}

async function playReady(browser, hideNativeHls) {
  const ctx = await browser.newContext()
  // Chromium now plays HLS natively; hiding that sends the injected client down its hls.js path, as in Firefox.
  if (hideNativeHls) await ctx.addInitScript(() => {
    const can = HTMLMediaElement.prototype.canPlayType
    HTMLMediaElement.prototype.canPlayType = function (t) { return /mpegurl/i.test(t) ? '' : can.call(this, t) }
  })
  const page = await ctx.newPage()
  await page.goto(`${APP}/${READY_SLUG}`)
  const fr = await contentFrame(page)
  await until(fr, () => document.querySelector('#ready').poster && document.querySelector('#broken + .artifact-video-note'))
  const seen = await fr.evaluate(async () => {
    const v = document.querySelector('#ready')
    const poster = await new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = v.poster })
    await new Promise((res) => (v.readyState >= 1 ? res() : v.addEventListener('loadedmetadata', res, { once: true })))
    return { poster, posterUrl: v.poster, src: v.src, hlsJs: typeof window.Hls === 'function', duration: v.duration,
      height: v.videoHeight, brokenNote: document.querySelector('#broken + .artifact-video-note').textContent }
  })
  seen.played = await fr.evaluate(async () => {
    const v = document.querySelector('#ready')
    v.muted = true
    await v.play()
    await new Promise((res) => { const t = () => (v.currentTime > 0.5 ? res() : requestAnimationFrame(t)); t() })
    v.pause()
    return v.currentTime
  })
  seen.seekedTo = await fr.evaluate(async () => {
    const v = document.querySelector('#ready')
    v.currentTime = 3
    await new Promise((res) => v.addEventListener('seeked', res, { once: true }))
    return v.currentTime
  })
  await ctx.close()
  return seen
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  const out = {}
  try {
    out.native = await playReady(browser, false)
    out.hlsJs = await playReady(browser, true)
    const page = await (await browser.newContext()).newPage()
    await page.goto(`${APP}/${PENDING_SLUG}`)
    const fr = await contentFrame(page)
    await until(fr, () => document.querySelector('#pending + .artifact-video-note'))
    out.pendingNote = await fr.evaluate(() => document.querySelector('#pending + .artifact-video-note').textContent)
    out.contentUrl = fr.url()
  } finally {
    await browser.close()
  }
  return out
}

main().then((out) => console.log(JSON.stringify(out)), (e) => { console.log(JSON.stringify({ error: String(e && e.stack || e) })); process.exit(1) })
