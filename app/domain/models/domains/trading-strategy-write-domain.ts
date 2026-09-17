import { TradingStrategyConditionDomain } from '~/domain/models/domains/trading-strategy-condition-domain'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

/**
 * Domain Model：一份要存進去的交易策略，連同它送出前必須成立的每一條規則。
 *
 * 它只驗**打得出來但仍然不對**的那幾種。條件指到一個沒宣告的代號、群組只剩一句、
 * 第 11 個信號來源——那三種在畫面上根本按不出來（選單裡沒有、刪除鍵不見、新增鍵不見），
 * 所以它們不在這裡重寫一次。把「做不到的事」再寫成一條驗證，是替一個不會發生的情況
 * 維護一段程式。
 *
 * 撞名、「指名一支已經不在的策略腳本」、「還有機器人在跑」也不在這裡：
 * 那三件事光看這份表單看不出來，必須問過伺服器才知道，
 * 所以由後端說、由畫面照它說的講。
 */
export class TradingStrategyWriteDomain {
  constructor(private readonly writeDto: TradingStrategyWriteDto) {}

  get id(): number | undefined {
    return this.writeDto.id
  }

  /**
   * 這份表單現在送不送得出去；送不出去時說出**第一個**擋住它的理由。
   *
   * 一次只說一個，而不是列出全部：使用者一次只改得動一格，
   * 而一張同時亮起五個紅字的表單，第一個反應是不知道要從哪裡開始。
   */
  get rejection(): string | null {
    const name = this.writeDto.name.trim()
    if (name === '') {
      return '必須給交易策略取一個名稱'
    }

    if ([...name].length > STRATEGY_BOT_LIMITS.nameMaximumLength) {
      return `交易策略名稱長度上限為 ${STRATEGY_BOT_LIMITS.nameMaximumLength} 個字`
    }

    return this.signalSourceRejection() ?? this.conditionRejection()
  }

  get isSendable(): boolean {
    return this.rejection === null
  }

  /**
   * 送出去的那一份，名稱、來源代號**與條件裡指到的代號**前後空白都去掉了。
   *
   * 條件裡那一份也要去，而且理由比其他幾格都硬：來源代號去了空白、條件裡的沒去，
   * 兩邊就對不上——後端會說這個條件指到一個沒有宣告的來源，而畫面上那兩格
   * 看起來一模一樣。正規化必須是**整份一起**，不能一格一格挑著做。
   */
  get sendable(): TradingStrategyWriteDto {
    return new TradingStrategyWriteDto(
      this.writeDto.id,
      this.writeDto.name.trim(),
      this.writeDto.signalSources.map(signalSource => new TradingStrategySignalSourceDto(
        signalSource.label.trim(),
        signalSource.strategyScriptId,
        signalSource.aggregationInterval,
        signalSource.parameterValues,
      )),
      this.trimmedCondition(this.writeDto.buyCondition),
      this.trimmedCondition(this.writeDto.sellCondition),
    )
  }

  /** 把一棵條件樹裡每一句比對指到的代號一起去掉前後空白。 */
  private trimmedCondition(
    condition: TradingStrategyConditionDto | null,
  ): TradingStrategyConditionDto | null {
    if (condition === null) {
      return null
    }

    if (!condition.isGroup) {
      return new TradingStrategyConditionDto(
        condition.nodeId, null, [], condition.sourceLabel.trim(), condition.signal)
    }

    return new TradingStrategyConditionDto(
      condition.nodeId,
      condition.operator,
      condition.conditions.map(child => this.trimmedCondition(child)!),
      '',
      '',
    )
  }

  private signalSourceRejection(): string | null {
    if (this.writeDto.signalSources.length === 0) {
      return '一份交易策略至少要有一個信號來源'
    }

    const takenLabels: string[] = []

    for (const signalSource of this.writeDto.signalSources) {
      const label = signalSource.label.trim()

      if (label === '') {
        return '每一個信號來源都要有一個代號'
      }

      // 代號在畫面上是打字的（它是使用者自己取的名字），所以它是少數幾個
      // 真的擋不住、必須驗的欄位之一。
      if (takenLabels.includes(label)) {
        return `信號來源代號「${label}」重複了，同一份交易策略內的代號必須各不相同`
      }

      if (signalSource.strategyScriptId === 0) {
        return `信號來源「${label}」必須指名一支策略腳本`
      }

      takenLabels.push(label)
    }

    return null
  }

  /**
   * 兩邊的判斷送不送得出去。
   *
   * 只剩兩件事要問。**形狀不必問**：條件是由一張表寫出來的，而表寫得出來的形狀
   * 天生就是合法的——群組至少兩句、每一句都有信號，都是它產生方式的必然結果。
   * 去驗一個造不出反例的規則，是替一個不會發生的情況維護一段程式。
   */
  private conditionRejection(): string | null {
    const buyCondition = new TradingStrategyConditionDomain(this.writeDto.buyCondition)
    const sellCondition = new TradingStrategyConditionDomain(this.writeDto.sellCondition)

    if (buyCondition.isEmpty || sellCondition.isEmpty) {
      return '買入與賣出兩邊都要至少勾一格——少了任何一邊，這份交易策略就只會說一種話'
    }

    // 指到一個已經不在的代號，是唯一造得出來的壞條件：改代號時撞到別人用著的名字，
    // 那一列會停在舊名字上等它不再撞名。
    const declaredLabels = this.writeDto.signalSources.map(
      signalSource => signalSource.label.trim())
    const orphan = [...buyCondition.usedSourceLabels(), ...sellCondition.usedSourceLabels()]
      .find(label => !declaredLabels.includes(label))

    return orphan === undefined
      ? null
      : `條件裡還指著「${orphan}」，但已經沒有這一支策略腳本了`
  }
}
