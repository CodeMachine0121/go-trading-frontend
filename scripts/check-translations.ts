/**
 * 檢查操作台自己寫的每一句話都有兩種語言的說法，而且畫面只用得到存在的那幾句。
 *
 * 這個檢查存在的理由是兩個型別檢查擋不住的漏洞：
 *
 * 1. **漏翻**：一個元件裡留下一句字面中文，英文畫面上就會冒出那一句中文——
 *    它是合法的字串，lint、型別檢查與單元測試都不會有意見。
 * 2. **鍵打錯**：`t('打錯的鍵')` 在 vue-i18n 的型別裡也是合法的字串，
 *    要到有人打開那個畫面，才會看到一串鍵名。
 *
 * 規則只有三條：
 *
 * - `app/` 底下的程式碼（註解以外）不得出現中日韓文字，除了三個地方：
 *   繁體中文語言目錄、domain 與 infrastructure 裡 `new LocalizedTextVo(...)` 的引數
 *   （領域說出來的話，兩種說法寫在規則旁邊），以及前一行標著 `translation-exempt` 的那一行
 *   （例如語言以自己的語言自稱）。畫面層（元件、頁面、composable）自己的話一律進語言目錄，
 *   要留在狀態裡的用 `translatedText('…')` 取。
 * - 英文語言目錄不得出現中日韓文字，也不得有空字串。
 * - 每一個 `t('…')`、`$t('…')`、`translatedText('…')`、`keypath="…"`、`consoleTitleKey: '…'`
 *   指的鍵都要在兩份目錄裡是一句話；
 *   鍵不得用組出來的（組出來的鍵沒有辦法在這裡被檢查）。
 * - 兩份目錄的每一句都要翻得出來：`{`、`@`、`|` 這幾個字在 vue-i18n 裡有意思，
 *   沒跳脫的話那一句要到有人打開那個畫面才會炸。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createDisplayLanguageI18n } from '../app/locales/create-display-language-i18n'
import { englishMessages } from '../app/locales/english-messages'
import { traditionalChineseMessages } from '../app/locales/traditional-chinese-messages'

const APP_DIRECTORY = 'app'
const TRADITIONAL_CHINESE_CATALOG_DIRECTORY = join(APP_DIRECTORY, 'locales', 'traditional-chinese')
const EXCLUDED_DIRECTORIES = new Set(['.nuxt', 'assets'])
const CHECKED_EXTENSIONS = ['.vue', '.ts']
const CJK_CHARACTER = /[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/
const EXEMPTION_MARKER = 'translation-exempt'
const LOCALIZED_TEXT_CONSTRUCTION = 'new LocalizedTextVo('
const LAYERS_THAT_SPEAK_FOR_THE_DOMAIN = [join(APP_DIRECTORY, 'domain'), join(APP_DIRECTORY, 'infrastructure')]

const violations: string[] = []

function report(file: string, lineNumber: number, problem: string): void {
  violations.push(`${file}:${lineNumber}  ${problem}`)
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      return EXCLUDED_DIRECTORIES.has(entry) ? [] : listSourceFiles(path)
    }

    return CHECKED_EXTENSIONS.some(extension => entry.endsWith(extension)) ? [path] : []
  })
}

/**
 * 把一份原始碼切成「程式碼」與「不算數的部分」：註解、`<style>` 區塊。
 * 回傳的字串與原文等長，不算數的部分換成空白（換行保留），行號因此對得上。
 * 字串與樣板字串原樣保留，裡面的 `//` 不會被當成註解。
 */
function blankOutNonCode(source: string): string {
  const characters = [...source]
  const blank = (start: number, end: number): void => {
    for (let index = start; index < end; index += 1) {
      if (characters[index] !== '\n') {
        characters[index] = ' '
      }
    }
  }

  const text = characters.join('')
  for (const match of text.matchAll(/<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g)) {
    blank(match.index, match.index + match[0].length)
  }

  let index = 0
  let quote: string | null = null
  while (index < characters.length) {
    const character = characters[index]
    const next = characters[index + 1]
    if (quote !== null) {
      if (character === '\\') {
        index += 2
        continue
      }
      if (character === quote) {
        quote = null
      }
      index += 1
      continue
    }
    if (character === '\'' || character === '"' || character === '`') {
      quote = character
      index += 1
      continue
    }
    if (character === '/' && next === '/') {
      const end = characters.indexOf('\n', index)
      blank(index, end === -1 ? characters.length : end)
      index = end === -1 ? characters.length : end
      continue
    }
    if (character === '/' && next === '*') {
      const end = characters.join('').indexOf('*/', index + 2)
      const stop = end === -1 ? characters.length : end + 2
      blank(index, stop)
      index = stop
      continue
    }
    index += 1
  }

  return characters.join('')
}

/** 每一個 `new LocalizedTextVo(` 的引數所在的區段（括號對齊，略過字串裡的括號）。 */
function localizedTextSpans(code: string): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  let searchFrom = 0
  while (true) {
    const start = code.indexOf(LOCALIZED_TEXT_CONSTRUCTION, searchFrom)
    if (start === -1) {
      return spans
    }

    let depth = 1
    let index = start + LOCALIZED_TEXT_CONSTRUCTION.length
    let quote: string | null = null
    while (index < code.length && depth > 0) {
      const character = code[index]
      if (quote !== null) {
        if (character === '\\') {
          index += 1
        }
        else if (character === quote) {
          quote = null
        }
      }
      else if (character === '\'' || character === '"' || character === '`') {
        quote = character
      }
      else if (character === '(') {
        depth += 1
      }
      else if (character === ')') {
        depth -= 1
      }
      index += 1
    }

    spans.push([start, index])
    searchFrom = index
  }
}

function lineNumberAt(code: string, position: number): number {
  return code.slice(0, position).split('\n').length
}

function checkNoUntranslatedText(file: string, source: string): void {
  if (file.startsWith(TRADITIONAL_CHINESE_CATALOG_DIRECTORY)) {
    return
  }

  const code = blankOutNonCode(source)
  const spans = LAYERS_THAT_SPEAK_FOR_THE_DOMAIN.some(directory => file.startsWith(directory))
    ? localizedTextSpans(code)
    : []
  const sourceLines = source.split('\n')
  const reportedLines = new Set<number>()

  for (const match of code.matchAll(new RegExp(CJK_CHARACTER.source, 'g'))) {
    const position = match.index
    if (spans.some(([start, end]) => position >= start && position < end)) {
      continue
    }

    const lineNumber = lineNumberAt(code, position)
    const previousLine = sourceLines[lineNumber - 2] ?? ''
    if (previousLine.includes(EXEMPTION_MARKER) || reportedLines.has(lineNumber)) {
      continue
    }

    reportedLines.add(lineNumber)
    report(file, lineNumber, `untranslated text: ${sourceLines[lineNumber - 1]?.trim()}`)
  }
}

type CatalogValue = string | { [key: string]: CatalogValue }

function flatten(catalog: CatalogValue, prefix = ''): Map<string, string> {
  if (typeof catalog === 'string') {
    return new Map([[prefix, catalog]])
  }

  return new Map(Object.entries(catalog).flatMap(
    ([key, value]) => [...flatten(value, prefix === '' ? key : `${prefix}.${key}`)]))
}

const traditionalChineseEntries = flatten(traditionalChineseMessages)
const englishEntries = flatten(englishMessages)

for (const [key, english] of englishEntries) {
  if (CJK_CHARACTER.test(english)) {
    report('app/locales/english', 0, `${key} is not English: ${english}`)
  }
  if (english.trim() === '') {
    report('app/locales/english', 0, `${key} is empty`)
  }
}
for (const [key, traditionalChinese] of traditionalChineseEntries) {
  if (traditionalChinese.trim() === '') {
    report('app/locales/traditional-chinese', 0, `${key} is empty`)
  }
}

const translation = createDisplayLanguageI18n().global
for (const key of traditionalChineseEntries.keys()) {
  for (const locale of ['zh-TW', 'en'] as const) {
    try {
      translation.t(key, {}, { locale })
    }
    catch (error: unknown) {
      report(`app/locales (${locale})`, 0, `${key} does not compile: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`)
    }
  }
}

const KEY_REFERENCES = [
  /(?<![\w$.])(?:\$?t|translatedText)\(\s*(['"`])((?:(?!\1).)*)\1/g,
  /\bkeypath="([^"]*)"/g,
  /\bconsole(?:Title|Subtitle)Key:\s*(['"`])((?:(?!\1).)*)\1/g,
]

function checkKeyReferences(file: string, source: string): void {
  const code = blankOutNonCode(source)
  for (const pattern of KEY_REFERENCES) {
    for (const match of code.matchAll(pattern)) {
      const key = match.length === 3 ? match[2] : match[1]
      const lineNumber = lineNumberAt(code, match.index)
      if (key === undefined || key.includes('${') || (match.length === 3 && match[1] === '`')) {
        report(file, lineNumber, `translation key must be a literal: ${match[0]}`)
        continue
      }
      if (!traditionalChineseEntries.has(key) || !englishEntries.has(key)) {
        report(file, lineNumber, `unknown translation key: ${key}`)
      }
    }
  }
}

for (const file of listSourceFiles(APP_DIRECTORY)) {
  const source = readFileSync(file, 'utf8')
  const relativeFile = relative('.', file)
  checkNoUntranslatedText(relativeFile, source)
  checkKeyReferences(relativeFile, source)
}

if (violations.length > 0) {
  console.error(`check-translations: ${violations.length} problem(s)\n`)
  console.error(violations.join('\n'))
  process.exit(1)
}

console.log(`check-translations: ${traditionalChineseEntries.size} phrases, both languages complete`)
