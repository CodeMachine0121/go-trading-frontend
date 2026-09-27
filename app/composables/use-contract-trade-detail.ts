import Decimal from 'decimal.js'
import type { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradePricePathDto } from '~/domain/models/dto/contract-trade-price-path-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import { ContractTradeReviewWriteDto } from '~/domain/models/dto/contract-trade-review-write-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { ContractTradeNotFoundError } from '~/domain/errors/contract-trade-not-found-error'

export function useContractTradeDetail(
  tradeId: () => number,
  contractTradeJournalApplication: ContractTradeJournalApplication = useNuxtApp().$contractTradeJournalApplication,
  tradeJournalSettingApplication: TradeJournalSettingApplication = useNuxtApp().$tradeJournalSettingApplication,
) {
  const record = ref<ContractTradeRecordDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)
  const notFound = ref(false)
  const pricePath = ref<ContractTradePricePathDto | null>(null)
  const pricePathLoading = ref(false)
  const pricePathFailureMessage = ref<string | null>(null)
  const actionFailureMessage = ref<string | null>(null)
  const busy = ref(false)
  const mistakeTags = ref<TradeTagDto[]>([])
  const setupTags = ref<TradeTagDto[]>([])

  const planStopLossText = ref('')
  const planTakeProfitText = ref('')
  const planEntryReason = ref('')
  const planConfidence = ref<number | null>(null)
  const noteText = ref('')
  const reviewWentWell = ref('')
  const reviewWentWrong = ref('')
  const reviewNextTime = ref('')
  const reviewExecutionScore = ref(3)
  const reviewMistakeTagIds = ref<number[]>([])

  function adopt(loadedRecord: ContractTradeRecordDto): void {
    record.value = loadedRecord
    planStopLossText.value = loadedRecord.plannedStopLossPrice?.toString() ?? ''
    planTakeProfitText.value = loadedRecord.plannedTakeProfitPrice?.toString() ?? ''
    planEntryReason.value = loadedRecord.entryReason
    planConfidence.value = loadedRecord.confidence
    reviewWentWell.value = loadedRecord.review?.wentWell ?? ''
    reviewWentWrong.value = loadedRecord.review?.wentWrong ?? ''
    reviewNextTime.value = loadedRecord.review?.nextTime ?? ''
    reviewExecutionScore.value = loadedRecord.review?.executionScore ?? 3
    reviewMistakeTagIds.value = loadedRecord.mistakeTags.map(tag => tag.id)
  }

  async function loadPricePath(loadedRecord: ContractTradeRecordDto): Promise<void> {
    pricePathLoading.value = true
    pricePathFailureMessage.value = null

    try {
      pricePath.value = await contractTradeJournalApplication.getPricePath(loadedRecord)
    }
    catch (error: unknown) {
      pricePath.value = null
      pricePathFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
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
        contractTradeJournalApplication.getTrade(tradeId()),
        tradeJournalSettingApplication.listTagGroups(),
      ])
      adopt(loadedRecord)
      mistakeTags.value = tagGroups.filter(group => group.kind === 'mistake').flatMap(group => group.tags)
      setupTags.value = tagGroups.filter(group => group.kind === 'setup').flatMap(group => group.tags)
      void loadPricePath(loadedRecord)
    }
    catch (error: unknown) {
      record.value = null
      notFound.value = error instanceof ContractTradeNotFoundError
      failureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  async function act(action: () => Promise<ContractTradeRecordDto>): Promise<boolean> {
    if (busy.value) {
      return false
    }

    busy.value = true
    actionFailureMessage.value = null

    try {
      adopt(await action())

      return true
    }
    catch (error: unknown) {
      actionFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
      notFound.value = error instanceof ContractTradeNotFoundError

      return false
    }
    finally {
      busy.value = false
    }
  }

  function decimalOrNull(text: string): Decimal | null {
    const trimmed = text.trim()

    return trimmed === '' || Number.isNaN(Number(trimmed)) ? null : new Decimal(trimmed)
  }

  async function savePlan(): Promise<boolean> {
    return act(() => contractTradeJournalApplication.amendPlan(tradeId(), new ContractTradePlanWriteDto(
      decimalOrNull(planStopLossText.value),
      decimalOrNull(planTakeProfitText.value),
      planEntryReason.value,
      planConfidence.value)))
  }

  async function addNote(): Promise<void> {
    if (noteText.value.trim() === '') {
      return
    }

    if (await act(() => contractTradeJournalApplication.addNote(tradeId(), noteText.value))) {
      noteText.value = ''
    }
  }

  async function writeReview(): Promise<boolean> {
    return act(() => contractTradeJournalApplication.writeReview(tradeId(), new ContractTradeReviewWriteDto(
      reviewWentWell.value,
      reviewWentWrong.value,
      reviewNextTime.value,
      reviewExecutionScore.value,
      [...reviewMistakeTagIds.value])))
  }

  async function assignSetupTags(setupTagIds: readonly number[]): Promise<boolean> {
    return act(() => contractTradeJournalApplication.assignSetupTags(tradeId(), setupTagIds))
  }

  async function createSetupTag(name: string): Promise<void> {
    try {
      const created = await tradeJournalSettingApplication.createTag(new TradeTagWriteDto('setup', name))
      setupTags.value = [...setupTags.value, created]
      await assignSetupTags([...(record.value?.setupTags.map(tag => tag.id) ?? []), created.id])
    }
    catch (error: unknown) {
      actionFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
  }

  async function amendFill(fill: ContractTradeFillDto, priceText: string, quantityText: string, feeText: string): Promise<boolean> {
    const price = decimalOrNull(priceText)
    const quantity = decimalOrNull(quantityText)
    if (price === null || quantity === null) {
      actionFailureMessage.value = '成交價與數量要填數字'

      return false
    }

    return act(() => contractTradeJournalApplication.amendFill(tradeId(), fill.id, new ContractTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, fill.liquidity, decimalOrNull(feeText))))
  }

  async function removeFill(fillId: number): Promise<boolean> {
    return act(() => contractTradeJournalApplication.removeFill(tradeId(), fillId))
  }

  async function deleteTrade(): Promise<boolean> {
    if (busy.value) {
      return false
    }

    busy.value = true
    actionFailureMessage.value = null

    try {
      await contractTradeJournalApplication.deleteTrade(tradeId())

      return true
    }
    catch (error: unknown) {
      actionFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message

      return false
    }
    finally {
      busy.value = false
    }
  }

  function adoptSavedRecord(savedRecord: ContractTradeRecordDto): void {
    adopt(savedRecord)
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
    planStopLossText,
    planTakeProfitText,
    planEntryReason,
    planConfidence,
    noteText,
    reviewWentWell,
    reviewWentWrong,
    reviewNextTime,
    reviewExecutionScore,
    reviewMistakeTagIds,
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
