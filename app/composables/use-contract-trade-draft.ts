import type { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import { ContractTradeDraftFillInputDto } from '~/domain/models/dto/contract-trade-draft-fill-input-dto'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { ContractTradeFormField } from '~/domain/models/vo/contract-trade-form-field-vo'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { ContractTradeOpenPositionExistsError } from '~/domain/errors/contract-trade-open-position-exists-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { formatMinuteInputInTimeZone, parseMinuteInputInTimeZone } from '~/utilities/time-zone-format'

const JOURNAL_LINK_NOT_FOUND_MESSAGE = '找不到這一輪的建議（可能已不在紀錄中），請手動填寫。'

export function useContractTradeDraft(
  options: {
    timeZoneIdentifier: () => string
    existingRecord: () => ContractTradeRecordDto | null
  },
  contractTradeJournalApplication: ContractTradeJournalApplication = useNuxtApp().$contractTradeJournalApplication,
  tradeJournalSettingApplication: TradeJournalSettingApplication = useNuxtApp().$tradeJournalSettingApplication,
  tradingStrategyApplication: TradingStrategyApplication = useNuxtApp().$tradingStrategyApplication,
) {
  const existingRecord = options.existingRecord
  let nextFillKey = 0

  const setting = ref(new TradeJournalSettingDto(null, null, false, ''))
  const tradingStrategies = ref<TradingStrategyDto[]>([])
  const setupTags = ref<TradeTagDto[]>([])
  const referenceFailureMessage = ref<string | null>(null)

  const symbol = ref('')
  const direction = ref<ContractTradeDirection>('long')
  const leverageText = ref('')
  const plannedStopLossText = ref('')
  const plannedTakeProfitText = ref('')
  const entryReason = ref('')
  const confidence = ref<number | null>(null)
  const tradingStrategyId = ref<number | null>(null)
  const setupTagIds = ref<number[]>([])
  const fills = ref<ContractTradeDraftFillInputDto[]>([])
  const journalLinkIdentifier = ref<string | null>(null)

  const prefill = ref<ContractTradePrefillDto | null>(null)
  const prefillLoading = ref(false)
  const prefillMessage = ref<string | null>(null)
  const prefillFailed = ref(false)

  const saving = ref(false)
  const rejectionMessage = ref<string | null>(null)
  const rejectedField = ref<ContractTradeFormField | null>(null)
  const conflictingTradeId = ref<number | null>(null)
  const recordedTradeId = ref<number | null>(null)

  function newFill(kind: ContractTradeFillKind, priceText = '', quantityText = ''): ContractTradeDraftFillInputDto {
    nextFillKey += 1

    return new ContractTradeDraftFillInputDto(
      nextFillKey,
      kind,
      formatMinuteInputInTimeZone(new Date(), options.timeZoneIdentifier()),
      priceText,
      quantityText,
      'taker',
      '')
  }

  function toDraftDto(): ContractTradeDraftDto {
    return new ContractTradeDraftDto(
      symbol.value,
      direction.value,
      leverageText.value,
      fills.value.map((fill) => {
        const filledAt = parseMinuteInputInTimeZone(fill.filledAtText, options.timeZoneIdentifier())

        return new ContractTradeDraftFillDto(
          fill.kind,
          Number.isNaN(filledAt.getTime()) ? null : filledAt,
          fill.priceText,
          fill.quantityText,
          fill.liquidity,
          fill.feeText)
      }),
      plannedStopLossText.value,
      plannedTakeProfitText.value,
      entryReason.value,
      confidence.value,
      tradingStrategyId.value,
      [...setupTagIds.value],
      journalLinkIdentifier.value,
    )
  }

  fills.value = [newFill('entry')]
  const initialDraft = ref(toDraftDto())

  const preview = computed(() => contractTradeJournalApplication.previewDraft(
    toDraftDto(), setting.value, existingRecord()?.fills ?? null))
  const dirty = computed(() => contractTradeJournalApplication.draftDiffers(
    toDraftDto(), initialDraft.value, setting.value))

  const prefilledFields = computed(() => new Set(prefill.value === null
    ? []
    : contractTradeJournalApplication.prefilledDraftFields(toDraftDto(), setting.value, prefill.value)))

  async function loadReferenceData(): Promise<void> {
    referenceFailureMessage.value = null

    try {
      const [loadedSetting, loadedStrategies, loadedTagGroups] = await Promise.all([
        tradeJournalSettingApplication.getSetting(),
        tradingStrategyApplication.listTradingStrategiesFollowableBy('contractKCandle'),
        tradeJournalSettingApplication.listTagGroups(),
      ])
      setting.value = loadedSetting
      tradingStrategies.value = loadedStrategies
      setupTags.value = loadedTagGroups.filter(group => group.kind === 'setup').flatMap(group => group.tags)
    }
    catch (error: unknown) {
      referenceFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
  }

  async function applyJournalLink(identifier: string): Promise<ContractTradePrefillDto | null> {
    prefillLoading.value = true
    prefillMessage.value = null
    prefillFailed.value = false

    try {
      const loadedPrefill = await contractTradeJournalApplication.openJournalLink(identifier)
      prefill.value = loadedPrefill
      prefillMessage.value = loadedPrefill.notice
      journalLinkIdentifier.value = existingRecord() === null ? loadedPrefill.journalLinkIdentifier : null
      if (existingRecord() === null) {
        symbol.value = loadedPrefill.symbol
        direction.value = loadedPrefill.direction
        leverageText.value = loadedPrefill.leverage.toString()
        plannedStopLossText.value = loadedPrefill.plannedStopLossPrice?.toString() ?? ''
        plannedTakeProfitText.value = loadedPrefill.plannedTakeProfitPrice?.toString() ?? ''
        tradingStrategyId.value = loadedPrefill.tradingStrategyId
      }
      fills.value = [newFill(
        'entry', loadedPrefill.entryPrice?.toString() ?? '', loadedPrefill.quantity?.toString() ?? '')]
      initialDraft.value = toDraftDto()

      return loadedPrefill
    }
    catch (error: unknown) {
      const failure = contractTradeJournalApplication.describeFailure(error)
      prefillFailed.value = failure.unreachable
      prefillMessage.value = error instanceof JournalLinkNotFoundError
        ? JOURNAL_LINK_NOT_FOUND_MESSAGE
        : failure.message

      return null
    }
    finally {
      prefillLoading.value = false
    }
  }

  function addFill(kind: ContractTradeFillKind): void {
    fills.value = [...fills.value, newFill(kind)]
  }

  function removeFill(key: number): void {
    fills.value = fills.value.filter(fill => fill.key !== key)
  }

  function fieldError(field: ContractTradeFormField): string | null {
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
      rejectionMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
  }

  async function save(): Promise<ContractTradeRecordDto | null> {
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
        ? await contractTradeJournalApplication.recordDraft(toDraftDto(), setting.value)
        : await contractTradeJournalApplication.addDraftFills(record.id, toDraftDto(), setting.value, record.fills)
      initialDraft.value = toDraftDto()

      return saved
    }
    catch (error: unknown) {
      rejectionMessage.value = contractTradeJournalApplication.describeFailure(error).message
      if (error instanceof ContractTradeRejectedError) {
        rejectedField.value = error.formField?.field ?? null
        recordedTradeId.value = error.recordedTradeId
      }
      if (error instanceof ContractTradeOpenPositionExistsError) {
        conflictingTradeId.value = error.existingTradeId
      }

      return null
    }
    finally {
      saving.value = false
    }
  }

  return {
    setting,
    tradingStrategies,
    setupTags,
    referenceFailureMessage,
    symbol,
    direction,
    leverageText,
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
    prefillFailed,
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
