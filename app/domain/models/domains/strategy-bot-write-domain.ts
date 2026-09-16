import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

/**
 * Domain Model：一台要存進去的機器人，連同它送出前必須成立的每一條規則。
 *
 * 它只驗**打得出來但仍然不對**的那幾種。條件指到一個沒宣告的代號、群組只剩一句、
 * 第 11 個信號來源——那三種在畫面上根本按不出來（選單裡沒有、刪除鍵不見、新增鍵不見），
 * 所以它們不在這裡重寫一次。把「做不到的事」再寫成一條驗證，是替一個不會發生的情況
 * 維護一段程式。
 *
 * 撞名與「指名一支已經不在的策略」也不在這裡：那兩件事光看這份表單看不出來，
 * 必須問過伺服器才知道，所以由後端說、由畫面照它說的講。
 */
export class StrategyBotWriteDomain {
  constructor(private readonly writeDto: StrategyBotWriteDto) {}

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
      return '必須給機器人取一個名稱'
    }

    if ([...name].length > STRATEGY_BOT_LIMITS.nameMaximumLength) {
      return `機器人名稱長度上限為 ${STRATEGY_BOT_LIMITS.nameMaximumLength} 個字`
    }

    if (this.writeDto.symbol.trim() === '') {
      return '必須指定這台機器人要盯哪一個交易標的'
    }

    if (this.writeDto.triggerIntervalMinutes < STRATEGY_BOT_LIMITS.triggerIntervalMinimumMinutes) {
      return '觸發間隔必須大於零'
    }

    if (this.writeDto.triggerIntervalMinutes > STRATEGY_BOT_LIMITS.triggerIntervalMaximumMinutes) {
      return `觸發間隔上限是 ${STRATEGY_BOT_LIMITS.triggerIntervalMaximumMinutes} 分鐘`
    }

    return this.signalSourceRejection() ?? this.conditionRejection()
  }

  get isSendable(): boolean {
    return this.rejection === null
  }

  /**
   * 送出去的那一份，名稱、標的、來源代號**與條件裡指到的代號**前後空白都去掉了。
   *
   * 條件裡那一份也要去，而且理由比其他幾格都硬：來源代號去了空白、條件裡的沒去，
   * 兩邊就對不上——後端會說這個條件指到一個沒有宣告的來源，而畫面上那兩格
   * 看起來一模一樣。正規化必須是**整份一起**，不能一格一格挑著做。
   */
  get sendable(): StrategyBotWriteDto {
    return new StrategyBotWriteDto(
      this.writeDto.id,
      this.writeDto.name.trim(),
      this.writeDto.symbol.trim(),
      this.writeDto.triggerIntervalMinutes,
      this.writeDto.signalSources.map(signalSource => new StrategyBotSignalSourceDto(
        signalSource.label.trim(),
        signalSource.strategyId,
        signalSource.aggregationInterval,
        signalSource.parameterValues,
      )),
      this.trimmedCondition(this.writeDto.buyCondition),
      this.trimmedCondition(this.writeDto.sellCondition),
    )
  }

  /** 把一棵條件樹裡每一句比對指到的代號一起去掉前後空白。 */
  private trimmedCondition(
    condition: StrategyBotConditionDto | null,
  ): StrategyBotConditionDto | null {
    if (condition === null) {
      return null
    }

    if (!condition.isGroup) {
      return new StrategyBotConditionDto(
        condition.nodeId, null, [], condition.sourceLabel.trim(), condition.signal)
    }

    return new StrategyBotConditionDto(
      condition.nodeId,
      condition.operator,
      condition.conditions.map(child => this.trimmedCondition(child)!),
      '',
      '',
    )
  }

  private signalSourceRejection(): string | null {
    if (this.writeDto.signalSources.length === 0) {
      return '一台機器人至少要有一個信號來源'
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
        return `信號來源代號「${label}」重複了，同一台機器人內的代號必須各不相同`
      }

      if (signalSource.strategyId === 0) {
        return `信號來源「${label}」必須指名一支策略`
      }

      takenLabels.push(label)
    }

    return null
  }

  private conditionRejection(): string | null {
    const buyCondition = new StrategyBotConditionDomain(this.writeDto.buyCondition)
    const sellCondition = new StrategyBotConditionDomain(this.writeDto.sellCondition)

    if (buyCondition.isEmpty || sellCondition.isEmpty) {
      return '買入條件與賣出條件都不得為空——少了任何一邊，這台機器人就只會說一種話'
    }

    return null
  }
}
