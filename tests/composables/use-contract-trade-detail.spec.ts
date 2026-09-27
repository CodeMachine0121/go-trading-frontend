// @vitest-environment nuxt
import Decimal from 'decimal.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { ContractTradeReview } from '~/domain/models/entities/contract-trade-review'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { ContractTradeNotFoundError } from '~/domain/errors/contract-trade-not-found-error'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'
import type { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { buildRecord, contractTradeRecordProxyMock, kCandleContractProxyMock, tradingStrategyProxyMock } from '../fixtures/contract-trade-journal'

const recordProxy = contractTradeRecordProxyMock()
const kCandleContractProxy = kCandleContractProxyMock()
const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }

function detailUnderTest(tradeId = 27) {
  return useContractTradeDetail(
    () => tradeId,
    new ContractTradeJournalApplication(new ContractTradeJournalService(
      recordProxy as unknown as IContractTradeRecordProxy,
      tradingStrategyProxyMock() as unknown as ITradingStrategyProxy,
      kCandleContractProxy as unknown as IKCandleContractProxy)),
    new TradeJournalSettingApplication(new TradeJournalSettingService(
      settingProxy as unknown as ITradeJournalSettingProxy, tagProxy as unknown as ITradeTagProxy)),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  recordProxy.findTrade.mockResolvedValue(buildRecord({ status: 'open', closedAt: null }))
  tagProxy.listTags.mockResolvedValue([new TradeTag(1, 'setup', '突破'), new TradeTag(2, 'mistake', '提早出場')])
  kCandleContractProxy.findKCandleContractSeries.mockResolvedValue(new KCandleContractSeriesVo([], { value: '1m' } as never))
})

describe('useContractTradeDetail：讀取', () => {
  it('讀進這一筆、兩類標籤，計畫欄位填好，接著讀價格路徑', async () => {
    const detail = detailUnderTest()

    await detail.loadTrade()

    expect(detail.record.value?.id).toBe(27)
    expect(detail.planStopLossText.value).toBe('96380')
    expect(detail.planEntryReason.value).toBe('4H 收在前高之上')
    expect(detail.mistakeTags.value.map(tag => tag.name)).toEqual(['提早出場'])
    expect(detail.setupTags.value.map(tag => tag.name)).toEqual(['突破'])
    expect(detail.reviewMistakeTagIds.value).toEqual([2])
    await vi.waitFor(() => expect(detail.pricePath.value?.emptyMessage).toBe('沒有行情資料，無法計算'))
  })

  it('已檢討的交易帶回檢討內容', async () => {
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      status: 'reviewed', review: new ContractTradeReview('照計畫', '提早出場', '讓止盈成交', 4, new Date()),
      plannedStopLossPrice: null, plannedTakeProfitPrice: null,
    }))
    const detail = detailUnderTest()

    await detail.loadTrade()

    expect(detail.reviewWentWrong.value).toBe('提早出場')
    expect(detail.reviewExecutionScore.value).toBe(4)
    expect(detail.planStopLossText.value).toBe('')
  })

  it('價格路徑讀不到只影響圖', async () => {
    kCandleContractProxy.findKCandleContractSeries.mockRejectedValue(new BackendUnreachableError('http://x'))
    const detail = detailUnderTest()

    await detail.loadTrade()

    await vi.waitFor(() => expect(detail.pricePathFailureMessage.value).toContain('連不上'))
    expect(detail.record.value).not.toBeNull()
  })

  it('別人的或已刪除的交易說找不到', async () => {
    recordProxy.findTrade.mockRejectedValue(new ContractTradeNotFoundError('找不到這筆交易'))
    const detail = detailUnderTest(9)

    await detail.loadTrade()

    expect(detail.notFound.value).toBe(true)
    expect(detail.failureMessage.value).toBe('找不到這筆交易')
    expect(detail.record.value).toBeNull()
  })
})

describe('useContractTradeDetail：寫入', () => {
  it('修改計畫送出讀得懂的數字，讀不懂的當作沒有', async () => {
    recordProxy.amendPlan.mockResolvedValue(buildRecord({ status: 'open' }))
    const detail = detailUnderTest()
    await detail.loadTrade()
    detail.planStopLossText.value = '96300'
    detail.planTakeProfitText.value = 'abc'
    detail.planConfidence.value = 4

    expect(await detail.savePlan()).toBe(true)

    const [, planWriteDto] = recordProxy.amendPlan.mock.calls[0] as [number, ContractTradePlanWriteDto]
    expect(planWriteDto.plannedStopLossPrice?.toString()).toBe('96300')
    expect(planWriteDto.plannedTakeProfitPrice).toBeNull()
    expect(planWriteDto.confidence).toBe(4)
  })

  it('平倉後修改計畫的拒絕原話呈現', async () => {
    recordProxy.amendPlan.mockRejectedValue(new ContractTradeRejectedError('平倉後計畫已鎖定，可以加附註', null))
    const detail = detailUnderTest()

    expect(await detail.savePlan()).toBe(false)
    expect(detail.actionFailureMessage.value).toBe('平倉後計畫已鎖定，可以加附註')
  })

  it('加附註後清空輸入；空白不送', async () => {
    recordProxy.addNote.mockResolvedValue(buildRecord())
    const detail = detailUnderTest()

    await detail.addNote()
    detail.noteText.value = '止損其實是 96,300'
    await detail.addNote()

    expect(recordProxy.addNote).toHaveBeenCalledTimes(1)
    expect(detail.noteText.value).toBe('')
  })

  it('加附註失敗時保留輸入', async () => {
    recordProxy.addNote.mockRejectedValue(new BackendUnreachableError('http://x'))
    const detail = detailUnderTest()
    detail.noteText.value = '附註'

    await detail.addNote()

    expect(detail.noteText.value).toBe('附註')
  })

  it('寫檢討送出評分與失誤標籤', async () => {
    recordProxy.writeReview.mockResolvedValue(buildRecord({ status: 'reviewed' }))
    const detail = detailUnderTest()
    detail.reviewWentWell.value = '照計畫'
    detail.reviewExecutionScore.value = 4
    detail.reviewMistakeTagIds.value = [2]

    expect(await detail.writeReview()).toBe(true)
    expect(recordProxy.writeReview).toHaveBeenCalledWith(27, expect.objectContaining({ executionScore: 4, mistakeTagIds: [2] }))
    expect(detail.record.value?.statusLabel).toBe('已檢討')
  })

  it('貼型態標籤；就地新增的標籤建好後一起貼上', async () => {
    recordProxy.assignSetupTags.mockResolvedValue(buildRecord())
    tagProxy.createTag.mockResolvedValue(new TradeTag(6, 'setup', '回踩'))
    const detail = detailUnderTest()
    await detail.loadTrade()

    await detail.assignSetupTags([1])
    await detail.createSetupTag('回踩')

    expect(recordProxy.assignSetupTags).toHaveBeenLastCalledWith(27, [1, 6])
    expect(detail.setupTags.value.map(tag => tag.name)).toEqual(['突破', '回踩'])
  })

  it('就地新增的標籤重名時原話呈現', async () => {
    tagProxy.createTag.mockRejectedValue(new TradeTagNameConflictError('已有同名的型態標籤'))
    const detail = detailUnderTest()

    await detail.createSetupTag('突破')

    expect(detail.actionFailureMessage.value).toBe('已有同名的型態標籤')
    expect(recordProxy.assignSetupTags).not.toHaveBeenCalled()
  })

  it('還沒讀到交易時新增標籤只貼新的那一個', async () => {
    recordProxy.assignSetupTags.mockResolvedValue(buildRecord())
    tagProxy.createTag.mockResolvedValue(new TradeTag(6, 'setup', '回踩'))
    const detail = detailUnderTest()

    await detail.createSetupTag('回踩')

    expect(recordProxy.assignSetupTags).toHaveBeenCalledWith(27, [6])
  })

  it('修正成交送出新的數字；讀不懂時不送', async () => {
    recordProxy.amendFill.mockResolvedValue(buildRecord({ status: 'open' }))
    const detail = detailUnderTest()
    await detail.loadTrade()
    const fill = detail.record.value!.fills[0]!

    expect(await detail.amendFill(fill, 'abc', '0.03', '')).toBe(false)
    expect(detail.actionFailureMessage.value).toBe('成交價與數量要填數字')
    expect(await detail.amendFill(fill, '97905', '0.03', '1.2')).toBe(true)

    const [, fillId, fillWriteDto] = recordProxy.amendFill.mock.calls[0] as [number, number, ContractTradeFillWriteDto]
    expect(fillId).toBe(1)
    expect(fillWriteDto.price.toString()).toBe('97905')
    expect(fillWriteDto.fee?.toString()).toBe('1.2')
  })

  it('刪除成交；刪到沒有進場成交時原話呈現', async () => {
    recordProxy.removeFill.mockResolvedValueOnce(buildRecord({ status: 'open' }))
    recordProxy.removeFill.mockRejectedValueOnce(new ContractTradeRejectedError('一筆交易至少要有一筆進場成交；要整筆放棄請刪除交易', null))
    const detail = detailUnderTest()

    expect(await detail.removeFill(3)).toBe(true)
    expect(await detail.removeFill(1)).toBe(false)
    expect(detail.actionFailureMessage.value).toContain('至少要有一筆進場成交')
  })

  it('動作進行中不接受下一個', async () => {
    recordProxy.removeFill.mockReturnValue(new Promise(() => {}))
    const detail = detailUnderTest()

    void detail.removeFill(3)

    expect(await detail.savePlan()).toBe(false)
    expect(await detail.deleteTrade()).toBe(false)
    expect(recordProxy.amendPlan).not.toHaveBeenCalled()
  })

  it('動作時發現交易已不在，標示找不到', async () => {
    recordProxy.writeReview.mockRejectedValue(new ContractTradeNotFoundError('找不到這筆交易'))
    const detail = detailUnderTest()

    await detail.writeReview()

    expect(detail.notFound.value).toBe(true)
  })

  it('刪除交易；失敗時說原因', async () => {
    recordProxy.deleteTrade.mockResolvedValueOnce(undefined)
    recordProxy.deleteTrade.mockRejectedValueOnce(new BackendUnreachableError('http://x'))
    const detail = detailUnderTest()

    expect(await detail.deleteTrade()).toBe(true)
    expect(await detail.deleteTrade()).toBe(false)
    expect(detail.actionFailureMessage.value).toContain('連不上')
  })

  it('從加成交表單存好的那一筆直接換上，並重讀價格路徑', async () => {
    const detail = detailUnderTest()

    detail.adoptSavedRecord(buildRecord({ status: 'closed', outcome: buildRecord().outcome, leverage: new Decimal(5) }).toDomain().toDto())

    expect(detail.record.value?.statusLabel).toBe('已平倉')
    await vi.waitFor(() => expect(kCandleContractProxy.findKCandleContractSeries).toHaveBeenCalled())
  })
})
