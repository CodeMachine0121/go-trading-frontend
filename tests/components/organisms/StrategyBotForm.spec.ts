// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBotForm from '~/components/organisms/StrategyBotForm.vue'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import Decimal from 'decimal.js'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'

function aStoredBot(positionPlan: PositionPlanDto | null = null) {
  return new StrategyBotDto(
    7, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
    positionPlan,
  )
}

function mountForm(overrides: {
  editing?: StrategyBotDto | null
  tradingStrategyOptions?: { value: number, label: string }[]
  marketDataKind?: MarketDataKind
  tradingSymbolApplication?: TradingSymbolApplication
} = {}) {
  return mount(StrategyBotForm, {
    props: {
      editing: 'editing' in overrides ? overrides.editing! : aStoredBot(),
      page: new MarketDataKindDomain(overrides.marketDataKind ?? 'kCandle').toStrategyBotPageDto(),
      tradingSymbolApplication: overrides.tradingSymbolApplication ?? buildTradingSymbolApplication(),
      tradingStrategyOptions: overrides.tradingStrategyOptions
        ?? [{ value: 9, label: '黃金交叉' }, { value: 10, label: '死亡交叉' }],
      saving: false,
      failureMessage: '',
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

describe('StrategyBotForm 這一張表單上有什麼', () => {
  it('只有四格——規則那一整塊不在這裡', async () => {
    // 拼規則是坐下來調半小時的事，開一台機器是填四格就走的事。
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-trading-strategy-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-interval-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="piece-shelf"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="condition-mat-buy"]').exists()).toBe(false)
  })

  it('選單列出自己的每一份交易策略', async () => {
    const wrapper = mountForm()
    await flushPromises()

    const options = wrapper.find('[data-testid="bot-trading-strategy-select"]').findAll('option')
    expect(options.map(option => option.text()))
      .toEqual(['挑一份', '黃金交叉', '死亡交叉'])
  })

  it('讀進來的那一台，選單停在它現在用的那一份上', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect((wrapper.find('[data-testid="bot-trading-strategy-select"]')
      .element as HTMLSelectElement).value).toBe('9')
  })

  it('一份都沒有時給的是一句話與一個入口，不是一個空選單', async () => {
    // 在一個挑不到東西的選單前面發呆，是最沒有用的那一種畫面。
    const wrapper = mountForm({ editing: null, tradingStrategyOptions: [] })
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-trading-strategy-select"]').exists()).toBe(false)
    const notice = wrapper.find('[data-testid="bot-no-trading-strategies"]')
    expect(notice.exists()).toBe(true)
    expect(notice.find('a').attributes('href')).toBe('/trading-strategies/new')
  })
})

describe('StrategyBotForm 存得下去嗎', () => {
  it('一份都沒挑就送不出去，而且就地說出是哪一件事', async () => {
    const wrapper = mountForm({ editing: null, tradingStrategyOptions: [] })
    await flushPromises()

    await wrapper.find('[data-testid="bot-name-input"]').setValue('早盤突破')

    expect(wrapper.find('[data-testid="bot-form-rejection"]').text()).toContain('挑一份交易策略')
    expect(wrapper.find('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('四格填齊就交出這一刻表上的那一台', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      id: number
      name: string
      symbol: string
      tradingStrategyId: number
    }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('早盤突破')
    expect(saved.symbol).toBe('BTCUSDT')
    expect(saved.tradingStrategyId).toBe(9)
  })

  it('換一份交易策略之後交出的是新挑的那一份', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-trading-strategy-select"]').setValue('10')
    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { tradingStrategyId: number }
    expect(saved.tradingStrategyId).toBe(10)
  })

  it('什麼都沒改時不說自己被改過——每次離開都攔人的頁面沒有人會讀那句話', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)
  })

  it('改了一格就說自己被改過', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-name-input"]').setValue('收盤反轉')

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })
})

/** 一組存好的部位規劃：五萬、押一成、停損三個點、停利五個點。 */
function aStoredPositionPlan() {
  return new PositionPlanDto(
    new Decimal(50000), 'percentage', new Decimal(10),
    new Decimal(3), new Decimal(5))
}

// 那四格收在一個問句底下，就是為了守住「開一台機器是填四格就走的事」。
// 四個常駐欄位會把它變成「填八格才走」，而多數人在開機器人的那一刻
// 還沒決定要押多少。
describe('StrategyBotForm 的建議部位', () => {
  it('新的一台預設收著，四格照舊', () => {
    const wrapper = mountForm({ editing: null })

    expect(wrapper.find('[data-testid="bot-position-plan-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-position-plan-fields"]').exists()).toBe(false)
    // 原本那四格一格都沒少。
    expect(wrapper.find('[data-testid="bot-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-trading-strategy-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-interval-input"]').exists()).toBe(true)
  })

  it('那個問句說的是「停損與停利」，不是「止損與止盈」', () => {
    // 這裡的距離從**最新價**量起，回測那邊的從**進場價**量起——
    // 後端把它們分成兩件事，畫面上就不能混用。
    const wrapper = mountForm({ editing: null })

    const question = wrapper.get('[data-testid="bot-position-plan-toggle"]')
      .element.closest('label')?.textContent ?? ''
    expect(question).toContain('停損與停利')
    expect(question).not.toContain('止損')
  })

  it('沒填過部位規劃的那一台打開也是收著', () => {
    const wrapper = mountForm({ editing: aStoredBot(null) })

    expect(wrapper.find('[data-testid="bot-position-plan-fields"]').exists()).toBe(false)
  })

  it('填過的那一台打開就是展開，而且帶著它存著的值', () => {
    // 有值而收著等於藏起來，而藏起來的值會在某天變成一個他不記得填過的數字。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })

    expect(wrapper.find('[data-testid="bot-position-plan-fields"]').exists()).toBe(true)
    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="bot-position-capital-input"]').element.value).toBe('50000')
    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="bot-position-stop-loss-input"]').element.value).toBe('3')
  })

  it('現貨機器人展開之後也沒有槓桿那一格，送出去的沒有槓桿', async () => {
    // 這一格拿掉時，讀它的那個案例是被**刪掉**的，不是被反轉的——而刪掉的
    // 斷言是沉默：任何人把輸入框放回來，這個檔案仍然全綠，而送出去的機器人
    // 會帶著一個後端只會拿來拒絕的數字。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })

    expect(wrapper.find('[data-testid="bot-position-leverage-input"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('槓桿')

    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    // 並排著問「那四格還在不在」，這一條才有意義——否則整組欄位消失也會過。
    const positionPlan
      = (wrapper.emitted('save')?.at(-1)?.[0] as StrategyBotWriteDto).positionPlan
    expect(positionPlan?.capital.toString()).toBe('50000')
    expect(positionPlan?.sizingMode).toBe('percentage')
    expect(positionPlan?.sizingValue.toString()).toBe('10')
    expect(positionPlan?.stopLossPercentage.toString()).toBe('3')
    expect(positionPlan?.takeProfitPercentage.toString()).toBe('5')
    expect(positionPlan?.leverage).toBeNull()
  })

  it('按一下就展開', async () => {
    const wrapper = mountForm({ editing: null })

    await wrapper.get('[data-testid="bot-position-plan-toggle"]').setValue(true)

    expect(wrapper.find('[data-testid="bot-position-plan-fields"]').exists()).toBe(true)
  })

  it('收起來就是不要', async () => {
    // 最誠實的讀法：使用者看得到的就是他要送的。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })

    await wrapper.get('[data-testid="bot-position-plan-toggle"]').setValue(false)
    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    expect((wrapper.emitted('save')?.at(-1)?.[0] as StrategyBotWriteDto).positionPlan)
      .toBeNull()
  })

  it('資金留空就整組不算', async () => {
    // 那是後端的規則（資金是這一組的開關），這一側照它講。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })

    await wrapper.get('[data-testid="bot-position-capital-input"]').setValue('')
    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    expect((wrapper.emitted('save')?.at(-1)?.[0] as StrategyBotWriteDto).positionPlan)
      .toBeNull()
  })

  it('只有全押不必填那一格數字', async () => {
    // 那件事是既有那個模型答的，不是這張表單自己記的。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })
    expect(wrapper.find('[data-testid="bot-position-sizing-value-input"]').exists()).toBe(true)

    await wrapper.get('[data-testid="bot-position-sizing-mode-select"]').setValue('allIn')

    expect(wrapper.find('[data-testid="bot-position-sizing-value-input"]').exists()).toBe(false)
  })

  it('填錯就送不出去，而那句話與回測那一列一字不差', async () => {
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })

    await wrapper.get('[data-testid="bot-position-sizing-value-input"]').setValue('150')

    expect(wrapper.get('[data-testid="bot-form-rejection"]').text())
      .toContain('百分比要大於零且不超過一百')
    expect(wrapper.find('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
  })

  it('填錯了但把區塊收起來，就送得出去', async () => {
    // 那一台不建議部位，那一格填什麼都不影響它。
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })
    await wrapper.get('[data-testid="bot-position-sizing-value-input"]').setValue('150')

    await wrapper.get('[data-testid="bot-position-plan-toggle"]').setValue(false)

    expect(wrapper.find('[data-testid="bot-form-rejection"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bot-form-save"]').attributes('disabled')).toBeUndefined()
  })

  it('只改停損距離也算改過', async () => {
    const wrapper = mountForm({ editing: aStoredBot(aStoredPositionPlan()) })
    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)

    await wrapper.get('[data-testid="bot-position-stop-loss-input"]').setValue('4')

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })
})

/** 合約標的清單：BTCUSDT 在合約追蹤名單上、DOGEUSDT 不在。 */
function contractSymbolApplication() {
  return new TradingSymbolApplication(new TradingSymbolService(
    { findTradingSymbols: vi.fn().mockResolvedValue([]) },
    buildContractTradingSymbolProxy([
      buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('DOGEUSDT', false)])))
}

function aContractBot(positionPlan: PositionPlanDto | null) {
  return new StrategyBotDto(
    7, '費率反轉', 'BTCUSDT', 5, 11, '費率反轉',
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
    positionPlan, 'contractKCandle', 'BTCUSDT 永續合約', null, '/contract-strategy-bots/7')
}

describe('StrategyBotForm 在合約那一頁', () => {
  it('標的從合約清單挑，而且只列合約追蹤名單上的', async () => {
    const wrapper = mountForm({
      editing: null, marketDataKind: 'contractKCandle', tradingSymbolApplication: contractSymbolApplication() })
    await flushPromises()

    const options = wrapper.get('[data-testid="contract-symbol-select"]').findAll('option')
    expect(options.map(option => option.text())).toEqual(['BTCUSDT'])
  })

  it('建議部位多一格槓桿倍數；現貨那一頁沒有', async () => {
    const contract = mountForm({ editing: null, marketDataKind: 'contractKCandle', tradingSymbolApplication: contractSymbolApplication() })
    await contract.get('[data-testid="bot-position-plan-toggle"]').setValue(true)
    const spot = mountForm({ editing: null })
    await spot.get('[data-testid="bot-position-plan-toggle"]').setValue(true)

    expect(contract.find('[data-testid="bot-position-leverage-input"]').exists()).toBe(true)
    expect(spot.find('[data-testid="bot-position-leverage-input"]').exists()).toBe(false)
  })

  it.each([
    { typed: '5', sent: '5' },
    { typed: '', sent: '1' },
  ])('槓桿填「$typed」送出去的是一台 $sent 倍的合約機器人', async ({ typed, sent }) => {
    const wrapper = mountForm({
      editing: null, marketDataKind: 'contractKCandle', tradingSymbolApplication: contractSymbolApplication() })
    await flushPromises()
    await wrapper.get('[data-testid="bot-name-input"]').setValue('費率反轉')
    await wrapper.get('[data-testid="bot-trading-strategy-select"]').setValue('9')
    await wrapper.get('[data-testid="bot-position-plan-toggle"]').setValue(true)
    await wrapper.get('[data-testid="bot-position-capital-input"]').setValue('1000')
    await wrapper.get('[data-testid="bot-position-sizing-mode-select"]').setValue('allIn')
    await wrapper.get('[data-testid="bot-position-leverage-input"]').setValue(typed)

    await wrapper.get('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as StrategyBotWriteDto
    expect(saved.marketDataKind).toBe('contractKCandle')
    expect(saved.symbol).toBe('BTCUSDT')
    expect(saved.positionPlan?.leverage?.toString()).toBe(sent)
  })

  it('槓桿小於一時儲存不給按，並說出理由', async () => {
    const wrapper = mountForm({
      editing: null, marketDataKind: 'contractKCandle', tradingSymbolApplication: contractSymbolApplication() })
    await flushPromises()
    await wrapper.get('[data-testid="bot-name-input"]').setValue('費率反轉')
    await wrapper.get('[data-testid="bot-trading-strategy-select"]').setValue('9')
    await wrapper.get('[data-testid="bot-position-plan-toggle"]').setValue(true)
    await wrapper.get('[data-testid="bot-position-capital-input"]').setValue('1000')
    await wrapper.get('[data-testid="bot-position-sizing-mode-select"]').setValue('allIn')
    await wrapper.get('[data-testid="bot-position-leverage-input"]').setValue('0.5')

    expect(wrapper.get('[data-testid="bot-form-rejection"]').text()).toBe('槓桿倍數不得小於 1 倍')
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
  })

  it('打開一台 5 倍的合約機器人，建議部位展開、填著部位資金與槓桿', async () => {
    const wrapper = mountForm({
      editing: aContractBot(new PositionPlanDto(
        new Decimal(1000), 'allIn', new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(5))),
      marketDataKind: 'contractKCandle',
      tradingSymbolApplication: contractSymbolApplication(),
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-position-plan-fields"]').exists()).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-testid="bot-position-capital-input"]').element.value).toBe('1000')
    expect(wrapper.get<HTMLInputElement>('[data-testid="bot-position-leverage-input"]').element.value).toBe('5')
  })
  it('改一台已存的機器人，送出去的是它自己的種類，不是這張表單所在那一頁的', async () => {
    // 表單放在哪一頁不改變一台已存機器人是哪一種——種類建立後不得更換。
    const wrapper = mountForm({
      editing: aContractBot(null),
      marketDataKind: 'kCandle',
      tradingStrategyOptions: [{ value: 11, label: '費率反轉' }],
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-form-save"]').trigger('click')

    expect((wrapper.emitted('save')?.[0]?.[0] as StrategyBotWriteDto).marketDataKind).toBe('contractKCandle')
  })
})
