import { chromium, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// Reuse authentic metadata without invoking PubMed or a paid model.
const response = await fetch('http://127.0.0.1:8000/api/analyses', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "Alzheimer's disease", mode: 'demo', sample_size: 500 }),
})
if (!response.ok) throw new Error('The demo analysis must be available')
const { id } = await response.json()
let fixture
for (let attempt = 0; attempt < 50; attempt++) {
  const job = await (await fetch(`http://127.0.0.1:8000/api/analyses/${id}`)).json()
  if (job.status === 'completed') { fixture = job.result; break }
  if (job.status === 'failed') throw new Error(job.error)
  await new Promise(resolve => setTimeout(resolve, 100))
}
if (!fixture) throw new Error('Demo analysis timed out')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errors = []
const submitted = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.route('**/api/analyses', async route => {
    const input = route.request().postDataJSON()
    submitted.push(input.sample_size)
    await route.fulfill({ json: { id: `sample-${submitted.length}` }, status: 202 })
  })
  await page.route('**/api/analyses/sample-*', async route => {
    const index = Number(route.request().url().split('-').at(-1)) - 1
    await route.fulfill({ json: {
      id: `sample-${index + 1}`, status: 'completed', stage: 'complete', progress: 100,
      // Fewer retrieved records must not change the requested sample limit.
      result: { ...fixture, id: `sample-${index + 1}`, sample_size: 217, requested_sample_size: submitted[index] },
    } })
  })
  await page.goto('http://127.0.0.1:5173/')
  await page.getByLabel('Research topic', { exact: true }).fill("Alzheimer's disease")
  await page.getByLabel('Sample size', { exact: true }).selectOption('1000')
  await page.getByRole('button', { name: 'Analyze', exact: true }).click()
  await expect(page.locator('.dashboard select').first()).toHaveValue('1000')
  await page.getByRole('button', { name: '切换为中文' }).click()
  await expect(page.locator('.dashboard select').first()).toHaveValue('1000')
  await page.reload()
  await expect(page.locator('.dashboard select').first()).toHaveValue('1000')
  await page.getByRole('button', { name: '开始分析', exact: true }).click()
  await expect(page).toHaveURL(/sample-2$/)
  await expect(page.locator('.dashboard select').first()).toHaveValue('1000')
  await page.locator('.dashboard select').first().selectOption('300')
  await page.getByRole('button', { name: '开始分析', exact: true }).click()
  await expect(page).toHaveURL(/sample-3$/)
  await expect(page.locator('.dashboard select').first()).toHaveValue('300')
  expect(submitted).toEqual([1000, 1000, 300])
  expect(errors).toEqual([])
  const report = { submitted, errors, checks: ['requested size retained despite fewer records', 'language switch', 'reload', 'repeat analysis', 'same-query size change'] }
  await writeFile('../.impeccable/review/sample-size-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await browser.close()
}
