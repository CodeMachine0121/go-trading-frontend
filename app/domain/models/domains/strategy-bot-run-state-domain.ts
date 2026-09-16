import type { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import {
  STRATEGY_BOT_HALT_REASONS,
  STRATEGY_BOT_HALT_REASON_LABELS,
} from '~/domain/models/vo/strategy-bot-halt-reason-vo'

/**
 * Domain Model：一台機器人在清單上該長什麼樣。
 *
 * 它把四件事收在一起——四種狀態哪一種、停擺原因怎麼講、播放還是停止、編輯給不給按——
 * 因為那四件事**都是同一個東西的四種讀法**：這台機器人現在在做什麼。
 * 散在元件的 `v-if` 裡的話，總有一天會出現「顯示已停止、卻還給按停止」這種組合。
 */
export class StrategyBotRunStateDomain {
  constructor(private readonly strategyBot: StrategyBot) {}

  /**
   * 這四件事算完之後交出去的那一份。
   *
   * 元件拿到的是結論而不是狀態字串——那是「元件只看得到 DTO」這條規則真正的用處：
   * 它讓「顯示已停止、卻還給按停止」這種組合沒有地方可以生出來。
   */
  toDto(): StrategyBotRunStateDto {
    return new StrategyBotRunStateDto(
      this.isRunning,
      this.isHalted,
      this.isConflicting,
      this.statusLabel,
      this.statusTone,
      this.haltReasonLabel,
      this.lastSentSignalLabel,
      this.canStart,
      this.canStop,
      this.canEdit,
      this.editBlockedReason,
    )
  }

  /** 它現在在跑嗎。 */
  get isRunning(): boolean {
    return this.strategyBot.runState === 'running'
  }

  /** 它是被系統自己停下來的嗎——與被擁有者按停止是兩件事。 */
  get isHalted(): boolean {
    return !this.isRunning && this.knownHaltReason !== null
  }

  /**
   * 認得出來的停擺原因，認不得的一律當成沒有。
   *
   * 原樣傳給畫面的話，一個後端新增的第五種原因會顯示成一格空白——
   * 而空白在這份清單上的意思是「這台沒事」，那是最糟的一種誤讀。
   */
  private get knownHaltReason(): StrategyBotHaltReasonVo | null {
    return STRATEGY_BOT_HALT_REASONS.find(
      known => known === this.strategyBot.haltReason) ?? null
  }

  /**
   * 上一輪兩個條件同時成立。
   *
   * 它**不是停擺**：機器人還在跑。但它代表這台機器人現在什麼都不會說，
   * 而且會一直不說下去——所以它與執行中一起顯示，不是取代它。
   */
  get isConflicting(): boolean {
    return this.strategyBot.conflicting
  }

  /** 狀態標籤上的字。停擺時說的是停擺，因為那才是使用者要處理的那件事。 */
  get statusLabel(): string {
    if (this.isHalted) {
      return '停擺'
    }

    return this.isRunning ? '執行中' : '已停止'
  }

  /**
   * 狀態標籤該用什麼語氣。
   *
   * **它是規則不是樣式**——「停擺要比已停止更醒目」是這份清單存在的理由，
   * 不是一個配色偏好。由 domain 決定而不是由元件判斷狀態字串，
   * 是為了讓那條規則只有一個地方可以改。
   */
  get statusTone(): 'success' | 'danger' | 'neutral' {
    if (this.isHalted) {
      return 'danger'
    }

    return this.isRunning ? 'success' : 'neutral'
  }

  /** 停擺原因那一句。沒有停擺時是空字串。 */
  get haltReasonLabel(): string {
    const haltReason = this.knownHaltReason

    return haltReason === null ? '' : STRATEGY_BOT_HALT_REASON_LABELS[haltReason]
  }

  /**
   * 上一次送出的信號那一格。
   *
   * 沒送過時給的是一句話而不是空白：空白在這份清單上讀起來像「這一欄壞了」，
   * 而「還沒送出過」是一個明確、而且完全正常的狀態。
   */
  get lastSentSignalLabel(): string {
    switch (this.strategyBot.lastSentSignal) {
      case 'buy':
        return '買入'
      case 'sell':
        return '賣出'
      case 'hold':
        return '持有'
      default:
        return '還沒送出過'
    }
  }

  /** 現在該給的是停止鍵還是播放鍵——一台機器人只有兩種狀態，所以只給得出一顆。 */
  get canStart(): boolean {
    return !this.isRunning
  }

  get canStop(): boolean {
    return this.isRunning
  }

  /**
   * 編輯給不給按。
   *
   * 執行中不給按，而不是按了之後被後端拒絕：一台正在跑的機器人在半途換掉條件，
   * 沒有人說得出它那一輪用的是哪一版——而這件事畫面早就看得出來了，
   * 留到送出才講等於讓使用者白填一次表單。
   */
  get canEdit(): boolean {
    return !this.isRunning
  }

  /** 編輯不給按時要說的那一句。給得出理由，那顆灰掉的鍵才不是個謎。 */
  get editBlockedReason(): string {
    return this.canEdit ? '' : '這台機器人正在執行中，要先停止它才改得動'
  }
}
