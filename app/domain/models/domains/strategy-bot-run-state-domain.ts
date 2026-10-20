import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotHaltReasonDomain } from '~/domain/models/domains/strategy-bot-halt-reason-domain'
import type { StrategyBotWatchedSymbolDomain } from '~/domain/models/domains/strategy-bot-watched-symbol-domain'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

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
      this.haltedWatchedSymbolsLabel,
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

  /** 它是被系統自己整台停下來的嗎——與被擁有者按停止是兩件事。 */
  get isHalted(): boolean {
    return !this.isRunning && this.haltReason.isKnown
  }

  private get haltReason(): StrategyBotHaltReasonDomain {
    return new StrategyBotHaltReasonDomain(this.strategyBot.haltReason)
  }

  private get watchedSymbols(): StrategyBotWatchedSymbolDomain[] {
    const marketDataKind = new MarketDataKindDomain(this.strategyBot.marketDataKind)

    return this.strategyBot.watchedSymbols.map(watchedSymbol => watchedSymbol.toDomain(marketDataKind, null))
  }

  /** 任一個監聽標的上一輪兩個條件同時成立。**不是停擺**：機器人還在跑。 */
  get isConflicting(): boolean {
    return this.watchedSymbols.some(watchedSymbol => watchedSymbol.isConflicting)
  }

  /** 只停了部分標的時那一句；整台停擺時已經說了停擺，不再多說。 */
  get haltedWatchedSymbolsLabel(): LocalizedTextVo | null {
    const haltedCount = this.watchedSymbols.filter(watchedSymbol => watchedSymbol.isHalted).length
    if (this.isHalted || haltedCount === 0) {
      return null
    }

    return new LocalizedTextVo(
      `${haltedCount} 個標的停擺`,
      haltedCount === 1 ? '1 symbol halted' : `${haltedCount} symbols halted`)
  }

  /** 狀態標籤上的字。停擺時說的是停擺，因為那才是使用者要處理的那件事。 */
  get statusLabel(): LocalizedTextVo {
    if (this.isHalted) {
      return new LocalizedTextVo('停擺', 'Halted')
    }

    return this.isRunning
      ? new LocalizedTextVo('執行中', 'Running')
      : new LocalizedTextVo('已停止', 'Stopped')
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

  /** 整台停擺原因那一句。沒有停擺時是 `null`。 */
  get haltReasonLabel(): LocalizedTextVo | null {
    return this.isHalted ? this.haltReason.label : null
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
  get editBlockedReason(): LocalizedTextVo | null {
    return this.canEdit
      ? null
      : new LocalizedTextVo('這台機器人正在執行中，要先停止它才改得動', 'This bot is running; stop it before editing')
  }
}
