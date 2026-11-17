// Runs inside a Playwright container (--network host). Drives the viewer shell, the owner's share page and the admin
// console in Chromium, and prints one JSON line of observations for browser.test.mjs to assert on.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || '/app/node_modules/playwright-core')

const { MAIN, APP, SLUG, EMAIL, PASSWORD } = process.env
const out = {}

async function main() {
  const browser = await chromium.launch()
  try {
    // 1. A visitor's shell: the owner signs in from the artifact, then the artifact probes what it can reach.
    const viewer = await browser.newContext()
    const page = await viewer.newPage()
    await page.goto(`${APP}/${SLUG}`)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).last().click()
    await page.getByRole('link', { name: 'Compartir' }).waitFor() // the shell reloads once the owner is signed in
    const frame = page.frameLocator('#f')
    await frame.locator('body[data-done]').waitFor({ timeout: 20000 })
    out.probes = JSON.parse(await frame.locator('body').getAttribute('data-done'))
    out.contentUrl = await page.locator('#f').getAttribute('src')

    // The Share button opens the console's share dialog on the artifacts origin.
    await page.getByRole('link', { name: 'Compartir' }).click()
    await page.getByRole('heading', { name: 'Share' }).waitFor()
    out.sharePageTitle = await page.locator('#share-title + p').textContent()
    await page.getByRole('button', { name: 'Close' }).click()
    await page.waitForURL(`${APP}/${SLUG}`)
    out.backOnArtifact = true

    // 2. The admin console on the main origin.
    const admin = await (await browser.newContext({ acceptDownloads: true })).newPage()
    await admin.goto(`${MAIN}/admin/login`)
    await admin.locator('input[type=email]').fill(EMAIL)
    await admin.locator('input[autocomplete=current-password]').fill(PASSWORD)
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click()
    await admin.waitForURL(`${MAIN}/admin`)
    await admin.goto(`${MAIN}/admin/artifacts`)
    const row = admin.getByRole('row', { name: new RegExp(SLUG) })
    await row.waitFor()
    out.listedAccess = (await row.locator('td').nth(1).textContent()).trim()

    // A response submitted in the artifact shows up, and exports.
    await row.getByRole('button', { name: 'Browser demo', exact: true }).click()
    await admin.getByRole('heading', { name: 'Responses' }).waitFor()
    out.responseRows = (await admin.locator('summary').allTextContents()).map((t) => t.trim()).sort()
    const [csv] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: 'CSV' }).click()])
    out.csv = require('node:fs').readFileSync(await csv.path(), 'utf8')
    const [json] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: 'JSON' }).click()])
    out.json = JSON.parse(require('node:fs').readFileSync(await json.path(), 'utf8'))

    // Share dialog: change general access, share with a role, change it, remove it.
    await row.getByRole('button', { name: /^Share / }).click()
    const dialog = admin.getByRole('dialog', { name: 'Share' })
    await dialog.getByLabel('Who can open it').selectOption('restricted')
    await admin.getByText('General access updated').first().waitFor()
    const staleContext = await browser.newContext()
    const stale = await staleContext.newPage()
    const staleResponse = await stale.goto(out.contentUrl)
    out.revokedStatus = staleResponse.status()
    await staleContext.close()
    await dialog.getByLabel('Email').fill('carl@example.test')
    await dialog.getByLabel('Role', { exact: true }).selectOption('editor')
    await dialog.getByLabel('Send invitation').uncheck()
    await dialog.getByRole('button', { name: 'Share', exact: true }).click()
    await dialog.getByText('Password for carl@example.test (shown once)').waitFor()
    out.sharedWithEditor = await dialog.getByLabel('Role for carl@example.test').inputValue()
    await dialog.getByLabel('Role for carl@example.test').selectOption('viewer')
    await admin.getByText('Role changed').first().waitFor()
    await dialog.getByRole('button', { name: 'Remove carl@example.test' }).click()
    await admin.getByRole('dialog', { name: /Remove carl/ }).getByRole('button', { name: 'Remove' }).click()
    await dialog.getByText('Not shared with anyone yet.').waitFor()
    out.removed = true
    await dialog.getByRole('button', { name: 'Close' }).click()

    // Token management is intentionally tested through the admin UI, then at the public bearer seam.
    const tokenPanel = admin.locator('section').filter({ has: admin.getByRole('heading', { name: 'API tokens' }) })
    await tokenPanel.scrollIntoViewIfNeeded()
    const tokenName = 'browser-token'
    await tokenPanel.locator('input[placeholder="laptop-cli"]').fill(tokenName)
    await tokenPanel.getByRole('button', { name: 'Create', exact: true }).click()
    const tokenStatus = tokenPanel.getByRole('status')
    await tokenStatus.waitFor()
    out.createdToken = (await tokenStatus.locator('code').textContent()).trim()
    const tokenProbe = await admin.context().newPage()
    await tokenProbe.setExtraHTTPHeaders({ authorization: `Bearer ${out.createdToken}` })
    out.tokenAcceptedStatus = (await tokenProbe.goto(`${APP}/api/v1/artifacts`)).status()
    const tokenRow = tokenPanel.locator('li').filter({ hasText: tokenName })
    await tokenRow.getByRole('button', { name: 'Revoke' }).click()
    await admin.getByRole('dialog', { name: new RegExp(`Revoke ${tokenName}`) }).getByRole('button', { name: 'Revoke' }).click()
    await tokenRow.getByText('Revoked').waitFor()
    out.tokenRevokedStatus = (await tokenProbe.goto(`${APP}/api/v1/artifacts`)).status()
    await tokenProbe.close()
  } finally {
    await browser.close()
  }
}

main().then(() => console.log(JSON.stringify(out)), (e) => { console.log(JSON.stringify({ ...out, error: String(e && e.stack || e) })); process.exit(1) })
