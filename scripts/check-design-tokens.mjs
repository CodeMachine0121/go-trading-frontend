/**
 * 檢查每一個 token 取用的名字，在 abstracts/_tokens.scss 裡真的存在。
 *
 * 這個檢查存在的理由是一個真實的漏洞：`color('accent')` 這種寫錯的名字，
 * **lint、stylelint、型別檢查與單元測試一關都擋不住**——它們都不編譯 SCSS。
 * 它只在 `nuxt dev` 或 `nuxt build` 實際編譯那個檔案時才爆，
 * 也就是在所有自動檢查都綠了之後、在人打開畫面的那一刻。
 *
 * 跑一次完整的 build 也擋得住，但那要花上一分鐘，而且錯誤訊息埋在編譯堆疊裡。
 * 這支腳本只問一件事，因此是毫秒級的，而且直接說出是哪個檔案的哪一行。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TOKENS_FILE = 'app/assets/styles/abstracts/_tokens.scss'

/** 每一個 token 函式，以及它讀的是哪一張表。 */
const TOKEN_MAPS = {
  'color': '$colors',
  'spacing': '$spacings',
  'font-size': '$font-sizes',
  'font-weight': '$font-weights',
  'line-height': '$line-heights',
  'radius': '$radii',
  'shadow': '$shadows',
  'z-index': '$z-indices',
  'duration': '$durations',
  'font-family': '$font-families',
  'control-size': '$control-sizes',
}

/** 一張表裡宣告了哪幾個名字。 */
function namesIn(source, mapName) {
  const start = source.indexOf(`${mapName}: (`)
  if (start === -1) {
    return null
  }

  // 從表頭數括號，數到它自己那一個收起來為止——表裡的值本身也可能帶括號
  // （rgb(...)、陰影的多層值），所以不能找第一個 `)`。
  let depth = 0
  let end = start
  for (let index = source.indexOf('(', start); index < source.length; index += 1) {
    if (source[index] === '(') depth += 1
    if (source[index] === ')') {
      depth -= 1
      if (depth === 0) {
        end = index
        break
      }
    }
  }

  return new Set([...source.slice(start, end).matchAll(/^\s*'([^']+)':/gm)]
    .map(match => match[1]))
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)

    if (statSync(path).isDirectory()) {
      return filesUnder(path)
    }

    return /\.(vue|scss)$/.test(path) ? [path] : []
  })
}

const tokensSource = readFileSync(TOKENS_FILE, 'utf8')
const declared = Object.fromEntries(
  Object.entries(TOKEN_MAPS).map(([fn, map]) => [fn, namesIn(tokensSource, map)]))

const missingMaps = Object.entries(declared)
  .filter(([, names]) => names === null)
  .map(([fn]) => TOKEN_MAPS[fn])
if (missingMaps.length > 0) {
  console.error(`找不到這幾張 token 表：${missingMaps.join('、')}`)
  console.error(`（它們應該在 ${TOKENS_FILE} 裡。表改名了的話，這支腳本也要跟著改。）`)
  process.exit(1)
}

const problems = []
for (const path of filesUnder('app')) {
  readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
    for (const [fn, names] of Object.entries(declared)) {
      for (const match of line.matchAll(new RegExp(`\\b${fn}\\('([^']+)'\\)`, 'g'))) {
        if (!names.has(match[1])) {
          problems.push({ path, line: index + 1, fn, name: match[1] })
        }
      }
    }
  })
}

if (problems.length > 0) {
  console.error('用到了沒有宣告過的 design token：\n')
  for (const problem of problems) {
    console.error(`  ${problem.path}:${problem.line}  ${problem.fn}('${problem.name}')`)
  }
  console.error(`\n先加進 ${TOKENS_FILE}，不要在元件內寫死字面值。`)
  process.exit(1)
}

// ─── 門口的載入：唯一一份不得不寫字面值的地方 ────────────────────────────────
//
// 它在任何樣式表載入之前就要畫出來，所以 token 函式在那裡用不了，只能抄值。
// 抄的值旁邊標著抄的是哪一個（`token: $表.名字`，或單一變數 `token: $名字`），
// 這裡逐一比對：token 改了而那裡沒跟著改，門口與登入卡片就會差一點點，而沒有人會注意到。
// 顏色、間距、字級、圓角、陰影這幾類屬性**一定要**標——沒標的字面值就是沒人在比對的值。

const DOOR_FILE = 'app/spa-loading-template.html'
const BREAKPOINTS_FILE = 'app/assets/styles/abstracts/_breakpoints.scss'
const TOKENIZED_PROPERTIES = /^\s*(color|background(-color)?|border(-top-color)?|border-radius|box-shadow|padding|gap|font-size|font-weight|font-family)\s*:/
const abstractsSource = `${tokensSource}\n${readFileSync(BREAKPOINTS_FILE, 'utf8')}`

/** 一個 token 的值，照它在 SCSS 裡寫的樣子（清單外面那一對括號拿掉）。找不到回 null。 */
function tokenValue(reference) {
  const [variable, name] = reference.split('.')
  if (name === undefined) {
    const single = abstractsSource.match(new RegExp(`^\\${variable}:\\s*([^;]+);`, 'm'))
    return single?.[1].trim() ?? null
  }

  const start = abstractsSource.indexOf(`${variable}: (`)
  if (start === -1) {
    return null
  }
  const entry = abstractsSource.slice(start).match(new RegExp(`^\\s*'${name}':\\s*(.+?),?\\s*(//.*)?$`, 'm'))
  if (entry === null) {
    return null
  }
  const value = entry[1].trim()

  return value.startsWith('(') && value.endsWith(')') ? value.slice(1, -1) : value
}

const doorProblems = []
readFileSync(DOOR_FILE, 'utf8').split('\n').forEach((line, index) => {
  const annotation = line.match(/\/\*\s*token:\s*([^*]+)\*\//)
  const declaration = line.replace(/\/\*.*\*\//, '')

  if (annotation === null) {
    if (TOKENIZED_PROPERTIES.test(line) && /[#\d]/.test(declaration)) {
      doorProblems.push(`  ${DOOR_FILE}:${index + 1}  這個值抄自 token 卻沒有標是哪一個`)
    }
    return
  }

  for (const reference of annotation[1].trim().split(/\s+/)) {
    const value = tokenValue(reference)
    if (value === null) {
      doorProblems.push(`  ${DOOR_FILE}:${index + 1}  沒有這個 token：${reference}`)
    }
    else if (!declaration.includes(value)) {
      doorProblems.push(`  ${DOOR_FILE}:${index + 1}  ${reference} 現在是 ${value}，這裡寫的不是它`)
    }
  }
})

if (doorProblems.length > 0) {
  console.error('門口的載入與 design token 對不上：\n')
  for (const problem of doorProblems) {
    console.error(problem)
  }
  console.error(`\n照 ${TOKENS_FILE} 現在的值改 ${DOOR_FILE}。`)
  process.exit(1)
}

console.log('design token 全部都有宣告過，門口的載入也與它們一致。')
