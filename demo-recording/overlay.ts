import type { BrowserContext } from 'playwright'

// A small fixed label naming who is acting, so the room never loses track when the take
// signs in as someone else. Injected by the recorder only; it is not part of the product.
// The text lives in sessionStorage so it survives navigations within a tab.
const SCRIPT = `
(() => {
  const paint = () => {
    const text = sessionStorage.getItem('__demo_actor')
    let el = document.getElementById('__demo_actor')
    if (!text) { el?.remove(); return }
    if (!el) {
      el = document.createElement('div')
      el.id = '__demo_actor'
      el.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483647;padding:8px 14px;border-radius:4px;background:#1B3A5C;color:#FDFBF7;font:600 14px/1.2 "IBM Plex Sans",system-ui,sans-serif;letter-spacing:.01em;pointer-events:none'
      document.documentElement.appendChild(el)
    }
    el.textContent = text
  }
  window.__demoPaintActor = paint
  document.addEventListener('DOMContentLoaded', paint)
  setInterval(paint, 500)
})()
`

export async function installOverlay(context: BrowserContext): Promise<void> {
  await context.addInitScript(SCRIPT)
}

export async function setActor(context: BrowserContext, label: string | null): Promise<void> {
  for (const page of context.pages()) {
    await page
      .evaluate((text) => {
        if (text) sessionStorage.setItem('__demo_actor', text)
        else sessionStorage.removeItem('__demo_actor')
        ;(window as unknown as { __demoPaintActor?: () => void }).__demoPaintActor?.()
      }, label)
      .catch(() => {})
  }
}
