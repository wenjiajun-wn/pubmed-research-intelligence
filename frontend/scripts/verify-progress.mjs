import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const fixture = await (await fetch(process.env.PROGRESS_FIXTURE_URL)).json()
if (!fixture.result) throw new Error('A result fixture is required')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const keys = ['searching', 'collecting', 'analyzing', 'extracting', 'ranking', 'summarizing']
let phase = 'queued', cached = false
const percentages = { queued: 0, collecting: 30, analyzing: 58, summarizing: 88, complete: 100 }
try {
  await mkdir('../deploy/private/progress', { recursive: true })
  await page.addInitScript(() => localStorage.setItem('pubmed-language', 'zh'))
  await page.route('**/api/analyses/progress-*', route => {
    const job = structuredClone(fixture)
    job.stage = phase
    job.progress = percentages[phase]
    job.status = phase === 'complete' ? 'completed' : 'running'
    job.data_mode = cached ? 'cached' : 'live'
    const current = phase === 'complete' ? keys.length : keys.indexOf(phase)
    job.steps = Object.fromEntries(keys.map((key, i) => [key,
      cached && i < 2 ? 'skipped' : i < current ? 'completed' : i === current ? 'active' : 'pending']))
    if (phase === 'summarizing' || phase === 'complete') {
      job.result.summary_mode = phase === 'complete' ? 'llm' : 'pending'
      job.result.data_mode = job.data_mode
    } else job.result = null
    return route.fulfill({ json: job })
  })
  await page.goto(`${process.env.PROGRESS_SITE_URL || 'http://127.0.0.1:5173'}/analysis/progress-live`)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('status')).toContainText('队列')
  phase = 'collecting'
  await expect(page.locator('[data-step="collecting"]')).toHaveAttribute('data-state', 'active')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  phase = 'analyzing'
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '58')
  phase = 'summarizing'
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '88')
  await expect(page.locator('.dashboard')).toBeVisible()
  await expect(page.locator('[data-step="summarizing"]')).toHaveAttribute('aria-current', 'step')
  await page.screenshot({ path: '../deploy/private/progress/desktop-generating.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../deploy/private/progress/mobile-generating.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  phase = 'complete'
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(page.locator('[data-state="completed"]')).toHaveCount(6)
  cached = true
  await page.goto(`${process.env.PROGRESS_SITE_URL || 'http://127.0.0.1:5173'}/analysis/progress-cached`)
  await expect(page.locator('[data-state="skipped"]')).toHaveCount(2)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await page.screenshot({ path: '../deploy/private/progress/desktop-cached-complete.png' })
  expect(errors).toEqual([])
  const report = { checks: ['queue is explicit', 'live collection updates', 'annual-count progress updates', '88% remains with partial dashboard', '100% completion remains visible', 'cache steps shown as skipped', 'mobile no overflow'], browserErrors: errors }
  await writeFile('../deploy/private/progress/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await browser.close() }
