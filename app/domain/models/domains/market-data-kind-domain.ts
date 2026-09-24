import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { MARKET_DATA_KINDS } from '~/domain/models/vo/market-data-kind-vo'
import type { KCandleFieldVo } from '~/domain/models/vo/k-candle-field-vo'
import { CONTRACT_K_CANDLE_FIELDS, K_CANDLE_FIELDS } from '~/domain/models/vo/k-candle-field-vo'
import { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import { StrategyScriptWorkbenchDto } from '~/domain/models/dto/strategy-script-workbench-dto'
import { MarketDataKindOptionDto } from '~/domain/models/dto/market-data-kind-option-dto'
import { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'

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
      valueTypeNote: string
      notes: readonly string[]
      offersBacktest: boolean
      picksContractTradingSymbol: boolean
      replaysOnContractAccount: boolean
      strategyBotPage: {
        listPath: string
        listTitle: string
        listSubtitle: string
        createTitle: string
        editTitle: string
        createLabel: string
        emptyNotice: string
        symbolSuffix: string
        takesLeverage: boolean
        tradingStrategyLabel: string
        tradingStrategyCreateHint: string
      }
    }
  >
> = {
  kCandle: {
    label: 'K 線',
    scriptInputTypeName: 'KCandle',
    guideHeading: '每一根 K 線有什麼',
    fields: K_CANDLE_FIELDS,
    valueTypeNote: '價量一律是 float64，直接算就好。',
    notes: [],
    offersBacktest: true,
    picksContractTradingSymbol: false,
    replaysOnContractAccount: false,
    strategyBotPage: {
      listPath: '/strategy-bots',
      listTitle: '現貨策略機器人',
      listSubtitle: '挑一份 K 線交易策略、盯一個現貨標的。按下啟動之後你就可以離開——它每隔幾分鐘自己看一次，訊號變了才傳訊息給你。',
      createTitle: '拼一台現貨機器人',
      editTitle: '改一改這台現貨機器人',
      createLabel: '＋ 拼一台現貨機器人',
      emptyNotice: '還沒有任何現貨機器人。拼一台之後，它會每隔幾分鐘自己看一次盤，在訊號變了的時候傳訊息給你。',
      symbolSuffix: '',
      takesLeverage: false,
      tradingStrategyLabel: 'K 線交易策略',
      // 新拼一份交易策略沒說行情種類就是 K 線，所以不必多交代。
      tradingStrategyCreateHint: '',
    },
  },
  contractKCandle: {
    label: '合約行情',
    scriptInputTypeName: 'ContractKCandle',
    guideHeading: '每一格合約行情有什麼',
    fields: CONTRACT_K_CANDLE_FIELDS,
    // 不能沿用現貨那一句「一律是 float64」：成交筆數、三組開高低收與結算旗標都不是。
    valueTypeNote: '價量是 float64，但不是每一項都是：TradeCount 是 int64，要先 float64(...) 才能跟價格一起算；'
      + 'Mark、Index、PremiumIndex 是 indicator.PriceLine，要取裡面的 Open / High / Low / Close；'
      + 'FundingSettledInBar 是 bool。',
    notes: [
      '沒有值的一律是零：指數價格開始記錄前的舊資料、第一次結算之前、沒錄到持倉統計的時段。持倉量是零多半代表那時沒有資料。',
      '資金費率是這一格收盤前最近一次結算的費率，兩次結算之間每一格都延續上一次的；真的結算的那一格 FundingSettledInBar 才是 true。',
      '持倉統計是收盤前最近、而且夠新的那一筆：不比五分鐘細的格子要落在格內，一分鐘的格子要落在收盤前五分鐘內。',
      '每一項都只來自這一格收盤以前，收盤那一刻的結算與統計屬於下一格。',
    ],
    // 合約的回測在逐倉合約帳戶上重演。
    offersBacktest: true,
    picksContractTradingSymbol: true,
    replaysOnContractAccount: true,
    // 合約機器人只盯合約追蹤名單上的永續合約，訊息說做多／做空／平多／平空，建議部位多一個槓桿倍數。
    strategyBotPage: {
      listPath: '/contract-strategy-bots',
      listTitle: '合約策略機器人',
      listSubtitle: '挑一份合約交易策略、盯一個合約追蹤名單上的永續合約。它照交易策略的交易模式告訴你該做多、做空還是平倉，並依你的槓桿建議保證金與止損止盈。',
      createTitle: '拼一台合約機器人',
      editTitle: '改一改這台合約機器人',
      createLabel: '＋ 拼一台合約機器人',
      emptyNotice: '還沒有任何合約機器人。拼一台之後，它會每隔幾分鐘自己看一次永續合約，在訊號變了的時候傳訊息給你。',
      symbolSuffix: ' 永續合約',
      takesLeverage: true,
      tradingStrategyLabel: '合約交易策略',
      // 新拼一份交易策略預設是 K 線，所以要說出那一格該選哪一個，否則拼好了這裡還是挑不到。
      tradingStrategyCreateHint: '（行情種類選「合約行情」）',
    },
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

  /** 這一種行情之下，工作區長得不一樣的那幾件事：有沒有回測、標的從哪一份清單挑、在哪一種帳戶上重演。 */
  toWorkbenchDto(): StrategyScriptWorkbenchDto {
    const description = MARKET_DATA_KIND_DESCRIPTIONS[this.value]

    return new StrategyScriptWorkbenchDto(
      description.offersBacktest, description.picksContractTradingSymbol, description.replaysOnContractAccount)
  }

  /**
   * 這一種行情的機器人畫面長什麼樣：清單在哪、標題怎麼寫、標的從哪一份清單挑、收不收槓桿。
   *
   * 現貨與合約機器人的畫面只差在這幾件事，所以元件只讀這一份，不自己比對行情種類。
   */
  toStrategyBotPageDto(): StrategyBotPageDto {
    const description = MARKET_DATA_KIND_DESCRIPTIONS[this.value]
    const page = description.strategyBotPage

    return new StrategyBotPageDto(
      this.value,
      page.listPath,
      `${page.listPath}/new`,
      page.listTitle,
      page.listSubtitle,
      page.createTitle,
      page.editTitle,
      page.createLabel,
      page.emptyNotice,
      description.picksContractTradingSymbol,
      page.takesLeverage,
      page.tradingStrategyLabel,
      page.tradingStrategyCreateHint,
    )
  }

  /** 一台這一種機器人的標的在畫面上怎麼說：合約的在後面標出永續合約。 */
  strategyBotSymbolLabel(symbol: string): string {
    return `${symbol}${MARKET_DATA_KIND_DESCRIPTIONS[this.value].strategyBotPage.symbolSuffix}`
  }

  /** 選單上的一個選項。 */
  toOptionDto(): MarketDataKindOptionDto {
    return new MarketDataKindOptionDto(this.value, this.label())
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
      description.valueTypeNote,
      description.notes,
    )
  }
}
