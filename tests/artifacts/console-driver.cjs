// Runs inside a Playwright container (--network host) for console.browser.test.mjs. SCENARIO picks what to drive;
// prints one JSON line of observations.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || '/app/node_modules/playwright-core')

const { SCENARIO, MAIN, APP, EMAIL, PASSWORD } = process.env
const out = {}

async function adminPage(browser) {
  const admin = await (await browser.newContext()).newPage()
  await admin.goto(`${MAIN}/admin/login`)
  await admin.locator('input[type=email]').fill(EMAIL)
  await admin.locator('input[autocomplete=current-password]').fill(PASSWORD)
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click()
  await admin.waitForURL(`${MAIN}/admin`)
  await admin.goto(`${MAIN}/admin/artifacts`)
  return admin
}
const toast = (page, text) => page.getByText(text, { exact: true }).first().waitFor()
const panel = (page, title) => page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) })
const confirmDialog = (page, title) => page.getByRole('dialog', { name: title })
// What has keyboard focus, as "role:name", looking through same-origin iframes.
const focused = (page) => page.evaluate(() => {
  let d = document
  while (d.activeElement && d.activeElement.tagName === 'IFRAME') {
    try { d = d.activeElement.contentDocument } catch { return 'iframe:cross-origin' }
    if (!d) return 'iframe:cross-origin'
  }
  const el = d.activeElement
  if (!el || el === d.body) return 'body'
  const label = el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent
  return `${el.tagName.toLowerCase()}:${(label || '').trim()}`
})

const scenarios = {
  // Rename, re-slug, versions and rollback, response settings, people, tokens, delete with confirmation.
  async console(browser) {
    const admin = await adminPage(browser)
    const row = admin.getByRole('row', { name: /console-demo/ })
    await row.getByRole('button', { name: 'Console demo', exact: true }).click()

    await admin.getByLabel('Title', { exact: true }).fill('Console renamed')
    await admin.getByLabel('Slug', { exact: true }).fill('console-renamed')
    await admin.getByRole('button', { name: 'Save', exact: true }).click()
    await toast(admin, 'Saved')
    await admin.getByRole('row', { name: /console-renamed/ }).waitFor()

    await admin.getByRole('heading', { name: 'Versions' }).waitFor()
    await admin.getByRole('listitem').filter({ hasText: /^v1/ }).getByRole('button', { name: 'Roll back' }).click()
    await toast(admin, 'Rolled back to v1')
    await admin.getByRole('listitem').filter({ hasText: /^v3/ }).getByText('Current').waitFor()
    out.rolledBack = true

    await admin.getByLabel('Who can respond').selectOption('declared')
    await toast(admin, 'Response settings saved')
    await admin.getByLabel('After submitting, they see').selectOption('score')
    await admin.getByRole('switch', { name: /Accepting responses/ }).click()
    await admin.getByRole('switch', { name: /Email me each new response/ }).click()
    await admin.waitForTimeout(1500)

    // People: rename with the console's own controls (no window.prompt), reset, delete.
    let prompted = false
    admin.on('dialog', (d) => { prompted = true; d.dismiss() })
    const people = panel(admin, 'People')
    await people.getByRole('button', { name: 'Rename pat@example.test' }).click()
    await people.getByLabel('Name to show for pat@example.test').fill('Pat')
    await people.getByRole('button', { name: 'Save name' }).click()
    await toast(admin, 'Name saved')
    await people.getByText('Pat · pat@example.test').waitFor()
    out.prompted = prompted
    await people.getByRole('button', { name: 'Reset password for pat@example.test' }).click()
    await confirmDialog(admin, /Reset pat@example.test/).getByRole('button', { name: 'Reset' }).click()
    await toast(admin, 'Reset email sent')
    await people.getByRole('button', { name: 'Delete quinn@example.test' }).click()
    await confirmDialog(admin, /Delete quinn@example.test/).getByRole('button', { name: 'Delete' }).click()
    await toast(admin, 'Account deleted')
    await people.getByText('quinn@example.test').waitFor({ state: 'detached' })

    // Tokens: a limited token, shown once, works only within its limits, then is revoked.
    const tokens = panel(admin, 'API tokens')
    await tokens.getByLabel('Name').fill('crm')
    await tokens.getByLabel('Limited').check()
    await tokens.getByRole('button', { name: 'Create' }).click()
    const token = (await tokens.getByRole('status').locator('code').textContent()).trim()
    // From outside the console, like an agent would (the console page itself cannot call the app origin).
    const call = async (method, p, body) => (await admin.context().request.fetch(`${APP}/api/v1/${p}`, {
      method, headers: { authorization: `Bearer ${token}` }, data: body,
    })).status()
    out.tokenCreate = await call('POST', 'artifacts', { title: 'From CRM', slug: 'from-crm', html: '<p>crm</p>' })
    out.tokenShare = await call('PUT', 'artifacts/from-crm/shares', { email: 'x@example.test', role: 'viewer', notify: false })
    out.tokenOther = await call('GET', 'artifacts/keep-me')
    await tokens.getByRole('listitem').filter({ hasText: 'crm' }).getByText('limited').waitFor()
    await tokens.getByRole('listitem').filter({ hasText: 'crm' }).getByRole('button', { name: 'Revoke' }).click()
    await confirmDialog(admin, /Revoke crm/).getByRole('button', { name: 'Revoke' }).click()
    await tokens.getByRole('listitem').filter({ hasText: 'crm' }).getByText('Revoked').waitFor()
    out.tokenAfterRevoke = await call('GET', 'artifacts')

    // Delete asks first; cancelling keeps the artifact.
    await admin.getByRole('row', { name: /doomed/ }).getByRole('button', { name: 'Doomed', exact: true }).click()
    await admin.getByRole('button', { name: 'Delete', exact: true }).click()
    await confirmDialog(admin, /Delete Doomed/).getByRole('button', { name: 'Cancel' }).click()
    out.keptAfterCancel = await admin.getByRole('row', { name: /doomed/ }).isVisible()
    await admin.getByRole('button', { name: 'Delete', exact: true }).click()
    await confirmDialog(admin, /Delete Doomed/).getByRole('button', { name: 'Delete' }).click()
    await toast(admin, 'Artifact deleted')
    await admin.getByRole('row', { name: /doomed/ }).waitFor({ state: 'detached' })
    out.deleted = true
  },

  // The share dialog from the keyboard alone: on the artifact (over it, without leaving) and in the console.
  async keyboard(browser) {
    const page = await (await browser.newContext()).newPage()
    await page.goto(`${APP}/keep-me`)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.keyboard.press('Enter')
    const shareButton = page.locator('#share')
    await shareButton.waitFor()
    await page.evaluate(() => { window.__stayed = true })
    await shareButton.focus()
    await page.keyboard.press('Enter')
    const frame = page.frameLocator('#share-frame')
    await frame.getByRole('dialog', { name: 'Share' }).waitFor()
    await frame.getByText('Keep me', { exact: true }).waitFor()
    out.shellFocusOnOpen = await focused(page)
    const order = []
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); order.push(await focused(page)) }
    out.shellTabOrder = order
    // Change general access from the keyboard.
    await frame.getByLabel('Who can open it').focus()
    await frame.getByLabel('Who can open it').selectOption('link')
    await frame.getByText('General access updated').first().waitFor()
    await page.keyboard.press('Escape')
    await page.locator('#share-frame').waitFor({ state: 'detached' })
    out.shellStayed = await page.evaluate(() => window.__stayed === true && location.pathname)
    out.shellFocusAfterClose = await focused(page)
    out.artifactInert = await page.locator('#f').evaluate((f) => f.inert)

    const admin = await adminPage(browser)
    const share = admin.getByRole('row', { name: /keep-me/ }).getByRole('button', { name: /^Share / })
    await share.focus()
    await admin.keyboard.press('Enter')
    const dialog = admin.getByRole('dialog', { name: 'Share' })
    await dialog.getByText('Keep me', { exact: true }).waitFor()
    out.consoleFocusOnOpen = await focused(admin)
    const consoleOrder = []
    for (let i = 0; i < 8; i++) { await admin.keyboard.press('Tab'); consoleOrder.push(await focused(admin)) }
    out.consoleTabOrder = consoleOrder
    await admin.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    out.consoleFocusAfterEscape = await focused(admin)
    await admin.keyboard.press('Enter')
    await dialog.getByText('Keep me', { exact: true }).waitFor()
    await dialog.getByRole('button', { name: 'Close' }).focus()
    await admin.keyboard.press('Enter')
    await dialog.waitFor({ state: 'detached' })
    out.consoleFocusAfterClose = await focused(admin)
  },

  // An invitation link: choose a password, land on the artifact; the link works once. Then ask for a reset.
  async invite(browser) {
    const page = await (await browser.newContext()).newPage()
    await page.goto(process.env.LINK)
    out.inviteHeading = await page.getByRole('heading').textContent()
    await page.getByLabel(/Contraseña/).fill('ivy-chosen-pass')
    await page.getByRole('button', { name: 'Guardar y entrar' }).click()
    await page.waitForURL(`${APP}/keep-me`, { timeout: 10000 }).catch(async () => { throw new Error(`${page.url()} ${await page.locator('body').innerText()}`) })
    await page.locator('#f').waitFor()
    out.inviteLanded = new URL(page.url()).pathname
    await page.goto(process.env.LINK)
    out.inviteReused = await page.getByRole('heading').textContent()

    const fresh = await (await browser.newContext()).newPage()
    await fresh.goto(`${APP}/keep-me`)
    await fresh.getByRole('button', { name: 'Ingresar' }).click() // open to anyone with the link by now
    await fresh.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
    await fresh.waitForURL(`${APP}/forgot`)
    await fresh.getByLabel('Email').fill('ivy@example.test')
    await fresh.getByRole('button', { name: 'Mandarme el enlace' }).click()
    out.forgotHeading = await fresh.getByRole('heading').textContent()
  },

  async reset(browser) {
    const page = await (await browser.newContext()).newPage()
    await page.goto(process.env.LINK)
    out.resetHeading = await page.getByRole('heading').textContent()
    await page.getByLabel(/Contraseña/).fill('short')
    await page.getByRole('button', { name: 'Guardar y entrar' }).click()
    // minlength blocks it in the browser; nothing was sent.
    out.shortBlocked = await page.getByLabel(/Contraseña/).evaluate((i) => !i.checkValidity())
    await page.getByLabel(/Contraseña/).fill('ivy-new-pass-2')
    await page.getByRole('button', { name: 'Guardar y entrar' }).click()
    await page.waitForURL(`${APP}/`)
    out.resetLanded = true
  },
}

async function main() {
  const browser = await chromium.launch()
  try { await scenarios[SCENARIO](browser) } finally { await browser.close() }
}

main().then(() => console.log(JSON.stringify(out)), (e) => { console.log(JSON.stringify({ ...out, error: String(e && e.stack || e) })); process.exit(1) })
