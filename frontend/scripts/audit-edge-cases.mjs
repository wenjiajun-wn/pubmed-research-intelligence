import { chromium, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const report = { browserErrors: [] }
page.on('pageerror', error => report.browserErrors.push(error.message))
try {
  let reads = 0, posts = 0, submitted
  await page.route('**/api/analyses/audit-failed', route => {
    reads++
    return route.fulfill({ json: { id: 'audit-failed', status: 'failed', stage: 'failed', progress: 0, result: null, request: { query: 'CRISPR', mode: 'live', sample_size: 1000 }, error: 'Live retrieval failed and this query has no cache. Retry or open the Alzheimer’s sample demo.' } })
  })
  await page.route('**/api/analyses', route => {
    posts++
    submitted = route.request().postDataJSON()
    return route.fulfill({ json: { id: 'audit-restarted' }, status: 202 })
  })
  await page.route('**/api/analyses/audit-restarted', route => route.fulfill({ json: { id: 'audit-restarted', status: 'running', stage: 'collecting', progress: 20, result: null } }))
  await page.goto('http://127.0.0.1:5173/analysis/audit-failed')
  await page.getByRole('button', { name: 'Retry analysis', exact: true }).waitFor()
  const before = reads
  await page.reload()
  await page.getByRole('button', { name: 'Retry analysis', exact: true }).click()
  await expect(page).toHaveURL(/audit-restarted$/)
  expect(posts).toBe(1)
  expect(submitted).toEqual({ query: 'CRISPR', mode: 'live', sample_size: 1000 })
  await expect(page.getByRole('progressbar')).toBeVisible()
  report.failedRetry = { beforeReads: before, afterReads: reads, newAnalysisPosts: posts, alertStillVisible: await page.getByRole('alert').isVisible() }
  let sourceReads = 0, modelCompleted = false
  await page.route('**/api/analyses/audit-pending/sources', route => {
    sourceReads++
    return route.fulfill({ json: {
      provider: 'National Library of Medicine', database: 'PubMed', api: 'NCBI E-utilities API',
      query: 'Audit', query_translation: 'Audit', retrieved: 1000, retrieved_at: '2026-10-13T10:00:00+00:00',
      total_count: 10000, data_mode: 'cached', summary_mode: modelCompleted ? 'llm' : 'pending', methods: [],
    } })
  })
  await page.goto('http://127.0.0.1:5173/sources/audit-pending')
  await expect(page.locator('.source-record')).toContainText('Generating AI research brief')
  modelCompleted = true
  await expect(page.locator('.source-record')).toContainText('LLM synthesis from supplied evidence')
  const finalReads = sourceReads
  await page.waitForTimeout(1500)
  expect(sourceReads).toBe(finalReads)
  report.pendingSource = { sourceReads, correctedAutomatically: true, pollingStopped: true }
  expect(report.browserErrors).toEqual([])
  console.log(JSON.stringify(report, null, 2))
  await writeFile('../.impeccable/review/audit-edge-report.json', JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
