import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { TradePlanInputDto } from '~/domain/models/dto/trade-plan-input-dto'
import { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import { SpotTradeFillAmendmentDto } from '~/domain/models/dto/spot-trade-fill-amendment-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { TradeRecordNotFoundError } from '~/domain/errors/trade-record-not-found-error'

export function useSpotTradeDetail(
  tradeId: () => number,
  spotTradeJournalApplication: SpotTradeJournalApplication = useNuxtApp().$spotTradeJournalApplication,
  tradeJournalSettingApplication: TradeJournalSettingApplication = useNuxtApp().$tradeJournalSettingApplication,
) {
  const record = ref<SpotTradeRecordDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)
  const notFound = ref(false)
  const pricePath = ref<TradePricePathDto | null>(null)
  const pricePathLoading = ref(false)
  const pricePathFailureMessage = ref<string | null>(null)
  const actionFailureMessage = ref<string | null>(null)
  const busy = ref(false)
  const mistakeTags = ref<TradeTagDto[]>([])
  const setupTags = ref<TradeTagDto[]>([])

  async function loadPricePath(loadedRecord: SpotTradeRecordDto): Promise<void> {
    pricePathLoading.value = true
    pricePathFailureMessage.value = null

    try {
      pricePath.value = await spotTradeJournalApplication.getPricePath(loadedRecord)
    }
    catch (error: unknown) {
      pricePath.value = null
      pricePathFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
    finally {
      pricePathLoading.value = false
    }
  }

  async function loadTrade(): Promise<void> {
    loading.value = true
    failureMessage.value = null
    notFound.value = false

    try {
      const [loadedRecord, tagGroups] = await Promise.all([
        spotTradeJournalApplication.getTrade(tradeId()),
        tradeJournalSettingApplication.listTagGroups(),
      ])
      record.value = loadedRecord
      mistakeTags.value = tagGroups.filter(group => group.kind === 'mistake').flatMap(group => group.tags)
      setupTags.value = tagGroups.filter(group => group.kind === 'setup').flatMap(group => group.tags)
      void loadPricePath(loadedRecord)
    }
    catch (error: unknown) {
      record.value = null
      notFound.value = error instanceof TradeRecordNotFoundError
      failureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  async function act(action: () => Promise<SpotTradeRecordDto>, redrawsPricePath = false): Promise<boolean> {
    if (busy.value) {
      return false
    }

    busy.value = true
    actionFailureMessage.value = null

    try {
      const savedRecord = await action()
      record.value = savedRecord
      if (redrawsPricePath) {
        void loadPricePath(savedRecord)
      }

      return true
    }
    catch (error: unknown) {
      actionFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
      notFound.value = error instanceof TradeRecordNotFoundError

      return false
    }
    finally {
      busy.value = false
    }
  }

  async function savePlan(
    plannedStopLossText: string,
    plannedTakeProfitText: string,
    entryReason: string,
    confidence: number | null,
  ): Promise<boolean> {
    return act(() => spotTradeJournalApplication.amendPlan(tradeId(), new TradePlanInputDto(
      plannedStopLossText, plannedTakeProfitText, entryReason, confidence)), true)
  }

  async function addNote(content: string): Promise<boolean> {
    if (content.trim() === '') {
      return false
    }

    return act(() => spotTradeJournalApplication.addNote(tradeId(), content))
  }

  async function writeReview(
    wentWell: string,
    wentWrong: string,
    nextTime: string,
    executionScore: number,
    mistakeTagIds: readonly number[],
  ): Promise<boolean> {
    return act(() => spotTradeJournalApplication.writeReview(tradeId(), new TradeReviewWriteDto(
      wentWell, wentWrong, nextTime, executionScore, [...mistakeTagIds])))
  }

  async function assignSetupTags(setupTagIds: readonly number[]): Promise<boolean> {
    return act(() => spotTradeJournalApplication.assignSetupTags(tradeId(), setupTagIds))
  }

  async function createSetupTag(name: string): Promise<void> {
    try {
      const created = await tradeJournalSettingApplication.createTag(new TradeTagWriteDto('setup', name))
      setupTags.value = [...setupTags.value, created]
      await assignSetupTags([...(record.value?.setupTags.map(tag => tag.id) ?? []), created.id])
    }
    catch (error: unknown) {
      actionFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
  }

  async function amendFill(fill: SpotTradeFillDto, priceText: string, quantityText: string, feeText: string): Promise<boolean> {
    return act(() => spotTradeJournalApplication.amendFill(
      tradeId(), new SpotTradeFillAmendmentDto(fill, priceText, quantityText, feeText)), true)
  }

  async function removeFill(fillId: number): Promise<boolean> {
    return act(() => spotTradeJournalApplication.removeFill(tradeId(), fillId), true)
  }

  async function deleteTrade(): Promise<boolean> {
    if (busy.value) {
      return false
    }

    busy.value = true
    actionFailureMessage.value = null

    try {
      await spotTradeJournalApplication.deleteTrade(tradeId())

      return true
    }
    catch (error: unknown) {
      actionFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message

      return false
    }
    finally {
      busy.value = false
    }
  }

  function adoptSavedRecord(savedRecord: SpotTradeRecordDto): void {
    record.value = savedRecord
    void loadPricePath(savedRecord)
  }

  return {
    record,
    loading,
    failureMessage,
    notFound,
    pricePath,
    pricePathLoading,
    pricePathFailureMessage,
    actionFailureMessage,
    busy,
    mistakeTags,
    setupTags,
    loadTrade,
    savePlan,
    addNote,
    writeReview,
    assignSetupTags,
    createSetupTag,
    amendFill,
    removeFill,
    deleteTrade,
    adoptSavedRecord,
  }
}
