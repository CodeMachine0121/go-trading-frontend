import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { SpotTradePrefillDto } from '~/domain/models/dto/spot-trade-prefill-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { SpotTradeDraftDto } from '~/domain/models/dto/spot-trade-draft-dto'
import { SpotTradeDraftFillDto } from '~/domain/models/dto/spot-trade-draft-fill-dto'
import { SpotTradeDraftFillInputDto } from '~/domain/models/dto/spot-trade-draft-fill-input-dto'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { formatMinuteInputInTimeZone, parseMinuteInputInTimeZone } from '~/utilities/time-zone-format'

const JOURNAL_LINK_NOT_FOUND_MESSAGE = '找不到這一輪。這一輪的建議已不在紀錄中，請手動填寫。'

export function useSpotTradeDraft(
  options: {
    timeZoneIdentifier: () => string
    existingRecord: () => SpotTradeRecordDto | null
    initialFillKind: () => SpotTradeFillKind
  },
  spotTradeJournalApplication: SpotTradeJournalApplication = useNuxtApp().$spotTradeJournalApplication,
  tradeJournalSettingApplication: TradeJournalSettingApplication = useNuxtApp().$tradeJournalSettingApplication,
  tradingStrategyApplication: TradingStrategyApplication = useNuxtApp().$tradingStrategyApplication,
) {
  const existingRecord = options.existingRecord
  let nextFillKey = 0

  const tradingStrategies = ref<TradingStrategyDto[]>([])
  const setupTags = ref<TradeTagDto[]>([])
  const referenceFailureMessage = ref<string | null>(null)

  const symbol = ref('')
  const market = ref<SpotTradeMarket | null>(existingRecord()?.market ?? null)
  const plannedStopLossText = ref('')
  const plannedTakeProfitText = ref('')
  const entryReason = ref('')
  const confidence = ref<number | null>(null)
  const tradingStrategyId = ref<number | null>(null)
  const setupTagIds = ref<number[]>([])
  const fills = ref<SpotTradeDraftFillInputDto[]>([])
  const journalLinkIdentifier = ref<string | null>(null)

  const prefill = ref<SpotTradePrefillDto | null>(null)
  const prefillLoading = ref(false)
  const prefillMessage = ref<string | null>(null)
  const prefillNotFound = ref(false)

  const saving = ref(false)
  const rejectionMessage = ref<string | null>(null)
  const rejectedField = ref<TradeFormField | null>(null)
  const conflictingTradeId = ref<number | null>(null)
  const recordedTradeId = ref<number | null>(null)

  function newFill(kind: SpotTradeFillKind, priceText = '', quantityText = ''): SpotTradeDraftFillInputDto {
    nextFillKey += 1

    return new SpotTradeDraftFillInputDto(
      nextFillKey, kind, formatMinuteInputInTimeZone(new Date(), options.timeZoneIdentifier()), priceText, quantityText, '')
  }

  function toDraftDto(): SpotTradeDraftDto {
    return new SpotTradeDraftDto(
      symbol.value,
      market.value,
      fills.value.map((fill) => {
        const filledAt = parseMinuteInputInTimeZone(fill.filledAtText, options.timeZoneIdentifier())

        return new SpotTradeDraftFillDto(
          fill.kind, Number.isNaN(filledAt.getTime()) ? null : filledAt, fill.priceText, fill.quantityText, fill.feeText)
      }),
      plannedStopLossText.value,
      plannedTakeProfitText.value,
      entryReason.value,
      confidence.value,
      tradingStrategyId.value,
      [...setupTagIds.value],
      journalLinkIdentifier.value,
      prefill.value?.signal === 'buy' ? prefill.value.price : null,
    )
  }

  fills.value = [newFill(options.initialFillKind())]
  const initialDraft = ref(toDraftDto())

  const preview = computed(() => spotTradeJournalApplication.previewDraft(toDraftDto(), existingRecord()?.fills ?? null))
  const dirty = computed(() => spotTradeJournalApplication.draftDiffers(toDraftDto(), initialDraft.value))
  const prefilledFields = computed(() => new Set(prefill.value === null
    ? []
    : spotTradeJournalApplication.prefilledDraftFields(toDraftDto(), prefill.value)))

  async function loadReferenceData(): Promise<void> {
    referenceFailureMessage.value = null

    try {
      const [loadedStrategies, loadedTagGroups] = await Promise.all([
        tradingStrategyApplication.listTradingStrategiesFollowableBy('kCandle'),
        tradeJournalSettingApplication.listTagGroups(),
      ])
      tradingStrategies.value = loadedStrategies
      setupTags.value = loadedTagGroups.filter(group => group.kind === 'setup').flatMap(group => group.tags)
    }
    catch (error: unknown) {
      referenceFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
  }

  async function applyJournalLink(identifier: string): Promise<SpotTradePrefillDto | null> {
    prefillLoading.value = true
    prefillMessage.value = null
    prefillNotFound.value = false

    try {
      const loadedPrefill = await spotTradeJournalApplication.openJournalLink(identifier)
      prefill.value = loadedPrefill
      prefillMessage.value = loadedPrefill.notice
      market.value = loadedPrefill.market
      journalLinkIdentifier.value = existingRecord() === null ? loadedPrefill.journalLinkIdentifier : null
      if (existingRecord() === null) {
        symbol.value = loadedPrefill.symbol
        plannedStopLossText.value = loadedPrefill.plannedStopLossPrice?.toString() ?? ''
        plannedTakeProfitText.value = loadedPrefill.plannedTakeProfitPrice?.toString() ?? ''
        tradingStrategyId.value = loadedPrefill.tradingStrategyId
      }
      const fillKind = existingRecord() === null ? 'buy' : loadedPrefill.signal
      fills.value = [newFill(fillKind, loadedPrefill.price?.toString() ?? '', loadedPrefill.quantity?.toString() ?? '')]
      initialDraft.value = toDraftDto()

      return loadedPrefill
    }
    catch (error: unknown) {
      prefillNotFound.value = error instanceof JournalLinkNotFoundError
      prefillMessage.value = prefillNotFound.value
        ? JOURNAL_LINK_NOT_FOUND_MESSAGE
        : spotTradeJournalApplication.describeFailure(error).message

      return null
    }
    finally {
      prefillLoading.value = false
    }
  }

  function addFill(kind: SpotTradeFillKind): void {
    fills.value = [...fills.value, newFill(kind)]
  }

  function removeFill(key: number): void {
    fills.value = fills.value.filter(fill => fill.key !== key)
  }

  function fieldError(field: TradeFormField): string | null {
    return rejectedField.value === field ? rejectionMessage.value : null
  }

  async function createSetupTag(name: string): Promise<void> {
    try {
      const created = await tradeJournalSettingApplication.createTag(new TradeTagWriteDto('setup', name))
      setupTags.value = [...setupTags.value, created]
      setupTagIds.value = [...setupTagIds.value, created.id]
    }
    catch (error: unknown) {
      rejectedField.value = null
      rejectionMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
  }

  async function save(): Promise<SpotTradeRecordDto | null> {
    if (saving.value || prefillLoading.value) {
      return null
    }

    saving.value = true
    rejectionMessage.value = null
    rejectedField.value = null
    conflictingTradeId.value = null
    recordedTradeId.value = null

    try {
      const record = existingRecord()
      const saved = record === null
        ? await spotTradeJournalApplication.recordDraft(toDraftDto())
        : await spotTradeJournalApplication.addDraftFills(record.id, toDraftDto(), record.fills)
      initialDraft.value = toDraftDto()

      return saved
    }
    catch (error: unknown) {
      rejectionMessage.value = spotTradeJournalApplication.describeFailure(error).message
      if (error instanceof TradeRejectedError) {
        rejectedField.value = error.formField?.field ?? null
        recordedTradeId.value = error.recordedTradeId
      }
      if (error instanceof TradeAlreadyOpenError) {
        conflictingTradeId.value = error.existingTradeId
      }

      return null
    }
    finally {
      saving.value = false
    }
  }

  return {
    tradingStrategies,
    setupTags,
    referenceFailureMessage,
    symbol,
    market,
    plannedStopLossText,
    plannedTakeProfitText,
    entryReason,
    confidence,
    tradingStrategyId,
    setupTagIds,
    fills,
    prefill,
    prefillLoading,
    prefillMessage,
    prefillNotFound,
    prefilledFields,
    preview,
    dirty,
    saving,
    rejectionMessage,
    rejectedField,
    conflictingTradeId,
    recordedTradeId,
    loadReferenceData,
    applyJournalLink,
    addFill,
    removeFill,
    fieldError,
    createSetupTag,
    save,
  }
}
