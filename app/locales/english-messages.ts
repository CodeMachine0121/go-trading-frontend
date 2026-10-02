import type { traditionalChineseMessages } from '~/locales/traditional-chinese-messages'
import { commonEnglishMessages } from '~/locales/english/common'
import { shellEnglishMessages } from '~/locales/english/shell'
import { settingsEnglishMessages } from '~/locales/english/settings'
import { marketDataEnglishMessages } from '~/locales/english/market-data'
import { strategyScriptEnglishMessages } from '~/locales/english/strategy-script'
import { backtestEnglishMessages } from '~/locales/english/backtest'
import { tradingStrategyEnglishMessages } from '~/locales/english/trading-strategy'
import { strategyBotEnglishMessages } from '~/locales/english/strategy-bot'
import { tradeJournalEnglishMessages } from '~/locales/english/trade-journal'
import { contractTradeJournalEnglishMessages } from '~/locales/english/contract-trade-journal'
import { assistantEnglishMessages } from '~/locales/english/assistant'

/** 英文語言目錄：以繁體中文目錄為型別，兩份的鍵永遠一一對應。 */
export const englishMessages: typeof traditionalChineseMessages = {
  common: commonEnglishMessages,
  shell: shellEnglishMessages,
  settings: settingsEnglishMessages,
  marketData: marketDataEnglishMessages,
  strategyScript: strategyScriptEnglishMessages,
  backtest: backtestEnglishMessages,
  tradingStrategy: tradingStrategyEnglishMessages,
  strategyBot: strategyBotEnglishMessages,
  tradeJournal: tradeJournalEnglishMessages,
  contractTradeJournal: contractTradeJournalEnglishMessages,
  assistant: assistantEnglishMessages,
}
