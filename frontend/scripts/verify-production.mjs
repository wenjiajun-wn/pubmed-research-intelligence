import { chromium, expect } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

// Local private credentials are never embedded in the bundle or report.
const credentials = JSON.parse(await readFile('../deploy/private/access.json', 'utf8'))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ httpCredentials: { username: credentials.username, password: credentials.password } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(credentials.url)
  await page.getByRole('button', { name: '切换为中文' }).click()
  await page.getByRole('textbox', { name: '研究主题' }).fill("Alzheimer's disease")
  await page.getByRole('button', { name: '开始分析', exact: true }).click()
  await page.waitForURL('**/analysis/*')
  const id = page.url().split('/').at(-1)
  await page.locator('.analysis-complete').filter({ hasText: '分析完成' }).waitFor({ timeout: 180000 })
  const response = await context.request.get(`${credentials.url}/api/analyses/${id}`)
  const job = await response.json()
  expect(job.status).toBe('completed')
  expect(job.result.sample_size).toBeGreaterThan(0)
  expect(job.result.research_brief).toHaveLength(6)
  await expect(page.getByRole('heading', { name: '历年发文趋势' })).toBeVisible()
  await page.getByRole('link', { name: '查看数据来源', exact: true }).click()
  await expect(page.getByRole('heading', { name: '数据采集记录' })).toBeVisible()
  expect(errors).toEqual([])
  const report = { url: credentials.url, jobId: id, status: job.status, dataMode: job.result.data_mode, summaryMode: job.result.summary_mode, sampleSize: job.result.sample_size, fiveYearCount: job.result.overview.last_five_years, briefSections: job.result.research_brief.length, browserErrors: errors }
  await writeFile('../deploy/private/production-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  expect(job.result.summary_mode).toBe('llm')
} finally {
  await browser.close()
}
