import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const fixtureUrl = process.env.RECOVERY_FIXTURE_URL
if (!fixtureUrl) throw new Error('Set RECOVERY_FIXTURE_URL to a completed analysis API URL')
const job = await (await fetch(fixtureUrl)).json()
if (job.status !== 'completed' || !job.result) throw new Error('A completed fixture is required')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
let requested = 300, polls = 0, broken = false, limited = false
try {
  await page.route('**/api/analyses', route => {
    if (limited) return route.fulfill({ status: 429, body: '<html>Too many requests</html>', contentType: 'text/html' })
    requested = route.request().postDataJSON().sample_size
    polls = 0
    return route.fulfill({ status: 202, json: { id: `recovery-${requested}` } })
  })
  await page.route('**/api/analyses/recovery-*', route => {
    polls++
    const next = structuredClone(job)
    next.id = `recovery-${requested}`
    next.result.id = next.id
    next.result.requested_sample_size = requested
    if (broken) next.result.overview = null
    else if (polls <= 2) { next.status = 'running'; next.stage = 'collecting'; next.progress = 20; next.result = null }
    return route.fulfill({ json: next })
  })
  await page.goto(process.env.RECOVERY_SITE_URL || 'http://127.0.0.1:5173')
  await page.getByRole('button', { name: '切换为中文' }).click()
  await page.getByLabel('研究主题', { exact: true }).fill("Alzheimer's disease")
  for (const size of [300, 1000]) {
    await page.getByLabel('分析样本量', { exact: true }).selectOption(String(size))
    await page.getByRole('button', { name: '开始分析', exact: true }).click()
    await expect(page.getByRole('heading', { name: '正在整理文献证据' })).toBeVisible()
    await expect(page.locator('.analysis-complete')).toContainText('分析完成')
    await expect(page.getByLabel('分析样本量', { exact: true })).toHaveValue(String(size))
  }
  expect(errors).toEqual([])
  broken = true
  await page.getByLabel('分析样本量', { exact: true }).selectOption('300')
  await page.getByRole('button', { name: '开始分析', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('页面暂时无法显示')
  await expect(page.getByRole('button', { name: '刷新页面' })).toBeVisible()
  await page.locator('.brand').click()
  await expect(page.getByLabel('研究主题', { exact: true })).toBeVisible()
  limited = true
  await page.getByLabel('研究主题', { exact: true }).fill('CRISPR')
  await page.getByRole('button', { name: '开始分析', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('分析请求过于频繁')
  await mkdir('../deploy/private', { recursive: true })
  const report = { checks: ['300 loading and result', '1000 loading and result', 'render failure recovery', 'navigate home after failure', '429 has visible message'], unexpectedErrorsBeforeFaultInjection: 0 }
  await writeFile('../deploy/private/recovery-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await browser.close() }
