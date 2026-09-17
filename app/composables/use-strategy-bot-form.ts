import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'

/** 一台新機器人的預設觸發間隔。五分鐘：夠密、又不會密到每一輪都讀到同一根。 */
const DEFAULT_TRIGGER_INTERVAL_MINUTES = 5

/**
 * 機器人表單的狀態與每一個改得動它的動作。
 *
 * 它只剩四格，因為一台機器人只剩四件事：叫什麼、照哪一份交易策略跑、盯哪一個市場、
 * 多久醒一次。拼規則的那一整塊搬去 useTradingStrategyForm 了——
 * 那是坐下來慢慢調的事，與填三格就走的事分在兩個時刻，也分在兩個畫面。
 *
 * 規則本身一句都不在這裡：送不送得出去問 StrategyBotWriteDomain。
 */
export function useStrategyBotForm(editing: () => StrategyBotDto | null) {
  const name = ref('')
  const symbol = ref('')
  const tradingStrategyId = ref(0)
  const triggerIntervalText = ref(String(DEFAULT_TRIGGER_INTERVAL_MINUTES))

  const triggerIntervalMinutes = computed(() => {
    const parsed = Number(triggerIntervalText.value)

    return Number.isFinite(parsed) ? parsed : 0
  })

  const rejection = computed(() => new StrategyBotWriteDomain(buildWriteDto()).rejection)

  function buildWriteDto(): StrategyBotWriteDto {
    return new StrategyBotWriteDto(
      editing()?.id,
      name.value,
      symbol.value,
      tradingStrategyId.value,
      triggerIntervalMinutes.value,
    )
  }

  /** 送不出去時回 null——擋下來的那一句已經在 rejection 裡說了。 */
  function toWriteDto(): StrategyBotWriteDto | null {
    const writeDto = buildWriteDto()

    return new StrategyBotWriteDomain(writeDto).isSendable ? writeDto : null
  }

  /** 每次打開都重來一次：改到一半離開再回來，看到的應該是庫裡那一台。 */
  function reset() {
    const loaded = editing()

    name.value = loaded?.name ?? ''
    symbol.value = loaded?.symbol ?? ''
    tradingStrategyId.value = loaded?.tradingStrategyId ?? 0
    triggerIntervalText.value = String(
      loaded?.triggerIntervalMinutes ?? DEFAULT_TRIGGER_INTERVAL_MINUTES)
  }

  return {
    name,
    symbol,
    tradingStrategyId,
    triggerIntervalText,
    rejection,
    reset,
    toWriteDto,
  }
}
