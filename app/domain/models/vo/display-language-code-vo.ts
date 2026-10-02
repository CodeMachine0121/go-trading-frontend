/**
 * VO：可選的顯示語言代碼，依清單順序。第一個是預設，也是任何看不懂的代碼的退路。
 * 與 `<html lang>` 用同一套寫法，朗讀工具才念得對。
 */
export const DISPLAY_LANGUAGE_CODES = ['zh-TW', 'en'] as const

export type DisplayLanguageCodeVo = typeof DISPLAY_LANGUAGE_CODES[number]
