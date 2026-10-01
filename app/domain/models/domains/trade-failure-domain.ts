import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { TradeRecordNotFoundError } from '~/domain/errors/trade-record-not-found-error'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { TradeTagNotFoundError } from '~/domain/errors/trade-tag-not-found-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { TradeFailureDto } from '~/domain/models/dto/trade-failure-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const UNREACHABLE_MESSAGE = new LocalizedTextVo(
  '連不上交易服務（go-trading API），請確認它已啟動後再試一次。',
  'Cannot reach the trading service (go-trading API). Make sure it is running, then try again.')
const SERVER_FAILURE_MESSAGE = new LocalizedTextVo(
  '交易服務暫時出了問題，請稍後再試。', 'The trading service ran into a problem. Please try again later.')
const UNEXPECTED_MESSAGE = new LocalizedTextVo(
  '與交易日誌往來時發生未預期的錯誤。', 'An unexpected error occurred while talking to the trade journal.')

const MESSAGE_CARRYING_ERRORS = [
  BackendRequestRejectedError,
  TradeRecordNotFoundError,
  TradeRejectedError,
  TradeAlreadyOpenError,
  JournalLinkNotFoundError,
  TradeTagNotFoundError,
  TradeTagNameConflictError,
  TradeTagInUseError,
  TradingStrategyNotFoundError,
] as const

export class TradeFailureDomain {
  constructor(private readonly error: unknown) {}

  toDto(): TradeFailureDto {
    if (this.error instanceof BackendUnreachableError) {
      return new TradeFailureDto(UNREACHABLE_MESSAGE, true)
    }

    if (this.error instanceof BackendServerError) {
      return new TradeFailureDto(SERVER_FAILURE_MESSAGE, false)
    }

    for (const errorClass of MESSAGE_CARRYING_ERRORS) {
      if (this.error instanceof errorClass) {
        return new TradeFailureDto(this.error.localizedMessage, false)
      }
    }

    return new TradeFailureDto(UNEXPECTED_MESSAGE, false)
  }
}
