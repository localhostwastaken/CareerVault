// One-time setup for the take's browser profile. Opens Supabase and PolygonScan so a team
// member can sign in (and clear any PolygonScan check) by hand. Close the window when done.
import { openBrowser } from './browser.js'
import { AMOY } from './config.js'

const context = await openBrowser({ recordVideo: false })
const pages = [
  'https://supabase.com/dashboard/sign-in',
  `${AMOY.explorer}/address/${AMOY.contract}#readContract`,
]
for (const [index, url] of pages.entries()) {
  const page = index === 0 ? (context.pages()[0] ?? (await context.newPage())) : await context.newPage()
  await page.goto(url).catch(() => {})
}
console.log('Sign into Supabase in this window (and clear any PolygonScan check), then close it.')
await new Promise<void>((resolve) => context.on('close', () => resolve()))
