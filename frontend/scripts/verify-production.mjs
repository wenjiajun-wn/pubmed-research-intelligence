import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const siteUrl = process.env.PUBMED_SITE_URL || 'https://pubmed.ai-calendar.xyz'
const demo = process.env.PUBMED_TEST_MODE === 'demo'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  const home = await page.goto(siteUrl)
  expect(home.status()).toBe(200)
  expect(home.headers()['www-authenticate']).toBeUndefined()
  await page.getByRole('button', { name: '切换为中文' }).click()
  await page.getByRole('textbox', { name: '研究主题' }).fill("Alzheimer's disease")
  await page.getByRole('button', { name: demo ? '打开示例演示' : '开始分析', exact: true }).click()
  await page.waitForURL('**/analysis/*')
  const id = page.url().split('/').at(-1)
  await page.locator('.analysis-complete').filter({ hasText: '分析完成' }).waitFor({ timeout: 180000 })
  const response = await context.request.get(`${siteUrl}/api/analyses/${id}`)
  const job = await response.json()
  expect(job.status).toBe('completed')
  expect(job.result.sample_size).toBeGreaterThan(0)
  expect(job.result.research_brief).toHaveLength(6)
  await expect(page.getByRole('heading', { name: '历年发文趋势' })).toBeVisible()
  await page.getByRole('link', { name: '查看数据来源', exact: true }).click()
  await expect(page.getByRole('heading', { name: '数据采集记录' })).toBeVisible()
  expect(errors).toEqual([])
  const report = { url: siteUrl, jobId: id, status: job.status, dataMode: job.result.data_mode, summaryMode: job.result.summary_mode, sampleSize: job.result.sample_size, fiveYearCount: job.result.overview.last_five_years, briefSections: job.result.research_brief.length, browserErrors: errors }
  await mkdir('../deploy/private', { recursive: true })
  await writeFile('../deploy/private/production-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  expect(job.result.summary_mode).toBe(demo ? 'fallback' : 'llm')
} finally {
  await browser.close()
}
