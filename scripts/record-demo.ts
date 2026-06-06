import { chromium } from '@playwright/test'
import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'

const hostedUrl =
  process.env.DEMO_BASE_URL ?? 'https://missionops-agent.netlify.app'
const videoDir = join(process.cwd(), 'tmp', 'demo-video')
const finalVideo = join(process.cwd(), 'public', 'missionops-demo.webm')

await mkdir(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: videoDir,
    size: { width: 1440, height: 900 },
  },
})

const page = await context.newPage()
await page.goto(hostedUrl, { waitUntil: 'domcontentloaded' })
await installCaptionOverlay()

await caption(
  'MissionOps Agent turns messy finance operations goals into controlled GitLab execution.',
  9000,
)

await caption(
  'The operator sets the mission, urgency, evidence sources, and approval controls before the agent acts.',
  9000,
)

await page.getByRole('button', { name: /Plan mission/i }).click()
await page.getByRole('heading', { name: 'Executive Brief' }).waitFor()
await caption(
  'Gemini-ready planning converts the goal into an executive brief, risk index, timeline, report pack, and GitLab work queue.',
  11000,
)

await scrollToText('GitLab Issue Queue')
await caption(
  'Each GitLab issue draft has an owner, labels, due date, and audit evidence expectation.',
  10000,
)

await scrollToText('Control Matrix')
await caption(
  'Finance-safe controls keep human approval, redaction, and escalation rules visible before execution.',
  10000,
)

await scrollToText('GitLab MCP Execution')
await caption(
  'The agent waits for explicit approval before syncing through the GitLab MCP action layer.',
  9000,
)

await page.getByRole('button', { name: /Approve & sync/i }).click()
await page.getByText('Simulated MCP').waitFor({ timeout: 30_000 })
await scrollToText('Prepared color-coded MissionOps labels')
await caption(
  'The sync trail now prepares color-coded GitLab labels such as missionops #0f766e, evidence #2563eb, and approval #f59e0b.',
  11000,
)

await scrollToText('Prepared milestone')
await caption(
  'It also maps the execution timeline into dated GitLab milestones, including Day 1 and Day 2, before drafting the issues.',
  11000,
)

await caption(
  'With live GitLab MCP credentials, these same approved actions create real labels, milestones, and issues in the sponsor repository.',
  13000,
)

await caption(
  'This goes beyond chat: the agent plans, preserves oversight, and turns work into an accountable GitLab system of record.',
  12000,
)

await caption(
  'Submission URLs: hosted app, public source, MIT license, Agent Builder manifest, demo script, and rubric map are all included in the repository.',
  12000,
)

await context.close()
await browser.close()

const videos = (await readdir(videoDir)).filter((file) => file.endsWith('.webm'))
if (videos.length === 0) {
  throw new Error('No demo video was recorded')
}

await copyFile(join(videoDir, videos[0]), finalVideo)
console.log(`Demo video saved to ${finalVideo}`)

async function installCaptionOverlay() {
  await page.evaluate(() => {
    const caption = document.createElement('div')
    caption.id = 'demo-caption'
    caption.style.position = 'fixed'
    caption.style.left = '50%'
    caption.style.bottom = '28px'
    caption.style.transform = 'translateX(-50%)'
    caption.style.width = 'min(1040px, calc(100vw - 48px))'
    caption.style.padding = '18px 22px'
    caption.style.borderRadius = '8px'
    caption.style.background = 'rgba(15, 23, 42, 0.9)'
    caption.style.color = '#ffffff'
    caption.style.font =
      '700 24px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    caption.style.boxShadow = '0 18px 50px rgba(15, 23, 42, 0.28)'
    caption.style.zIndex = '9999'
    caption.style.textAlign = 'center'
    caption.style.letterSpacing = '0'
    document.body.append(caption)
  })
}

async function caption(text: string, durationMs: number) {
  await page.evaluate((captionText) => {
    const caption = document.querySelector<HTMLDivElement>('#demo-caption')
    if (caption) caption.textContent = captionText
  }, text)
  await page.waitForTimeout(durationMs)
}

async function scrollToText(text: string) {
  await page.getByText(text).first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
}
