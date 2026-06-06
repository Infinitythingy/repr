import { expect, test } from '@playwright/test'

test('plans and executes a MissionOps workflow', async ({ page }) => {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    test.setTimeout(90_000)
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(
    page.getByRole('heading', { name: 'MissionOps Agent' }),
  ).toBeVisible({ timeout: 20_000 })
  await expect(page.getByAltText(/Finance operations command/)).toBeVisible({
    timeout: 20_000,
  })

  await page.getByRole('button', { name: /Plan mission/i }).click()
  const output = page.getByLabel('Mission output')
  await expect(page.getByRole('heading', { name: 'Executive Brief' })).toBeVisible()
  await expect(page.getByText(/GitLab Issue Queue/)).toBeVisible()
  await expect(output.getByText(/audit-ready/i).first()).toBeVisible()

  await page.getByRole('button', { name: /Approve & sync/i }).click()
  await expect(page.getByText('Simulated MCP')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/actions recorded/i)).toBeVisible({
    timeout: 30_000,
  })
})
