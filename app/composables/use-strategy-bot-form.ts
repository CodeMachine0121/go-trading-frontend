import Decimal from 'decimal.js'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { POSITION_SIZING_MODES } from '~/domain/models/vo/position-sizing-mode-vo'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'

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
export function useStrategyBotForm(
  editing: () => StrategyBotDto | null,
  /** 這一頁拼的是哪一種機器人，以及它的表單多不多一格槓桿。 */
  page: StrategyBotPageDto,
) {
  const name = ref('')
  const symbol = ref('')
  const tradingStrategyId = ref(0)
  const triggerIntervalText = ref(String(DEFAULT_TRIGGER_INTERVAL_MINUTES))

  /**
   * 那個區塊開著沒有——也就是**這一台要不要建議部位**。
   *
   * 它活在這裡而不在 write DTO 裡：DTO 只有「有一組」與 `null` 兩種，
   * 而再塞一個旗標進去就是讓兩個欄位可以互相矛盾（開著但沒有值、收著但有值），
   * 而矛盾的那一種沒有人說得出該聽誰的。
   */
  const suggestsPosition = ref(false)

  /** 那四格。金額與百分比都以文字持有，與觸發間隔同一套——輸入框給的就是字。 */
  const capitalText = ref('')
  const sizingMode = ref<PositionSizingMode>('allIn')
  const sizingValueText = ref('')
  const stopLossText = ref('')
  const takeProfitText = ref('')
  /** 合約機器人的槓桿倍數。留空即一倍；現貨機器人的表單上沒有這一格。 */
  const leverageText = ref('')

  /**
   * 押多少那一格旁邊要不要出現一格數字。問的是既有那個模型，不自己記——
   * 多一種不必填的模式時，自己記的那一版會安靜地繼續要求填數字。
   *
   * 連現在填著的數字一起交給它，而不是交一個湊出來的零：那個問題只讀模式，
   * 但交一個假的值進去，下一個人會以為它讀了。
   */
  const sizingRequiresValue = computed(() => new PositionSizingDomain(
    sizingMode.value, decimalOfText(sizingValueText.value)).requiresValue)

  /** 押多少挑得到的那三個，各自帶著名字與那一格叫什麼。也是既有那個模型答的。 */
  const sizingModeOptions = POSITION_SIZING_MODES.map(
    mode => new PositionSizingDomain(mode, new Decimal(0)).toOptionDto())

  /**
   * 這一台要送出去的那一組部位規劃，或 `null`。
   *
   * 區塊收著就是 `null`，而那一行就是「收起來就是不要」：
   * 使用者看得到的就是他要送的。
   *
   * 資金留空也是 `null`，而那是**後端的規則**（資金是這一組的開關）——
   * 這一側照它講，不替他補一個預設資金。
   */
  function buildPositionPlan(): PositionPlanDto | null {
    if (!suggestsPosition.value) {
      return null
    }

    const capital = decimalOfText(capitalText.value)
    // 大於零，不是 `isPositive()`：decimal.js 的零是**正的**（它的符號是 +），
    // 所以那個方法對「留空」會答 true，而留空正是「沒有部位規劃」的意思。
    if (!capital.greaterThan(0)) {
      return null
    }

    return new PositionPlanDto(
      capital,
      sizingMode.value,
      decimalOfText(sizingValueText.value),
      // 兩個距離留空即不設那一個出場，與後端讀法一致；留空不是「填了個零」。
      decimalOfText(stopLossText.value),
      decimalOfText(takeProfitText.value),
      // 留空即一倍，與交易服務的讀法一致；現貨機器人沒有這一格，一律 null。
      page.takesLeverage
        ? (String(leverageText.value).trim() === '' ? new Decimal(1) : decimalOfText(leverageText.value))
        : null,
    )
  }

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
      buildPositionPlan(),
      // 改一台時用它自己的種類——建立之後不得更換；新拼一台就是這一頁的那一種。
      editing()?.marketDataKind ?? page.marketDataKind,
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

    // 有值就展開：收著等於藏起來，而藏起來的值會在某天變成一個他不記得填過的數字。
    const positionPlan = loaded?.positionPlan ?? null
    suggestsPosition.value = positionPlan !== null
    capitalText.value = positionPlan?.capital.toString() ?? ''
    sizingMode.value = positionPlan?.sizingMode ?? 'allIn'
    sizingValueText.value = positionPlan?.sizingValue.toString() ?? ''
    stopLossText.value = positionPlan?.stopLossPercentage.toString() ?? ''
    takeProfitText.value = positionPlan?.takeProfitPercentage.toString() ?? ''
    leverageText.value = positionPlan?.leverage?.toString() ?? ''
  }

  return {
    name,
    symbol,
    tradingStrategyId,
    triggerIntervalText,
    suggestsPosition,
    capitalText,
    sizingMode,
    sizingValueText,
    sizingRequiresValue,
    sizingModeOptions,
    stopLossText,
    takeProfitText,
    leverageText,
    takesLeverage: page.takesLeverage,
    rejection,
    reset,
    toWriteDto,
  }
}

/**
 * 一格輸入當成精確小數。
 *
 * 收的是 `string | number`，因為數字輸入框的 `v-model` 兩種都給得出來——
 * 觸發間隔那一格早就在用 `Number(...)` 應付同一件事。宣告成只收字串的那一版
 * 在使用者第一次動那一格時就會炸。
 *
 * 空白讀作零而不是「不是數字」：那四格裡的空白都有意思（不設止損、不設止盈），
 * 而 `new Decimal('')` 會丟例外。真正打錯的字仍然是 NaN，由那幾條驗證擋下來。
 */
function decimalOfText(text: string | number): Decimal {
  const trimmed = String(text).trim()

  return trimmed === '' ? new Decimal(0) : new Decimal(Number(trimmed))
}
