import { expect, test } from '@playwright/test'

test('plans and executes a MissionOps workflow', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'MissionOps Agent' }),
  ).toBeVisible()
  await expect(page.getByAltText(/Finance operations command/)).toBeVisible()

  await page.getByRole('button', { name: /Plan mission/i }).click()
  const output = page.getByLabel('Mission output')
  await expect(page.getByRole('heading', { name: 'Executive Brief' })).toBeVisible()
  await expect(page.getByText(/GitLab Issue Queue/)).toBeVisible()
  await expect(output.getByText(/audit-ready/i).first()).toBeVisible()

  await page.getByRole('button', { name: /Approve & sync/i }).click()
  await expect(page.getByText('Simulated MCP')).toBeVisible()
  await expect(page.getByText(/actions recorded/i)).toBeVisible()
})
