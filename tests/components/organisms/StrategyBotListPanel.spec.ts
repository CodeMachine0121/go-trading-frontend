// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBotListPanel from '~/components/organisms/StrategyBotListPanel.vue'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'

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
    id, name, 'BTCUSDT', 5, 9, '黃金交叉',
    runState,
    null,
  )
}

function mountPanel(overrides: Partial<StrategyBotApplication> = {}) {
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

  const wrapper = mount(StrategyBotListPanel, {
    props: {
      strategyBotApplication: strategyBotApplication as unknown as StrategyBotApplication,
      timeZoneIdentifier: 'Asia/Taipei',
    },
    // 連結要照樣渲染出 href：那正是這幾條測試在問的事。
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
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

describe('StrategyBotListPanel 走去工作台的那兩條路', () => {
  it('新增是一條路由，不是一個浮在清單上的對話框', async () => {
    // 拼一台機器人要看到的東西遠多於一個對話框裝得下，而一個功能兩個入口，
    // 兩邊都要維護、遲早不一致。
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-create"]').attributes('href'))
      .toBe('/strategy-bots/new')
  })

  it('已停止的那一台，編輯帶得到它自己的那一頁', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(7, '早盤突破', stoppedState())]),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-edit"]').attributes('href'))
      .toBe('/strategy-bots/7')
  })

  it('執行中的那一台，編輯不是連結——一個 disabled 的連結照樣點得進去', async () => {
    const { wrapper } = mountPanel({
      listStrategyBots: vi.fn().mockResolvedValue([botDto(7, '早盤突破', runningState())]),
    })
    await flushPromises()

    const edit = wrapper.get('[data-testid="bot-edit"]')

    expect(edit.attributes('href')).toBeUndefined()
    expect(edit.attributes('disabled')).toBeDefined()
    expect(edit.attributes('title')).toContain('停止')
  })

  it('清單上不會浮出任何拼機器人的對話框', async () => {
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-name-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bot-form-save"]').exists()).toBe(false)
  })
})

describe('StrategyBotListPanel 上那一句「存好了」', () => {
  it('說這句話的是工作台，看到它的是這一頁——所以它跨得過換頁', async () => {
    // 存好一台機器人之後使用者已經被送回清單了。留在工作台說的話，
    // 會在換頁那一瞬間跟著消失，等於沒說。
    const { announce } = useConsoleAnnouncement()
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-testid="app-toast"]').exists()).toBe(false)

    announce('更改成功')
    await flushPromises()

    expect(wrapper.get('[data-testid="app-toast"]').text()).toBe('更改成功')
  })
})
