/**
 * Headless layout audit via the Chrome DevTools Protocol.
 * Checks for horizontal overflow, verifies the two-column layout, and
 * reports the rendered geometry of key elements.
 *
 * Usage: node scripts/layout-audit.mjs [url] [width] [height]
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const url = process.argv[2] ?? 'http://localhost:5173/'
const width = Number(process.argv[3] ?? 1280)
const height = Number(process.argv[4] ?? 1400)
const port = 9222 + Math.floor(Math.random() * 500)

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let id = 0
const pending = new Map()

function send(method, params = {}, sessionId) {
  const msgId = ++id
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }))
  })
}

try {
  // Wait for the debugging endpoint to come up.
  let target = null
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {
      /* not up yet */
    }
    await sleep(200)
  }
  if (!target) throw new Error('Chrome debugging endpoint never came up')

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  })
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: process.env.SCHEME ?? 'light' }],
  })
  await send('Page.navigate', { url })
  await sleep(2500)

  const { result } = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const de = document.documentElement
      const overflow = de.scrollWidth - de.clientWidth
      const box = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      }
      const overflowing = [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
        .slice(0, 8)
        .map((el) => el.tagName + '.' + (el.className?.toString?.().split(' ')[0] ?? ''))
      const cs = getComputedStyle(document.body)
      const sticky = document.querySelector('.sticky-total')
      const stickyStyle = sticky ? getComputedStyle(sticky) : null
      return {
        title: document.title,
        overflow,
        overflowing,
        form: box('.card--form'),
        results: box('.results'),
        headline: document.querySelector('.headline-amount')?.textContent?.trim(),
        statCount: document.querySelectorAll('.stat').length,
        breakdownRows: document.querySelectorAll('.breakdown-row').length,
        tips: document.querySelectorAll('.tip').length,
        bodyFont: cs.fontFamily,
        bodyBg: cs.backgroundColor,
        textColor: cs.color,
        cardBg: getComputedStyle(document.querySelector('.card')).backgroundColor,
        stickyVisible: stickyStyle ? stickyStyle.display !== 'none' : false,
        stickyText: sticky?.textContent?.trim(),
        resultsAnchor: !!document.getElementById('results'),
      }
    })()`,
  })

  const r = result.value
  console.log(`\nURL      ${url}`)
  console.log(`Viewport ${width}x${height}`)
  console.log(`Title    ${r.title}`)
  console.log(`Font     ${r.bodyFont}`)
  console.log(`Colors   bg=${r.bodyBg} text=${r.textColor} card=${r.cardBg}`)
  console.log(`Headline ${r.headline}`)
  console.log(`Stats    ${r.statCount}  Breakdown rows ${r.breakdownRows}  Tips ${r.tips}`)
  console.log(`Form col ${JSON.stringify(r.form)}`)
  console.log(`Result col ${JSON.stringify(r.results)}`)
  console.log(`Horizontal overflow: ${r.overflow}px`)
  if (r.overflowing.length) console.log(`Overflowing elements: ${r.overflowing.join(', ')}`)

  const sideBySide = r.form && r.results && r.results.x > r.form.x + r.form.w - 5
  console.log(`Two-column layout: ${sideBySide ? 'OK' : 'NOT APPLIED (stacked)'}`)
  console.log(`Sticky total bar: ${r.stickyVisible ? 'visible' : 'hidden'} ${r.stickyText ?? ''}`)
  const expectedSticky = width <= 900
  const stickyOk = r.stickyVisible === expectedSticky
  console.log(`Sticky bar correct for viewport: ${stickyOk ? 'OK' : 'WRONG'}`)

  // The number of breakdown rows follows the selected categories in the URL.
  const catParam = new URL(url, 'http://localhost').searchParams.get('c')
  const expectedRows = catParam === null ? 5 : catParam.split(',').filter(Boolean).length
  const rowsOk = r.breakdownRows === expectedRows
  console.log(
    `Breakdown rows ${r.breakdownRows} (expected ${expectedRows}): ${rowsOk ? 'OK' : 'MISMATCH'}`,
  )

  const pass =
    r.overflow <= 0 && r.headline && rowsOk && stickyOk && r.statCount === 4 && r.tips > 0
  console.log(`Verdict: ${pass ? 'PASS' : 'CHECK'}`)
  if (!pass) process.exitCode = 1
} catch (err) {
  console.error('Audit failed:', err.message)
  process.exitCode = 1
} finally {
  chrome.kill()
  ws?.close()
}
