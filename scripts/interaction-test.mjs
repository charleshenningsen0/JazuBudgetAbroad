/**
 * End-to-end interaction test driven through the Chrome DevTools Protocol.
 * Exercises the destination picker, tier selector, length input, budget
 * checker and shareable-URL behaviour.
 *
 * Usage: node scripts/interaction-test.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const baseUrl = process.argv[2] ?? 'http://localhost:5173/'
const port = 9800 + Math.floor(Math.random() * 400)

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,1200',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let id = 0
const pending = new Map()

function send(method, params = {}) {
  const msgId = ++id
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    returnByValue: true,
    awaitPromise: true,
    expression,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'evaluation failed')
  return result.value
}

let failures = 0
function check(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

try {
  let target = null
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
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
  await send('Page.navigate', { url: baseUrl })
  await sleep(2000)

  // ---------------------------------------------------------- initial state
  console.log('\nInitial render')
  const initial = await evaluate(`document.querySelector('.headline-amount').textContent`)
  check(/^\$\d/.test(initial.trim()), `headline shows a dollar amount (${initial.trim()})`)
  check(
    (await evaluate(`document.querySelectorAll('.breakdown-row').length`)) === 5,
    'five spending categories are listed',
  )

  // ------------------------------------------------------- destination picker
  console.log('\nDestination picker')
  await evaluate(`(() => {
    const input = document.getElementById('destination-search')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'toky')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
  })()`)
  await sleep(400)
  const filtered = await evaluate(
    `document.querySelectorAll('.picker-item').length`,
  )
  check(filtered > 0, `typing filters the list (${filtered} match)`)

  const picked = await evaluate(`(() => {
    const item = document.querySelector('.picker-item')
    if (!item) return null
    const city = item.querySelector('.picker-item-city').textContent
    item.click()
    return city
  })()`)
  await sleep(400)
  check(!!picked, `selected a destination from the list (${picked})`)

  const afterPick = await evaluate(`document.querySelector('.headline-amount').textContent`)
  check(afterPick !== initial, `headline updated after choosing a destination (${afterPick.trim()})`)

  // ------------------------------------------------------------ tier selector
  console.log('\nTier selector')
  const beforeTier = afterPick
  await evaluate(`(() => {
    const tiers = [...document.querySelectorAll('.tier')]
    const premium = tiers.find(t => t.textContent.includes('Premium'))
    premium.click()
  })()`)
  await sleep(400)
  const afterTier = await evaluate(`document.querySelector('.headline-amount').textContent`)
  check(afterTier !== beforeTier, `switching to Premium changed the total (${afterTier.trim()})`)
  check(
    (await evaluate(`document.querySelector('.tier--active').textContent`)).includes('Premium'),
    'the Premium tier is marked as active',
  )

  // ----------------------------------------------------------- length presets
  console.log('\nLength presets')
  await evaluate(`(() => {
    const preset = [...document.querySelectorAll('.presets .chip')].find(c => c.textContent.includes('Semester'))
    preset.click()
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.getElementById('days').value`)) === '120',
    'the Semester preset sets 120 days',
  )
  const afterPreset = await evaluate(`document.querySelector('.headline-amount').textContent`)
  check(afterPreset !== afterTier, 'a longer stay increases the total')

  // ------------------------------------------------------------------ budget
  console.log('\nBudget checker')
  await evaluate(`(() => {
    const input = document.getElementById('budget')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '500')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(400)
  const budgetState = await evaluate(`(() => {
    const el = document.querySelector('.budget-check')
    return el ? el.className : null
  })()`)
  check(!!budgetState, 'the budget comparison card appears')
  check(
    budgetState.includes('over') || budgetState.includes('tight'),
    `a small budget is flagged (${budgetState})`,
  )

  // ------------------------------------------------------------ shareable URL
  console.log('\nShareable URL')
  const url = await evaluate(`window.location.search`)
  check(url.includes('d='), `the destination is encoded in the URL (${url})`)
  check(url.includes('n=120'), 'the length is encoded in the URL')
  check(url.includes('t=premium'), 'the tier is encoded in the URL')

  const reloaded = await evaluate(`(() => {
    window.location.href = window.location.pathname + window.location.search
    return true
  })()`)
  await sleep(2000)
  check(reloaded, 'reloaded the shared URL')
  check(
    (await evaluate(`document.getElementById('days').value`)) === '120',
    'the reloaded page restores the trip length',
  )
  check(
    (await evaluate(`document.querySelector('.tier--active').textContent`)).includes('Premium'),
    'the reloaded page restores the spending tier',
  )

  // ------------------------------------------------------------------ summary
  console.log(
    `\n${failures === 0 ? '✓' : '✗'} ${failures === 0 ? 'All interaction checks passed' : `${failures} interaction checks FAILED`}`,
  )
  process.exitCode = failures === 0 ? 0 : 1
} catch (err) {
  console.error('\nInteraction test error:', err.message)
  process.exitCode = 1
} finally {
  chrome.kill()
  ws?.close()
}
