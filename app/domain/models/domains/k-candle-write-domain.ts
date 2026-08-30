import Decimal from 'decimal.js'
import type { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleFieldError, type KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'

/**
 * 一根 K 線涵蓋的分鐘數。起始時間唯一合法的取值就是這個長度的刻度。
 * 這是全前端唯一寫下這個長度的地方——要支援其他長度時只改這裡。
 */
export const K_CANDLE_INTERVAL_MINUTES = 5

/**
 * 使用者可能貼上任何東西，只有長得像十進位數字的才拿去解讀。
 * 先比對格式再建立精確小數，解讀就不會失敗，也不必用例外當控制流程。
 *
 * 指數表示法必須接受：精確小數型別本身在數字夠小或夠大時就是以 `1e-8` 這種形式呈現，
 * 修改既有 K 線時表單帶入的就是它——不接受的話，使用者會連自己沒動過的值都存不回去。
 */
const DECIMAL_PATTERN = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i

/** 欄位在畫面上的說法。訊息由它組出來，加欄位時只要多一列。 */
const FIELD_LABELS: Record<KCandleWriteField, string> = {
  symbol: '交易標的',
  openTime: '起始時間',
  open: '開盤價',
  high: '最高價',
  low: '最低價',
  close: '收盤價',
  volume: '成交量',
  quoteVolume: '成交額',
  takerBuyBaseVolume: '主動買入量',
  takerBuyQuoteVolume: '主動買入額',
}

/**
 * Domain Model：一根要寫進系統的 K 線，建構當下即驗證**所有**寫入規則。
 *
 * 規則集中在這一個建構子裡：身分、時間刻度、時間方向、八個數字的填寫與正負。
 * 它們散開來就會在表單、用例與後端之間各留一份，下次加一條規則要改三個地方。
 * 實例存在即代表這根 K 線合法，因此 proxy 拿到的必定送得出去。
 */
export class KCandleWriteDomain {
  readonly identity: KCandleIdentityVo
  readonly open: Decimal
  readonly high: Decimal
  readonly low: Decimal
  readonly close: Decimal
  readonly volume: Decimal
  readonly quoteVolume: Decimal
  readonly takerBuyBaseVolume: Decimal
  readonly takerBuyQuoteVolume: Decimal

  constructor(kCandleWriteDto: KCandleWriteDto) {
    this.identity = new KCandleIdentityVo(kCandleWriteDto.symbol, kCandleWriteDto.openTime)

    const openTime = this.identity.openTime
    const isOnInterval = openTime.getUTCMinutes() % K_CANDLE_INTERVAL_MINUTES === 0
      && openTime.getUTCSeconds() === 0
      && openTime.getUTCMilliseconds() === 0
    if (!isOnInterval) {
      throw new KCandleFieldError(
        'openTime', `起始時間必須落在${K_CANDLE_INTERVAL_MINUTES}分鐘刻度上`)
    }

    if (openTime.getTime() > Date.now()) {
      throw new KCandleFieldError('openTime', '起始時間不得指向未來')
    }

    // 八個欄位的解讀規則一模一樣，逐欄展開會是八份重複。
    this.open = this.readFigure(kCandleWriteDto.open, 'open')
    this.high = this.readFigure(kCandleWriteDto.high, 'high')
    this.low = this.readFigure(kCandleWriteDto.low, 'low')
    this.close = this.readFigure(kCandleWriteDto.close, 'close')
    this.volume = this.readFigure(kCandleWriteDto.volume, 'volume')
    this.quoteVolume = this.readFigure(kCandleWriteDto.quoteVolume, 'quoteVolume')
    this.takerBuyBaseVolume = this.readFigure(kCandleWriteDto.takerBuyBaseVolume, 'takerBuyBaseVolume')
    this.takerBuyQuoteVolume = this.readFigure(kCandleWriteDto.takerBuyQuoteVolume, 'takerBuyQuoteVolume')

    if (this.high.lessThan(this.low)) {
      throw new KCandleFieldError('high', '最高價不得低於最低價')
    }
  }

  private readFigure(rawValue: string, field: KCandleWriteField): Decimal {
    const label = FIELD_LABELS[field]

    const trimmedValue = rawValue.trim()
    if (trimmedValue === '') {
      throw new KCandleFieldError(field, `請填寫${label}`)
    }

    if (!DECIMAL_PATTERN.test(trimmedValue)) {
      throw new KCandleFieldError(field, `${label}必須是數字`)
    }

    const figure = new Decimal(trimmedValue)
    if (figure.isNegative()) {
      throw new KCandleFieldError(field, '價格與成交數字不得為負數')
    }

    return figure
  }
}
