import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ContractTradeNotFoundError } from '~/domain/errors/contract-trade-not-found-error'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { ContractTradeOpenPositionExistsError } from '~/domain/errors/contract-trade-open-position-exists-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { TradeTagNotFoundError } from '~/domain/errors/trade-tag-not-found-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { ContractTradeFailureDto } from '~/domain/models/dto/contract-trade-failure-dto'

const UNREACHABLE_MESSAGE = '連不上交易服務（go-trading API），請確認它已啟動後再試一次。'
const SERVER_FAILURE_MESSAGE = '交易服務暫時出了問題，請稍後再試。'
const UNEXPECTED_MESSAGE = '與交易日誌往來時發生未預期的錯誤。'

const MESSAGE_CARRYING_ERRORS = [
  BackendRequestRejectedError,
  ContractTradeNotFoundError,
  ContractTradeRejectedError,
  ContractTradeOpenPositionExistsError,
  JournalLinkNotFoundError,
  TradeTagNotFoundError,
  TradeTagNameConflictError,
  TradeTagInUseError,
  TradingStrategyNotFoundError,
] as const

export class ContractTradeFailureDomain {
  constructor(private readonly error: unknown) {}

  toDto(): ContractTradeFailureDto {
    if (this.error instanceof BackendUnreachableError) {
      return new ContractTradeFailureDto(UNREACHABLE_MESSAGE, true)
    }

    if (this.error instanceof BackendServerError) {
      return new ContractTradeFailureDto(SERVER_FAILURE_MESSAGE, false)
    }

    const carriedMessage = MESSAGE_CARRYING_ERRORS.some(errorClass => this.error instanceof errorClass)
      ? (this.error as Error).message
      : UNEXPECTED_MESSAGE

    return new ContractTradeFailureDto(carriedMessage, false)
  }
}
