/**
 * 把每一個畫面在三種寬度下截下來，並順手量幾件人眼會漏的事。
 *
 * 它**不啟動 dev server**，而是接上一個已經在跑的（預設 http://localhost:3000）。
 * 那是刻意的：dev server 開著不關、改完樣式靠 HMR 立刻生效，這支腳本就只要再跑一次，
 * 一輪迭代是幾秒而不是幾十秒。
 *
 * 後端接的是**真的生產環境**。瀏覽器會因為跨來源而讀不到回應（生產後端的
 * CORS 名單裡沒有 localhost），所以這裡把每一發請求攔下來、由 Playwright 自己
 * 轉一手、補上放行標頭再交給頁面——**生產環境的設定一個字都不必改**。
 *
 * 它只走路與看，不按任何會改變資料的東西：這是別人的正式資料。
 *
 * 登入用的帳密放在 `.env`（`SHOTS_EMAIL` / `SHOTS_PASSWORD`，該檔不進版控），
 * 或直接用環境變數傳進來。
 *
 * 用法：
 *   bunx playwright install chromium # 只有第一次：瀏覽器本體不在 npm 套件裡
 *   bun run dev                      # 另一個終端，開著不要關
 *   node scripts/shots.mjs           # 三種寬度全跑
 *   node scripts/shots.mjs --only=/k-candles/chart --width=390
 *   node scripts/shots.mjs --no-js   # 只截伺服器端畫出來、還沒補正的那一版
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { chromium } from '@playwright/test'

const SITE = process.env.SHOTS_SITE ?? 'http://localhost:3000'
const BACKEND = process.env.SHOTS_BACKEND ?? 'https://trading-api.coding-afternoon.com'
const OUTPUT_DIRECTORY = '.screenshots'
const SESSION_FILE = '.auth.json'

/**
 * 三種寬度，各自代表一種真實的處境。
 *
 * 390 是這個操作台支援的最窄寬度（手機直立）；768 與 1024 是兩道分界，
 * 所以 768 看的是「剛過疏密分界、但還沒到側欄」那一段——那是最容易被漏掉的一段。
 */
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'tablet', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
]

const SCREENS = [
  { path: '/k-candles', name: 'k-candles' },
  { path: '/k-candles/chart', name: 'chart' },
  { path: '/strategy-scripts', name: 'strategy-scripts' },
  { path: '/marketplace', name: 'marketplace' },
  { path: '/strategy-bots', name: 'strategy-bots' },
  { path: '/trading-strategies', name: 'trading-strategies' },
  { path: '/chat', name: 'chat' },
  { path: '/settings', name: 'settings' },
]

const argument = name => process.argv.find(item => item.startsWith(`--${name}=`))?.split('=')[1]
const hasFlag = name => process.argv.includes(`--${name}`)

/** 生產後端不認得 localhost 這個來源，所以由我們自己轉一手並補上放行標頭。 */
async function letTheBrowserReadProduction(context) {
  await context.route(`${BACKEND}/**`, async (route) => {
    try {
      const response = await route.fetch()

      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          'access-control-allow-origin': SITE,
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': '*',
        },
      })
    }
    catch {
      // 轉不了的那幾種就原樣放行：即時更新那條是一直開著的串流，
      // 轉一手會卡住；而畫面上的即時更新對一張截圖沒有意義。
      // 放行之後瀏覽器會因為跨來源擋掉它，那正是我們要的——別讓它拖住整頁。
      await route.continue().catch(() => {})
    }
  })
}

/**
 * 帳密從哪裡來：環境變數優先，其次是 `.env`（那個檔本來就不進版控）。
 *
 * 不從命令列參數拿——那會把密碼留在 shell 的歷史紀錄與行程清單上。
 */
async function readCredentials() {
  const fromFile = existsSync('.env')
    ? Object.fromEntries((await readFile('.env', 'utf8'))
        .split('\n')
        .filter(line => line.includes('=') && !line.trim().startsWith('#'))
        .map(line => [
          line.slice(0, line.indexOf('=')).trim(),
          // dotenv 的值常常帶引號，而 Windows 存的檔每一行結尾還多一個 \r。
          // 兩者原樣送進輸入框，後端只會說帳密不對——而那離真正的原因很遠。
          line.slice(line.indexOf('=') + 1).trim().replace(/\r$/, '').replace(/^(['"])(.*)\1$/, '$2'),
        ]))
    : {}

  // 空字串不算「有給」：它會通過「有沒有定義」那一關，然後變成一次看不懂的登入逾時。
  const given = value => (value === undefined || value === '' ? undefined : value)

  return {
    email: given(process.env.SHOTS_EMAIL) ?? given(fromFile.SHOTS_EMAIL),
    password: given(process.env.SHOTS_PASSWORD) ?? given(fromFile.SHOTS_PASSWORD),
  }
}

/**
 * 登入一次，把那一份登入狀態存起來給後面每一個視窗用。
 *
 * `fresh` 為真時不採用存著的那一份——那一份會過期，而過期之後每一頁都會
 * 被導回登入畫面。一張登入畫面不會溢出、也沒有太小的鍵，於是整輪三十張
 * 都會報 ok：**一個會說謊的工具比沒有工具更糟**。
 */
async function signInOnce(browser, { fresh = false } = {}) {
  if (!fresh && existsSync(SESSION_FILE)) {
    return SESSION_FILE
  }

  const { email, password } = await readCredentials()

  if (email === undefined || password === undefined) {
    throw new Error('請在 .env 裡給 SHOTS_EMAIL 與 SHOTS_PASSWORD（`.env` 不進版控），'
      + '或用環境變數傳進來。只跑伺服器端那一版的話加上 --no-js，那一趟不必登入。')
  }

  const context = await browser.newContext()
  await letTheBrowserReadProduction(context)
  const page = await context.newPage()

  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit').click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 })

  await context.storageState({ path: SESSION_FILE })
  await context.close()

  return SESSION_FILE
}

/**
 * 人眼最容易漏、而且正是這幾刀出過事的三件事。
 *
 * 「按不按得準」只問觸控的那幾個視窗：用滑鼠的裝置上那條下限本來就是零，
 * 在那裡問它，只會得到一整排與事實無關的警告。
 */
async function measure(page, { touch }) {
  return page.evaluate((checkTapTargets) => {
    // 門檻取自 token 本身（2.5rem × 根字級），不寫死一個數字——
    // 寫死的那個會在根字級調整的那一天開始說錯話。
    const smallestTapTarget = 2.5 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

    const overflowing = [...document.querySelectorAll('*')]
      .filter(element => element.scrollWidth > element.clientWidth + 1
        && getComputedStyle(element).overflowX === 'visible')
      .slice(0, 5)
      .map(element => `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`.slice(0, 80))

    const tooSmallToTap = (checkTapTargets
      ? [...document.querySelectorAll('button, a, [role="button"]')]
      : [])
      .filter((element) => {
        const box = element.getBoundingClientRect()

        return box.width > 0 && box.height > 0 && box.height < smallestTapTarget
      })
      .slice(0, 5)
      .map(element => `${element.textContent?.trim().slice(0, 16)} (${Math.round(element.getBoundingClientRect().height)}px，至少要 ${Math.round(smallestTapTarget)}px)`)

    return {
      pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      overflowing,
      tooSmallToTap,
    }
  }, touch)
}

const browser = await chromium.launch()
let sessionFile = hasFlag('no-js') ? undefined : await signInOnce(browser)

/** 存著的那一份還算不算數：拿一頁要登入的畫面去問，被導回登入就是不算。 */
if (sessionFile !== undefined) {
  const context = await browser.newContext({ storageState: sessionFile })
  await letTheBrowserReadProduction(context)
  const page = await context.newPage()
  await page.goto(`${SITE}/settings`, { waitUntil: 'networkidle' }).catch(() => {})
  const bounced = new URL(page.url()).pathname.startsWith('/login')
  await context.close()

  if (bounced) {
    await rm(SESSION_FILE, { force: true })
    sessionFile = await signInOnce(browser, { fresh: true })
  }
}
const onlyPath = argument('only')
const onlyWidth = argument('width')
const screens = onlyPath === undefined ? SCREENS : SCREENS.filter(screen => screen.path === onlyPath)
const viewports = onlyWidth === undefined
  ? VIEWPORTS
  : VIEWPORTS.filter(viewport => String(viewport.width) === onlyWidth)

await mkdir(OUTPUT_DIRECTORY, { recursive: true })
const report = []

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    storageState: sessionFile,
    // 關掉 JavaScript 看到的就是伺服器端畫出來、還沒補正的那一版——
    // 手機第一眼真正看到的東西。
    javaScriptEnabled: !hasFlag('no-js'),
  })
  await letTheBrowserReadProduction(context)
  const page = await context.newPage()

  for (const screen of screens) {
    // 走不到就記下來、跳過。吞掉它的話，拍到的是上一頁，而檔名與報告
    // 都會掛上這一頁的名字——那比沒有這張圖更糟。
    const arrived = await page.goto(`${SITE}${screen.path}`, { waitUntil: 'networkidle' })
      .then(() => true)
      .catch(() => false)

    if (!arrived) {
      report.push({ file: `${viewport.name}-${screen.name}`, at: `${viewport.width}px`, unreachable: true, overflowing: [], tooSmallToTap: [] })
      continue
    }

    // Nuxt 在開發模式會在畫面右下角掛一顆自己的工具鍵。它不是這個 app 的一部分，
    // 卻會擋住那個角落的東西、出現在每一張截圖上。每導覽一次就要再蓋一次。
    await page.addStyleTag({ content: '#nuxt-devtools-container, #vue-tracer-overlay { display: none !important }' })
      .catch(() => {})
    await page.waitForTimeout(600)

    const suffix = hasFlag('no-js') ? '-nojs' : ''
    const file = `${OUTPUT_DIRECTORY}/${viewport.name}-${screen.name}${suffix}.png`
    await page.screenshot({ path: file, fullPage: false })

    report.push({ file, at: `${viewport.width}px`, ...(await measure(page, { touch: viewport.hasTouch })) })
  }

  await context.close()
}

await browser.close()
await writeFile(`${OUTPUT_DIRECTORY}/report.json`, `${JSON.stringify(report, null, 2)}\n`)

for (const entry of report) {
  const problems = [
    entry.unreachable ? '走不到這一頁（逾時或導覽失敗）' : null,
    entry.pageScrollsSideways ? '整頁可以左右拖' : null,
    entry.overflowing.length > 0 ? `撐出去的元素：${entry.overflowing.join(' / ')}` : null,
    entry.tooSmallToTap.length > 0 ? `按不準：${entry.tooSmallToTap.join(' / ')}` : null,
  ].filter(problem => problem !== null)

  console.log(`${problems.length === 0 ? 'ok  ' : 'BAD '} ${entry.file}${problems.length === 0 ? '' : `\n     ${problems.join('\n     ')}`}`)
}
