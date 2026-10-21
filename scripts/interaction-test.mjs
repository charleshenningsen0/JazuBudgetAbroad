/**
 * End-to-end interaction test driven through the Chrome DevTools Protocol.
 * Exercises multi-destination planning, the category selector, custom costs,
 * the budget checker and shareable-URL behaviour.
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
  check(
    (await evaluate(`document.querySelectorAll('.leg').length`)) === 1,
    'the trip starts with one destination',
  )

  // ------------------------------------------------------ add a destination
  console.log('\nAdding a destination')
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.btn--dashed')].find(b => b.textContent.includes('Add another'));
    btn.click();
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.querySelectorAll('.leg').length`)) === 2,
    'a second destination row appears',
  )
  check(
    (await evaluate(`document.querySelector('.field-hint').textContent`)).includes('days in total'),
    'the total day count is shown',
  )

  // Pick a destination for the new stop.
  await evaluate(`(() => {
    const inputs = document.querySelectorAll('#destination-search');
    const input = inputs[inputs.length - 1];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'toky');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  })()`)
  await sleep(400)
  const pickedCity = await evaluate(`(() => {
    const items = [...document.querySelectorAll('.picker-item')];
    const visible = items.find(i => i.textContent.includes('Tokyo'));
    if (!visible) return null;
    visible.click();
    return 'Tokyo';
  })()`)
  await sleep(400)
  check(pickedCity === 'Tokyo', 'the second stop was set to Tokyo')

  // Set the length of the first stop.
  await evaluate(`(() => {
    const input = document.querySelector('#leg-days-leg-1');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '10');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.querySelector('#leg-days-leg-1').value`)) === '10',
    'the first stop is 10 days long',
  )

  const multiHeadline = await evaluate(`document.querySelector('.headline-amount').textContent`)
  check(
    multiHeadline !== initial,
    `the total changed once a second destination was added (${multiHeadline.trim()})`,
  )
  check(
    (await evaluate(`document.querySelectorAll('.leg-breakdown-row').length`)) === 2,
    'a per-destination breakdown appears for multi-stop trips',
  )

  // ------------------------------------------------------- category selection
  console.log('\nSelecting which categories to calculate')
  const beforeToggle = await evaluate(`document.querySelector('.headline-amount').textContent`)
  await evaluate(`(() => {
    const cats = [...document.querySelectorAll('.category')];
    const food = cats.find(c => c.textContent.includes('Food & groceries'));
    food.click();
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.querySelectorAll('.breakdown-row').length`)) === 4,
    'unchecking food removes it from the breakdown',
  )
  check(
    (await evaluate(`document.querySelector('.headline-amount').textContent`)) !== beforeToggle,
    'the total drops when a category is excluded',
  )
  check(
    (await evaluate(`document.querySelector('.headline-local--muted')?.textContent ?? ''`)).includes(
      'left out',
    ),
    'the app reports how many categories were excluded',
  )

  // ------------------------------------------------------------ custom costs
  console.log('\nAdding a custom cost')
  const beforeCustom = await evaluate(`document.querySelector('.headline-amount').textContent`)
  await evaluate(`(() => {
    const label = document.querySelector('.custom-add input[type=text]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(label, 'Souvenirs');
    label.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(200)
  await evaluate(`(() => {
    const amount = document.querySelector('.custom-add input[type=number]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(amount, '250');
    amount.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(200)
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.custom-add .btn')].find(b => b.textContent.includes('Add'));
    btn.click();
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.querySelectorAll('.custom-row').length`)) === 1,
    'the custom cost is added to the list',
  )
  check(
    (await evaluate(`document.querySelector('.headline-amount').textContent`)) !== beforeCustom,
    'the custom cost changes the headline total',
  )
  check(
    (await evaluate(`document.querySelector('.onoff-list').textContent`)).includes('Souvenirs'),
    'a one-off custom cost shows in the one-off costs list',
  )

  // ------------------------------------------------------------- budget check
  console.log('\nBudget checker')
  await evaluate(`(() => {
    const input = document.getElementById('budget');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '500');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(400)
  check(
    (await evaluate(`document.querySelector('.budget-check')?.className ?? ''`)).includes('over'),
    'a small budget is flagged as over budget',
  )

  // ------------------------------------------------------------ shareable URL
  console.log('\nShareable URL')
  const url = await evaluate(`window.location.search`)
  check(url.includes('l='), `both stops are encoded in the URL (${url})`)
  check(url.includes('c='), 'the category selection is encoded')
  check(url.includes('x='), 'the custom cost is encoded')

  await evaluate(`(() => { window.location.href = window.location.pathname + window.location.search; return true })()`)
  await sleep(2000)
  check(
    (await evaluate(`document.querySelectorAll('.leg').length`)) === 2,
    'the reloaded page restores both destinations',
  )
  check(
    (await evaluate(`document.querySelector('#leg-days-leg-1').value`)) === '10',
    'the reloaded page restores the trip length',
  )
  check(
    (await evaluate(`document.querySelectorAll('.custom-row').length`)) === 1,
    'the reloaded page restores the custom cost',
  )
  check(
    (await evaluate(`document.querySelectorAll('.breakdown-row').length`)) === 4,
    'the reloaded page restores the category selection',
  )

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
