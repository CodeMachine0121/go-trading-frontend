// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradingStrategyWorkbench from '~/components/organisms/TradingStrategyWorkbench.vue'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import { onADesktop, onAPhone } from '../../fixtures/layout-density'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'

// 兩份選單是系統的規則，不是這一份的資料：直接向真的 domain service 要，不在測試裡另抄一份。
const optionsService = new TradingStrategyService({} as ITradingStrategyProxy)
const MARKET_DATA_KIND_OPTIONS = optionsService.listMarketDataKindOptions()
const CONTRACT_TRADING_MODE_OPTIONS = optionsService.listContractTradingModeOptions()

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new TradingStrategyConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: TradingStrategyConditionDto[]) {
  return new TradingStrategyConditionDto(`g-${operator}`, operator, children, '', '')
}

function aBot(
  buyCondition: TradingStrategyConditionDto | null = comparison('b', 'MACD', 'buy'),
  sellCondition: TradingStrategyConditionDto | null = comparison('s', 'MACD', 'sell'),
  sources = [new TradingStrategySignalSourceDto('MACD', 9, '5m', [])],
) {
  return new TradingStrategyDto(
    7, '黃金交叉', sources, buyCondition, sellCondition)
}

/** 突破與動能兩個來源——PRD 那幾個情境用的就是這一份。 */
function breakoutAndMomentum(
  buyCondition: TradingStrategyConditionDto | null = null,
  sellCondition: TradingStrategyConditionDto | null = comparison('s', '突破', 'sell'),
) {
  return aBot(buyCondition, sellCondition, [
    new TradingStrategySignalSourceDto('突破', 9, '5m', []),
    new TradingStrategySignalSourceDto('動能', 10, '5m', []),
  ])
}

function mountWorkbench(
  editing: TradingStrategyDto | null = aBot(),
  layoutDensity: LayoutDensityDto = onADesktop(),
  strategyScriptOptions = [{ value: 9, label: 'MACD' }, { value: 10, label: 'ATR' }],
) {
  return mount(TradingStrategyWorkbench, {
    props: {
      editing,
      strategyScriptOptionsByKind: { kCandle: strategyScriptOptions, contractKCandle: [] },
      parameterNamesByStrategyScriptId: { 9: ['快線期數'] },
      unusableStrategyScriptsByKind: { kCandle: {}, contractKCandle: {} },
      shortageByKind: { kCandle: null, contractKCandle: null },
      marketDataKindOptions: MARKET_DATA_KIND_OPTIONS,
      contractTradingModeOptions: CONTRACT_TRADING_MODE_OPTIONS,
      saving: false,
      failureMessage: '',
      savedGeneration: 0,
      layoutDensity,
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

/** 那張卡上某一格讀出來的那一句。 */
function sentenceOf(wrapper: ReturnType<typeof mountWorkbench>, side: 'buy' | 'sell', itemKey: string) {
  return wrapper.get(`[data-testid="item-${side}-${itemKey}"] [data-testid="condition-clause-sentence"]`).text()
}

/** 點一張卡上的一格，打開它的設定。 */
async function openItem(wrapper: ReturnType<typeof mountWorkbench>, side: 'buy' | 'sell', itemKey: string) {
  await wrapper.get(`[data-testid="item-${side}-${itemKey}"]`).trigger('click')
}

/** 在一張卡上加一條「某來源 等於 某信號」。 */
async function addClause(
  wrapper: ReturnType<typeof mountWorkbench>, side: 'buy' | 'sell', sourceLabel: string, signal: string,
) {
  await wrapper.get(`[data-testid="clause-add-${side}"]`).trigger('click')
  await wrapper.get(`[data-testid="clause-source-${side}"]`).setValue(sourceLabel)
  await wrapper.get(`[data-testid="clause-signal-${side}"]`).setValue(signal)
  await wrapper.get(`[data-testid="clause-confirm-${side}"]`).trigger('click')
  await flushPromises()
}

// 這張表單上一次來的時候，名稱底下是一組挑「寫給哪一種帳戶」的單選鈕。
// 整組拿掉之後，讀它的斷言也一起被刪掉了——而被刪掉的斷言是沉默，不是失敗。
describe('TradingStrategyWorkbench：這裡沒有帳戶種類可以挑', () => {
  it('一顆單選鈕都沒有', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
  })

  it('一個字都沒提那四種規矩', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    for (const goneSpelling of ['交易模式', '多空反手', '槓桿做多', '只做空']) {
      expect(wrapper.text()).not.toContain(goneSpelling)
    }

    // 與上面並排，這一條才有意義：它證明上面不是因為整張表單空了才過。
    expect(wrapper.find('[data-testid="trading-strategy-name-input"]').exists()).toBe(true)
  })

  it('部位計畫不在這裡——押多少、停在哪裡是機器人的事，不是規則的事', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    for (const botSpelling of ['部位', '停損', '停利']) {
      expect(wrapper.text()).not.toContain(botSpelling)
    }
  })
})

describe('TradingStrategyWorkbench：三張步驟卡', () => {
  it('由上而下是訊號來源、什麼算買入、什麼算賣出', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    const steps = wrapper.findAll('[data-testid^="step-"]').map(step => step.attributes('data-testid'))
    expect(steps).toEqual(['step-sources', 'step-buy', 'step-sell'])
    expect(wrapper.get('[data-testid="step-buy"]').text()).toContain('什麼算買入')
    expect(wrapper.get('[data-testid="step-sell"]').text()).toContain('什麼算賣出')
  })

  it('每一個訊號來源都在來源那張卡上，不管它有沒有被用到', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-script-row"]')).toHaveLength(1)
  })

  it('存進去的條件，打開來還在那張卡上，讀成一句話', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(sentenceOf(wrapper, 'buy', 'MACD')).toBe('MACD 等於 買入')
    expect(sentenceOf(wrapper, 'sell', 'MACD')).toBe('MACD 等於 賣出')
  })

  it('沒用上的來源，卡上就沒有它——那與「用著但什麼都沒勾」是兩件事', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="item-sell-MACD"]').exists()).toBe(false)
  })

  it('空的那張卡說得出它是空的', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.get('[data-testid="board-empty-sell"]').text()).toContain('空的')
  })

  it('一開始沒有任何一張卡的設定開著', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="clause-adder-buy"]').exists()).toBe(false)
  })

  it('一次只開一張卡的設定——點另一張，前一張的就收起來', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await openItem(wrapper, 'buy', 'MACD')

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="item-settings-buy"]').exists()).toBe(true)
  })
})

describe('TradingStrategyWorkbench：在步驟卡上加一條買入條件', () => {
  it('在「什麼算買入」那張卡上加一條「突破 等於 買入」，那張卡上就出現它', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum())
    await flushPromises()

    await addClause(wrapper, 'buy', '突破', 'buy')

    expect(sentenceOf(wrapper, 'buy', '突破')).toBe('突破 等於 買入')
  })

  it('挑的是賣出，加上去的那一條就只收賣出', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum())
    await flushPromises()

    await addClause(wrapper, 'buy', '動能', 'sell')

    expect(sentenceOf(wrapper, 'buy', '動能')).toBe('動能 等於 賣出')
  })

  it('已經在這張卡上的來源不再挑得到——一個來源在同一張卡上只出現一次', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum())
    await flushPromises()

    await addClause(wrapper, 'buy', '突破', 'buy')

    const choices = wrapper.get('[data-testid="clause-source-buy"]').findAll('option')
      .map(option => option.text())
    expect(choices).toEqual(['動能'])
  })

  it('每個來源都用上了就不再給加，並說出為什麼', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="clause-add-buy"]').trigger('click')

    expect(wrapper.find('[data-testid="clause-source-buy"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="clause-adder-buy"]').text()).toContain('只出現一次')
  })

  it('加完之後存得下去，送出去的就是這一條', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum())
    await flushPromises()

    await addClause(wrapper, 'buy', '突破', 'buy')
    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.at(-1)?.[0] as { buyCondition: TradingStrategyConditionDto }
    expect(saved.buyCondition.sourceLabel).toBe('突破')
    expect(saved.buyCondition.signal).toBe('buy')
  })
})

describe('TradingStrategyWorkbench：手機上可以編', () => {
  it('手機直立打開時，在「什麼算賣出」那張卡上刪掉一條，那一條消失並提示有還沒存的改動', async () => {
    const wrapper = mountWorkbench(
      breakoutAndMomentum(comparison('b', '突破', 'buy'),
        group('and', group('or', comparison('s1', '突破', 'sell'), comparison('s2', '動能', 'sell')))),
      onAPhone())
    await flushPromises()

    await openItem(wrapper, 'sell', '突破+動能')
    await wrapper.get('[data-testid="take-off-sell-動能"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="item-sell-"]').map(item => item.attributes('data-testid')))
      .toEqual(['item-sell-突破'])
    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
    expect(wrapper.get('[data-testid="trading-strategy-unsaved"]').text()).toBe('還沒存的改動')
  })

  it('手機上設定從下方拉出，每一樣改得動的都在', async () => {
    const wrapper = mountWorkbench(aBot(), onAPhone())
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')

    const sheet = wrapper.get('[role="dialog"]')
    expect(sheet.find('[data-testid="chip-buy-MACD-hold"]').exists()).toBe(true)
    expect(sheet.find('[data-testid="take-off-buy-MACD"]').exists()).toBe(true)
    expect(sheet.find('[data-testid="clause-adder-buy"]').exists()).toBe(true)
  })

  it('寬螢幕上設定就貼在卡旁邊，不是疊上來的一張紙', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="step-buy"]').find('[data-testid="item-settings-buy"]').exists())
      .toBe(true)
  })

  it('手機上的且／或照樣切得動', async () => {
    const wrapper = mountWorkbench(aBot(), onAPhone())
    await flushPromises()

    const [, anyOf] = wrapper.get('[data-testid="operator-buy"]').findAll('button')
    await anyOf!.trigger('click')

    expect(anyOf!.attributes('aria-selected')).toBe('true')
  })

  it('改到一半螢幕變窄了，已經做過的改動留著，而且仍然改得動', async () => {
    // 轉個方向就把人做到一半的東西丟掉，比不讓他改更糟。
    const wrapper = mountWorkbench()
    await flushPromises()
    await wrapper.get('[data-testid="trading-strategy-name-input"]').setValue('改了一半的名字')

    await wrapper.setProps({ layoutDensity: onAPhone() })

    expect((wrapper.get('[data-testid="trading-strategy-name-input"]').element as HTMLInputElement).value)
      .toBe('改了一半的名字')
    expect(wrapper.find('[data-testid="item-buy-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-script-add"]').exists()).toBe(true)
  })
})

describe('TradingStrategyWorkbench：把兩條扣成一組', () => {
  it('把「突破 等於 買入」與「動能 等於 買入」扣成一組並選「或」，那張卡讀成一句話', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum(
      group('and', comparison('b1', '突破', 'buy'), comparison('b2', '動能', 'buy'))))
    await flushPromises()

    await openItem(wrapper, 'buy', '突破')
    await wrapper.get('[data-testid="bundle-with-buy-突破"]').setValue('動能')
    await flushPromises()
    const [, anyOf] = wrapper.get('[data-testid="bundle-operator-buy-突破+動能"]').findAll('button')
    await anyOf!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="board-sentence-buy"]').text())
      .toBe('突破 等於 買入 或 動能 等於 買入')
  })

  it('一組的且／或換成「且」，那一組跟著讀成「且」', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum(
      group('or', comparison('b1', '突破', 'buy'), comparison('b2', '動能', 'buy'))))
    await flushPromises()

    await wrapper.get('[data-testid="operator-buy"]').findAll('button')[0]!.trigger('click')
    await openItem(wrapper, 'buy', '突破')
    await wrapper.get('[data-testid="bundle-with-buy-突破"]').setValue('動能')
    await flushPromises()
    await wrapper.get('[data-testid="bundle-operator-buy-突破+動能"]').findAll('button')[0]!.trigger('click')
    await flushPromises()

    expect(sentenceOf(wrapper, 'buy', '突破+動能')).toBe('突破 等於 買入 且 動能 等於 買入')
  })

  it('把一組拆開，回到一條一條、順序不變', async () => {
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy'), comparison('c', 'RSI', 'buy'))),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
        new TradingStrategySignalSourceDto('RSI', 9, '5m', []),
      ]))
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD+ATR+RSI')
    await wrapper.get('[data-testid="split-buy-MACD+ATR+RSI"]').trigger('click')
    await flushPromises()

    const items = wrapper.get('[data-testid="step-buy"]').findAll('[data-testid^="item-buy-"]')
      .map(item => item.attributes('data-testid'))
    expect(items).toEqual(['item-buy-MACD', 'item-buy-ATR', 'item-buy-RSI'])
  })

  it('一條從一組裡拆出來，那一組只剩一條時自己散開', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum(
      group('and', group('or', comparison('b1', '突破', 'buy'), comparison('b2', '動能', 'buy')))))
    await flushPromises()

    await openItem(wrapper, 'buy', '突破+動能')
    await wrapper.get('[data-testid="unbundle-buy-動能"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-突破"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="item-buy-動能"]').exists()).toBe(true)
  })

  it('把另一條加進已有的一組', async () => {
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
        comparison('c', 'RSI', 'buy')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
        new TradingStrategySignalSourceDto('RSI', 9, '5m', []),
      ]))
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD+ATR')
    await wrapper.get('[data-testid="bundle-into-buy-MACD+ATR"]').setValue('RSI')
    await flushPromises()

    expect(sentenceOf(wrapper, 'buy', 'MACD+ATR+RSI'))
      .toBe('MACD 等於 買入 或 ATR 等於 買入 或 RSI 等於 買入')
  })

  it('一條往後挪一格，存下去的順序就跟著換', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum(
      group('and', comparison('b1', '突破', 'buy'), comparison('b2', '動能', 'buy'))))
    await flushPromises()

    await openItem(wrapper, 'buy', '突破')
    await wrapper.get('[data-testid="move-later-buy-突破"]').trigger('click')
    await flushPromises()

    const items = wrapper.get('[data-testid="step-buy"]').findAll('[data-testid^="item-buy-"]')
      .map(item => item.attributes('data-testid'))
    expect(items).toEqual(['item-buy-動能', 'item-buy-突破'])
  })
})

describe('TradingStrategyWorkbench：引用的訊號來源被刪掉', () => {
  it('在訊號來源那張卡刪掉「動能」，引用它的那一條照舊規則一併拿掉', async () => {
    const wrapper = mountWorkbench(breakoutAndMomentum(
      group('and', comparison('b1', '突破', 'buy'), comparison('b2', '動能', 'buy'))))
    await flushPromises()

    await wrapper.findAll('[data-testid="strategy-script-remove"]')[1]!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-動能"]').exists()).toBe(false)
    expect(sentenceOf(wrapper, 'buy', '突破')).toBe('突破 等於 買入')
  })

  it('刪之前，設定裡先說有誰在用它', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')

    expect(wrapper.get('[data-testid="strategy-script-usage-warning"]').text())
      .toBe('條件裡還在用「MACD」，刪掉它會一併拿掉那幾句條件')
  })
})

describe('TradingStrategyWorkbench：一條收好幾個信號時，把話講明白', () => {
  it('只收一個信號時不必解釋什麼', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')

    expect(wrapper.find('[data-testid="plain-words-buy-MACD"]').exists()).toBe(false)
  })

  it('收兩個時說出它其實在說什麼——並排的開關看起來像「而且」', async () => {
    // 一支策略腳本同一時間只吐一個信號，所以「買入或持有」是「不是賣出」，
    // 而不是一件不可能的事。
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')
    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="plain-words-buy-MACD"]').text()).toContain('不是賣出')
    expect(sentenceOf(wrapper, 'buy', 'MACD')).toBe('MACD 等於 買入或持有')
  })

  it('三個都收時說的是另一句', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')
    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    await wrapper.get('[data-testid="chip-buy-MACD-sell"]').trigger('click')

    expect(wrapper.get('[data-testid="plain-words-buy-MACD"]').text()).toContain('不管')
  })
})

describe('TradingStrategyWorkbench：一條在這一邊要是什麼', () => {
  it('按一下開，再按一下關', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')
    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('false')
  })

  it('同一條可以同時收好幾個信號', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')
    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="chip-buy-MACD-buy"]').attributes('aria-pressed'))
      .toBe('true')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('改一張卡不會動到另一張', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await openItem(wrapper, 'buy', 'MACD')
    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(sentenceOf(wrapper, 'sell', 'MACD')).toBe('MACD 等於 賣出')
  })
})

describe('TradingStrategyWorkbench：加一個訊號來源', () => {
  it('加一個就多一列', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-script-row"]')).toHaveLength(2)
  })

  it('加完直接打開它的設定——下一件事幾乎一定是挑它用哪一支', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(true)
  })

  it('刪一個就少一列，而那一個還被用著也刪得掉', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-remove"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-script-row"]')).toHaveLength(0)
  })

  it('一個訊號來源都還沒有時說得出下一步', async () => {
    const wrapper = mountWorkbench(aBot(null, null, []))
    await flushPromises()

    expect(wrapper.get('[data-testid="no-sources"]').text()).toContain('加一個')
  })

  it('到了上限時新增鍵不在，而是說出上限是多少', async () => {
    // 一次最多幾個是交易服務的規則；這裡把卡填滿，看那顆鍵有沒有收起來。
    const wrapper = mountWorkbench(aBot(null, null, []))
    await flushPromises()

    for (let attempt = 0; attempt < 20
      && wrapper.find('[data-testid="strategy-script-add"]').exists(); attempt += 1) {
      await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
      await flushPromises()
    }

    expect(wrapper.find('[data-testid="strategy-script-add"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="signal-source-limit"]').text()).toContain('最多')
  })
})

describe('TradingStrategyWorkbench：一個訊號來源自己的設定', () => {
  it('點一列才打開，裡面改得動代號、刻度與參數', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')

    const panel = wrapper.get('[data-testid="strategy-script-settings-panel"]')
    expect(panel.find('[data-testid="strategy-script-label-input"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-script-interval-select"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-script-parameter-input"]').exists()).toBe(true)
  })

  it('設定裡改名字，設定不會因為認不得自己開的是誰而關掉', async () => {
    // 代號正是這裡改得動的東西之一。用代號記的話，一改名它就自己消失。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-label-input"]').setValue('改過名字了')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(true)
  })

  it('改代號時，條件裡指到它的那幾條跟著改名', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-label-input"]').setValue('均線')
    await flushPromises()

    expect(sentenceOf(wrapper, 'buy', '均線')).toBe('均線 等於 買入')
  })

  it('參數填了一個數字，存下去的就是它', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-parameter-input"]').setValue('12')
    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.at(-1)?.[0] as {
      signalSources: { parameterValues: { name: string, value: number }[] }[]
    }
    expect(saved.signalSources[0]!.parameterValues).toEqual([{ name: '快線期數', value: 12 }])
  })

  it('按「好了」就關起來', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-settings-done"]').trigger('click')

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：存得下去嗎', () => {
  it('每一邊都有條件就存得下去', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled')).toBeUndefined()
  })

  it('一邊一條都沒有就存不下去，並說得出為什麼', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.get('[data-testid="trading-strategy-form-rejection"]').text()).toContain('兩邊都要')
    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled')).toBeDefined()
  })

  it('按儲存交出的是這一刻卡上的那一份', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { id: number, name: string }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('黃金交叉')
  })
})

describe('TradingStrategyWorkbench：畫不出來的舊條件', () => {
  it('一組裡面還有一組的舊條件，照實說這張卡排不出它——不默默壓平', async () => {
    // 壓平會得到一個意思不同的條件，而使用者會在完全沒察覺的情況下把它存回去。
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or',
          comparison('a', 'MACD', 'buy'),
          group('and', comparison('b', 'ATR', 'buy'), comparison('c', 'MACD', 'sell'))),
        comparison('d', 'ATR', 'sell')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '1h', []),
      ]))
    await flushPromises()

    expect(wrapper.get('[data-testid="board-unrepresentable-buy"]').text()).toContain('排不出')
    expect(wrapper.find('[data-testid="board-unrepresentable-sell"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：一份交易策略只看一種粗細', () => {
  /** 送出去的那一份裡，每個訊號來源各自帶的刻度。 */
  async function savedIntervalsOf(wrapper: ReturnType<typeof mountWorkbench>) {
    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      signalSources: { aggregationInterval: string }[]
    }

    return saved.signalSources.map(signalSource => signalSource.aggregationInterval)
  }

  function twoSourcesReading(firstInterval: string, secondInterval: string) {
    return aBot(
      comparison('b', 'MACD', 'buy'),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, firstInterval, []),
        new TradingStrategySignalSourceDto('ATR', 10, secondInterval, []),
      ])
  }

  it('調完就存得下去，而且存的是他挑的那一個', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-interval-select"]').setValue('4h')
    await flushPromises()

    expect(await savedIntervalsOf(wrapper)).toEqual(['4h'])
  })

  it('每一個都一樣時什麼都不必提', async () => {
    const wrapper = mountWorkbench(twoSourcesReading('1h', '1h'))
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
  })

  it('粗細不一樣時擋下來，並說出現在有哪幾種，儲存鍵按不下去', async () => {
    // 只說「不一樣」的話，他得把每一個來源的設定都打開一次才知道差在哪。
    const wrapper = mountWorkbench(twoSourcesReading('1h', '5m'))
    await flushPromises()

    const rejection = wrapper.get('[data-testid="trading-strategy-form-rejection"]').text()
    expect(rejection).toContain('1h')
    expect(rejection).toContain('5m')
    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled'))
      .toBeDefined()
  })

  it('把那一個調回來就送得出去了', async () => {
    const wrapper = mountWorkbench(twoSourcesReading('1h', '5m'))
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-1"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-interval-select"]').setValue('1h')
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(await savedIntervalsOf(wrapper)).toEqual(['1h', '1h'])
  })

  it('後來才加的來源跟著已經有的那幾個', async () => {
    const wrapper = mountWorkbench(twoSourcesReading('1d', '1d'))
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(await savedIntervalsOf(wrapper)).toEqual(['1d', '1d', '1d'])
  })

  it('卡上每一個來源旁邊看得到它自己的粗細', async () => {
    // 不必打開任何設定就找得出哪一個落單。
    const wrapper = mountWorkbench(twoSourcesReading('1h', '5m'))
    await flushPromises()

    expect(wrapper.get('[data-testid="signal-source-MACD"]').text()).toContain('一小時')
    expect(wrapper.get('[data-testid="signal-source-ATR"]').text()).toContain('五分鐘')
  })
})

describe('TradingStrategyWorkbench：存好之後', () => {
  it('存好之後再離開不會被攔——基準跟著存成功往前走', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-name-input"]').setValue('改過的名字')
    await flushPromises()
    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)

    await wrapper.setProps({ savedGeneration: 1 })
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)
    expect(wrapper.find('[data-testid="trading-strategy-unsaved"]').exists()).toBe(false)
  })

  it('存好之後又改了一點東西，就又算改過了', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.setProps({ savedGeneration: 1 })
    await wrapper.get('[data-testid="trading-strategy-name-input"]').setValue('再改一次')
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })

  it('只有一顆儲存鍵——「取消」旁邊放著一顆不會離開的「儲存」讀不通', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.text()).not.toContain('取消')
    expect(wrapper.findAll('[data-testid="trading-strategy-form-save"]')).toHaveLength(1)
  })

  it('要存的是哪一份，每次都重新問一次外面交回來的那一份', async () => {
    // 拼好一份新的存下來之後，外面把剛建好的那一份交回來，而下一次儲存必須變成「改它」——
    // 識別碼沒跟上的話，他再按一次就多出第二份一模一樣的。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')
    expect((wrapper.emitted('save')?.at(-1)?.[0] as { id?: number }).id).toBe(7)

    const anotherOne = new TradingStrategyDto(
      99, '黃金交叉',
      [new TradingStrategySignalSourceDto('MACD', 9, '5m', [])],
      comparison('b', 'MACD', 'buy'),
      comparison('s', 'MACD', 'sell'))
    await wrapper.setProps({ editing: anotherOne, savedGeneration: 1 })
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')
    expect((wrapper.emitted('save')?.at(-1)?.[0] as { id?: number }).id).toBe(99)
  })
})

describe('TradingStrategyWorkbench：來源指著一支挑不得的策略腳本', () => {
  /** 一個指著 11 號的來源，而 11 號不在選單裡。 */
  function withAStraySource(unusableStrategyScripts: Record<number, string>) {
    return mount(TradingStrategyWorkbench, {
      props: {
        editing: aBot(
          comparison('b', '壞掉的', 'buy'),
          comparison('s', '壞掉的', 'sell'),
          [new TradingStrategySignalSourceDto('壞掉的', 11, '5m', [])]),
        strategyScriptOptionsByKind: { kCandle: [{ value: 9, label: 'MACD' }], contractKCandle: [] },
        parameterNamesByStrategyScriptId: { 9: ['快線期數'] },
        unusableStrategyScriptsByKind: { kCandle: unusableStrategyScripts, contractKCandle: {} },
        shortageByKind: { kCandle: null, contractKCandle: null },
        marketDataKindOptions: MARKET_DATA_KIND_OPTIONS,
        contractTradingModeOptions: CONTRACT_TRADING_MODE_OPTIONS,
        saving: false,
        failureMessage: '',
        savedGeneration: 0,
        layoutDensity: onADesktop(),
      },
    })
  }

  it('選單不是一片空白——它說得出這個來源用的是哪一支、為什麼用不了', async () => {
    const wrapper = withAStraySource({ 11: '吐一個數字的（這支不吐訊號，當不了信號來源）' })
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    const strayOption = wrapper.get('[data-testid="strategy-script-stray-option"]')
    expect(strayOption.text()).toContain('吐一個數字的')
    // 說得出，但按不下去——挑得到就等於讓人拼出一份後端會拒絕的交易策略。
    expect(strayOption.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="strategy-script-stray-note"]').exists()).toBe(true)
  })

  it('那一支根本不在了也照樣說一句——「不見了」與「不能用」要做的事一樣', async () => {
    const wrapper = withAStraySource({})
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="strategy-script-stray-option"]').text()).toContain('11')
  })

  it('指著一支挑得到的策略腳本時，選單裡沒有那一行多出來的東西', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-stray-option"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：一支策略腳本都挑不到時，說得出是哪一種', () => {
  function withShortage(shortage: 'noStrategyScripts' | 'noSignalStrategyScripts') {
    return mount(TradingStrategyWorkbench, {
      props: {
        editing: null,
        strategyScriptOptionsByKind: { kCandle: [], contractKCandle: [] },
        parameterNamesByStrategyScriptId: {},
        unusableStrategyScriptsByKind: { kCandle: {}, contractKCandle: {} },
        shortageByKind: { kCandle: shortage, contractKCandle: null },
        marketDataKindOptions: MARKET_DATA_KIND_OPTIONS,
        contractTradingModeOptions: CONTRACT_TRADING_MODE_OPTIONS,
        saving: false,
        failureMessage: '',
        savedGeneration: 0,
        layoutDensity: onADesktop(),
      },
    })
  }

  it('一支都沒建過——下一步是去建一支', async () => {
    const wrapper = withShortage('noStrategyScripts')
    await flushPromises()

    expect(wrapper.find('[data-testid="no-strategy-scripts"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-signal-strategy-scripts"]').exists()).toBe(false)
  })

  it('建了幾支、但沒有一支吐訊號——下一步是去改它們的指標值種類', async () => {
    const wrapper = withShortage('noSignalStrategyScripts')
    await flushPromises()

    const note = wrapper.get('[data-testid="no-signal-strategy-scripts"]')
    expect(note.text()).toContain('一個信號')
    expect(wrapper.find('[data-testid="no-strategy-scripts"]').exists()).toBe(false)
  })

  it('挑不到的時候加不了來源——按了只會得到一個空的下拉選單', async () => {
    const wrapper = withShortage('noSignalStrategyScripts')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-add"]').exists()).toBe(false)
  })
})
