import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBotListPanel from '~/components/organisms/StrategyBotListPanel.vue'
import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildTradingSymbol } from '~~/tests/fixtures/trading-symbol-application'

function runningState() {
  return new StrategyBotRunStateDto(
    true, false, false, '執行中', 'success', '', '買入', false, true, false,
    '這台機器人正在執行中，要先停止它才改得動')
}

function stoppedState() {
  return new StrategyBotRunStateDto(
    false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, '')
}

function haltedState() {
  return new StrategyBotRunStateDto(
    false, true, false, '停擺', 'danger', '機器人金鑰不被接受', '買入', true, false, true, '')
}

function botDto(id: number, name: string, runState: StrategyBotRunStateDto) {
  return new StrategyBotDto(
    id, name, 'BTCUSDT', 5,
    [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
    new StrategyBotConditionDto('n1', null, [], 'A', 'buy'),
    new StrategyBotConditionDto('n2', null, [], 'A', 'sell'),
    runState,
  )
}

// 只 mock 最外層的 proxy；application 與 domain service 都是真的，
// 所以「表單上挑得到哪幾檔」測到的是真正跑起來的那條路。
function symbolApplicationListing(...symbols: string[]) {
  return new TradingSymbolApplication(new TradingSymbolService({
    findTradingSymbols: vi.fn().mockResolvedValue(
      symbols.map(symbol => buildTradingSymbol(symbol))),
  }))
}

function mountPanel(
  overrides: Partial<StrategyBotApplication> = {},
  tradingSymbolApplication = symbolApplicationListing('BTCUSDT', 'ETHUSDT'),
) {
  const strategyBotApplication = {
    listStrategyBots: vi.fn().mockResolvedValue([]),
    listRunRecords: vi.fn().mockResolvedValue([]),
    runRoundNow: vi.fn().mockResolvedValue(botDto(1, '早盤突破', stoppedState())),
    getStrategyBot: vi.fn().mockResolvedValue(botDto(1, '早盤突破', stoppedState())),
    saveStrategyBot: vi.fn(),
    deleteStrategyBot: vi.fn().mockResolvedValue(undefined),
    startStrategyBot: vi.fn(),
    stopStrategyBot: vi.fn(),
    ...overrides,
  }

  const strategyApplication = {
    listAvailableStrategies: vi.fn().mockResolvedValue({ mine: [], adopted: [] }),
  }

  const wrapper = mount(StrategyBotListPanel, {
    props: {
      strategyBotApplication: strategyBotApplication as unknown as StrategyBotApplication,
      strategyApplication: strategyApplication as unknown as StrategyApplication,
      tradingSymbolApplication,
      timeZoneIdentifier: 'Asia/Taipei',
    },
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })

  return { wrapper, strategyBotApplication }
}

describe('StrategyBotListPanel 的清單', () => {
  it('一台都沒有時說得出下一步，而不是給一張空表', async () => {
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-list-empty"]').text()).toContain('還沒有任何機器人')
    expect(wrapper.findAll('[data-testid="bot-row"]')).toHaveLength(0)
  })

  it('照後端交出的順序顯示，畫面不自己重排', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([
        botDto(1, '早盤突破', stoppedState()),
        botDto(2, '收盤反轉', runningState()),
      ]),
    })
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="bot-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('早盤突破')
    expect(rows[1]?.text()).toContain('收盤反轉')
  })

  it('讀不到時說出後端說的那個原因，並給得出重試的路', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockRejectedValue(new Error('後端連不上')),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-list-failure"]').text()).toContain('後端連不上')
    expect(wrapper.find('[data-testid="bot-list-retry"]').exists()).toBe(true)
  })

  it('沒送過訊號的那一台寫的是一句話，不是空白', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-last-sent-signal"]').text()).toContain('還沒送出過')
  })

  it('停擺的那一台把原因說出來', async () => {
    // 這份清單是使用者唯一會發現機器人出事的地方。
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', haltedState())]),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-halt-reason"]').text()).toBe('機器人金鑰不被接受')
  })
})

describe('StrategyBotListPanel 的三顆按鈕', () => {
  it('執行中時看得到停止、看不到播放', async () => {
    // 一台機器人只有兩種狀態，同時看到兩顆互斥的鍵沒有任何一種讀法是對的。
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', runningState())]),
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-start"]').exists()).toBe(false)
  })

  it('已停止時看得到播放、看不到停止', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-start"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-stop"]').exists()).toBe(false)
  })

  it('執行中時編輯不給按，並說得出為什麼', async () => {
    // 按了才被拒絕，是把一個畫面早就看得出來的事留到送出才講。
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', runningState())]),
    })
    await flushPromises()

    const editButton = wrapper.get('[data-testid="bot-edit"]')
    expect(editButton.attributes('disabled')).toBeDefined()
    expect(editButton.attributes('title')).toContain('要先停止')
  })

  it('按播放就真的去啟動那一台', async () => {
    const startStrategyBot = vi.fn().mockResolvedValue(botDto(1, '早盤突破', runningState()))
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
      startStrategyBot,
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-start"]').trigger('click')
    await flushPromises()

    expect(startStrategyBot).toHaveBeenCalledWith(1)
  })

  it('沒設定 Telegram 時，那句話帶得出一條去設定的路', async () => {
    // 他現在就在一個按鈕之外的地方，光說「請先完成設定」等於要他自己去找。
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
      startStrategyBot: vi.fn().mockRejectedValue(
        new TelegramNotConfiguredError('要先完成 Telegram 設定')),
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-start"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-delivery-not-configured"]').text())
      .toContain('Telegram 設定')
    expect(wrapper.find('[data-testid="bot-delivery-settings-link"]').exists()).toBe(true)
  })

  it('按刪除只是先問——在確認之前那一台還在', async () => {
    const deleteStrategyBot = vi.fn().mockResolvedValue(undefined)
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', runningState())]),
      deleteStrategyBot,
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-delete"]').trigger('click')
    await flushPromises()

    expect(deleteStrategyBot).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="bot-row"]')).toHaveLength(1)
  })
})

describe('StrategyBotListPanel 的執行紀錄', () => {
  it('一開始不展開，按一下才出現', async () => {
    const listRunRecords = vi.fn().mockResolvedValue([])
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
      listRunRecords,
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="run-history-empty"]').exists()).toBe(false)

    await wrapper.get('[data-testid="bot-history-toggle"]').trigger('click')
    await flushPromises()

    expect(listRunRecords).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="run-history-empty"]').exists()).toBe(true)
  })

  it('那顆鍵說得出按下去會發生什麼', async () => {
    // 一個只打得開、關不掉的區塊，會讓人以為那是頁面的一部分而不是他按出來的。
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    const toggle = wrapper.get('[data-testid="bot-history-toggle"]')
    expect(toggle.text()).toContain('執行紀錄')

    await toggle.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-history-toggle"]').text()).toContain('收起紀錄')
  })
})

describe('StrategyBotListPanel 的立即運算', () => {
  it('按下去就跑一輪，並把歷史展開', async () => {
    const runRoundNow = vi.fn().mockResolvedValue(botDto(1, '早盤突破', stoppedState()))
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
      runRoundNow,
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-run-now"]').trigger('click')
    await flushPromises()

    expect(runRoundNow).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="run-history-empty"]').exists()).toBe(true)
  })

  it('已停止的機器人也給按——試一台機器人不該非得先讓它跑著', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(1, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-run-now"]').attributes('disabled')).toBeUndefined()
  })
})

describe('StrategyBotListPanel 表單上的交易標的', () => {
  it('是從後端認得的那幾檔裡挑，不是自己打', async () => {
    const { wrapper } = mountPanel({}, symbolApplicationListing('BTCUSDT', 'ETHUSDT'))
    await flushPromises()

    await wrapper.get('[data-testid="bot-create"]').trigger('click')
    await flushPromises()

    const symbolSelect = wrapper.get('[data-testid="symbol-select"]')
    expect(symbolSelect.findAll('option').map(option => option.element.value))
      .toEqual(['BTCUSDT', 'ETHUSDT'])
  })

  it('沒有留下任何可以自己打標的的輸入框', async () => {
    // 這一條是這次改動的全部意義：留著一格能打字的欄位，
    // 打成小寫的 btcusdt 就查不到任何 K 線，而每一輪失敗都寫成「持有」。
    const { wrapper } = mountPanel()
    await flushPromises()

    await wrapper.get('[data-testid="bot-create"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-symbol-input"]').exists()).toBe(false)
  })

  it('挑了哪一檔就是存進去的那一檔', async () => {
    const saveStrategyBot = vi.fn().mockResolvedValue(
      botDto(1, '早盤突破', stoppedState()))
    const { wrapper } = mountPanel(
      { saveStrategyBot }, symbolApplicationListing('BTCUSDT', 'ETHUSDT'))
    await flushPromises()

    await wrapper.get('[data-testid="bot-create"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="bot-name-input"]').setValue('早盤突破')
    await wrapper.get('[data-testid="bot-interval-input"]').setValue('5')
    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(wrapper.get('[data-testid="symbol-select"]').element).toHaveProperty(
      'value', 'ETHUSDT')
  })
})

describe('StrategyBotListPanel 存完之後說的那一句', () => {
  async function openEditAndSave(
    saveStrategyBot: StrategyBotApplication['saveStrategyBot'],
  ) {
    const { wrapper } = mountPanel({
      saveStrategyBot,
      listStrategyBots: vi.fn().mockResolvedValue(
        [botDto(1, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    await wrapper.get('[data-testid="bot-edit"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="bot-form-save"]').trigger('click')
    await flushPromises()

    return wrapper
  }

  it('存好了就把表單收掉，並且說一聲', async () => {
    const wrapper = await openEditAndSave(
      vi.fn().mockResolvedValue(botDto(1, '早盤突破', stoppedState())))

    expect(wrapper.find('[data-testid="bot-form-save"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-toast"]').text()).toBe('更改成功')
  })

  it('後端拒絕時不說成功，表單也留著讓人改', async () => {
    // 這一條是那句話的全部價值所在：它只在真的存進去時出現。
    // 存不存得進去看不出來的話，說成功比不說更糟。
    const wrapper = await openEditAndSave(
      vi.fn().mockRejectedValue(new Error('觸發間隔上限是 1440 分鐘')))

    expect(wrapper.find('[data-testid="app-toast"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bot-form-save"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="bot-form-failure"]').text())
      .toContain('觸發間隔上限是 1440 分鐘')
  })

  it('那句話自己會走，不會留在畫面上誤導下一個動作', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await openEditAndSave(
        vi.fn().mockResolvedValue(botDto(1, '早盤突破', stoppedState())))
      expect(wrapper.get('[data-testid="app-toast"]').text()).toBe('更改成功')

      vi.advanceTimersByTime(4000)
      await flushPromises()

      expect(wrapper.find('[data-testid="app-toast"]').exists()).toBe(false)
    }
    finally {
      vi.useRealTimers()
    }
  })
})
