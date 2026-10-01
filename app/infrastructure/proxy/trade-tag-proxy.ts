import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import type { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { TradeTagNotFoundError } from '~/domain/errors/trade-tag-not-found-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { BackendRequestBody } from '~/infrastructure/proxy/backend-api-proxy'

const TRADE_TAGS_ENDPOINT = '/users/me/trade-tags'
const NOT_FOUND_STATUS = 404
const CONFLICT_STATUS = 409
// translation-exempt: 比對後端回覆原文裡的字，不是畫面上的話
const IN_USE_HINT = '貼著'

type TradeTagWire = { id: number, kind: string, name: string }

export class TradeTagProxy extends BackendApiProxy implements ITradeTagProxy {
  async listTags(): Promise<TradeTag[]> {
    const tagsWire = await this.requestBackend<TradeTagWire[]>(TRADE_TAGS_ENDPOINT)

    return (tagsWire ?? []).map(tagWire => this.toTag(tagWire))
  }

  async createTag(writeDto: TradeTagWriteDto): Promise<TradeTag> {
    return this.requestTag(TRADE_TAGS_ENDPOINT, 'POST', { kind: writeDto.kind, name: writeDto.name })
  }

  async renameTag(id: number, name: string): Promise<TradeTag> {
    return this.requestTag(`${TRADE_TAGS_ENDPOINT}/${id}`, 'PUT', { name })
  }

  async deleteTag(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${TRADE_TAGS_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.tagFailureOf(error)
    }
  }

  private async requestTag(path: string, method: 'POST' | 'PUT', body: BackendRequestBody): Promise<TradeTag> {
    try {
      return this.toTag(await this.requestBackend<TradeTagWire>(path, { method, body }))
    }
    catch (error: unknown) {
      throw this.tagFailureOf(error)
    }
  }

  private tagFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      return new TradeTagNotFoundError(error.message, { cause: error })
    }

    if (error.status === CONFLICT_STATUS) {
      return error.message.includes(IN_USE_HINT)
        ? new TradeTagInUseError(error.message, { cause: error })
        : new TradeTagNameConflictError(error.message, { cause: error })
    }

    return error
  }

  private toTag(tagWire: TradeTagWire): TradeTag {
    return new TradeTag(tagWire.id, tagWire.kind as TradeTagKind, tagWire.name)
  }
}
