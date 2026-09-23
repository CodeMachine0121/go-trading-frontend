import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { MARKET_DATA_KINDS } from '~/domain/models/vo/market-data-kind-vo'
import type { KCandleFieldVo } from '~/domain/models/vo/k-candle-field-vo'
import { CONTRACT_K_CANDLE_FIELDS, K_CANDLE_FIELDS } from '~/domain/models/vo/k-candle-field-vo'
import { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import { StrategyScriptWorkbenchDto } from '~/domain/models/dto/strategy-script-workbench-dto'

/**
 * 每一種行情的全部差異，就這幾欄。多一種行情是在這張表加一列，
 * 不是在畫面上多一個 if。
 */
const MARKET_DATA_KIND_DESCRIPTIONS: Readonly<
  Record<
    MarketDataKind,
    {
      label: string
      scriptInputTypeName: string
      guideHeading: string
      fields: readonly KCandleFieldVo[]
      notes: readonly string[]
      offersBacktest: boolean
      picksContractTradingSymbol: boolean
    }
  >
> = {
  kCandle: {
    label: 'K 線',
    scriptInputTypeName: 'KCandle',
    guideHeading: '每一根 K 線有什麼',
    fields: K_CANDLE_FIELDS,
    notes: [],
    offersBacktest: true,
    picksContractTradingSymbol: false,
  },
  contractKCandle: {
    label: '合約行情',
    scriptInputTypeName: 'ContractKCandle',
    guideHeading: '每一格合約行情有什麼',
    fields: CONTRACT_K_CANDLE_FIELDS,
    notes: [
      '沒有值的一律是零：指數價格開始記錄前的舊資料、第一次結算之前、沒錄到持倉統計的時段。持倉量是零多半代表那時沒有資料。',
      '資金費率是這一格收盤前最近一次結算的費率，兩次結算之間每一格都延續上一次的；真的結算的那一格 FundingSettledInBar 才是 true。',
      '持倉統計是收盤前最近、而且夠新的那一筆：不比五分鐘細的格子要落在格內，一分鐘的格子要落在收盤前五分鐘內。',
      '每一項都只來自這一格收盤以前，收盤那一刻的結算與統計屬於下一格。',
    ],
    // 合約的回測是交易服務的下一刀；在那之前，這一種行情沒有回測可以跑。
    offersBacktest: false,
    picksContractTradingSymbol: true,
  },
}

/** 沒有說、或說了不認得的行情時的歸屬：舊版後端與既有的每一支策略腳本都是這一種。 */
const DEFAULT_MARKET_DATA_KIND: MarketDataKind = 'kCandle'

/**
 * Domain Model：一種行情，以及策略腳本畫面需要知道的關於它的一切。
 *
 * 畫面上每一個「合約那一種不一樣」的地方都問它——進入點收什麼、說明列什麼、
 * 標籤怎麼寫、有沒有回測——所以沒有任何元件需要自己比對 `'contractKCandle'`。
 *
 * 解讀刻意寬容，理由與指標值種類相同：真正會給出陌生字串的是後端，
 * 而讓整個清單因為一個沒見過的值壞掉，遠比當成 K 線呈現更糟。
 */
export class MarketDataKindDomain {
  readonly value: MarketDataKind

  constructor(declared: string) {
    const normalizedDeclaration = declared.trim().toLowerCase()
    const recognized = MARKET_DATA_KINDS.find(
      candidate => candidate.toLowerCase() === normalizedDeclaration)

    this.value = recognized ?? DEFAULT_MARKET_DATA_KIND
  }

  /** 給人看的名字：「K 線」或「合約行情」。 */
  label(): string {
    return MARKET_DATA_KIND_DESCRIPTIONS[this.value].label
  }

  /** 算式裡那個型別叫什麼——`data []indicator.<這個>`。 */
  scriptInputTypeName(): string {
    return MARKET_DATA_KIND_DESCRIPTIONS[this.value].scriptInputTypeName
  }

  /** 這一種行情之下，工作區長得不一樣的那幾件事：有沒有回測、標的從哪一份清單挑。 */
  toWorkbenchDto(): StrategyScriptWorkbenchDto {
    const description = MARKET_DATA_KIND_DESCRIPTIONS[this.value]

    return new StrategyScriptWorkbenchDto(description.offersBacktest, description.picksContractTradingSymbol)
  }

  /** 是不是與另一個（已正規化的）種類是同一種。清單依它篩。 */
  isSameAs(other: MarketDataKindDomain): boolean {
    return this.value === other.value
  }

  /** 「算式裡可以用什麼」那一段。 */
  toScriptInputGuideDto(): ScriptInputGuideDto {
    const description = MARKET_DATA_KIND_DESCRIPTIONS[this.value]

    return new ScriptInputGuideDto(
      `func Calculate(data []indicator.${description.scriptInputTypeName})`,
      description.guideHeading,
      description.fields.map(field => field.toDto()),
      description.notes,
    )
  }
}
