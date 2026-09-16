import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TelegramDeliveryPanel from '~/components/organisms/TelegramDeliveryPanel.vue'
import { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'

const CONFIGURED = new TelegramDeliveryDto(true, '987654', '1234', '金鑰結尾 1234')
const UNCONFIGURED = new TelegramDeliveryDto(false, '', '', null)

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(TelegramDeliveryPanel, {
    props: {
      botToken: '',
      chatId: '',
      message: '這是一則來自 go-trading 的測試訊息。',
      maximumCharacterCount: 4096,
      formVisible: true,
      ...props,
    },
  })
}

/** 已經連上、而且那兩格是收起來的——這是設定好之後平常看到的樣子。 */
function mountConnected(props: Record<string, unknown> = {}) {
  return mountPanel({ setting: CONFIGURED, formVisible: false, chatId: '987654', ...props })
}

describe('TelegramDeliveryPanel：目前的狀態', () => {
  it('讀取中與「還沒有設定」是兩種狀態', () => {
    // 已經設定過的人若在讀取的那半秒被告知他沒有設定，他會以為設定不見了。
    const wrapper = mountPanel({ loading: true })

    expect(wrapper.find('[data-testid="telegram-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="telegram-unconfigured"]').exists()).toBe(false)
  })

  it('還沒設定過時明說，而且不是紅字', () => {
    // 它是這一段的正常起點，不是出了什麼事。
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    expect(wrapper.get('[data-testid="telegram-unconfigured"]').text()).toContain('還沒有設定')
    expect(wrapper.find('[data-testid="telegram-load-error"]').exists()).toBe(false)
  })

  it('還沒設定過時那兩格直接攤開——它們本來就得填', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    expect(wrapper.find('[data-testid="bot-token-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="telegram-cancel"]').exists()).toBe(false)
  })

  it('讀不到設定與沒有設定分得開', () => {
    const wrapper = mountPanel({ loadErrorMessage: '連不上後端 go-trading API' })

    expect(wrapper.get('[data-testid="telegram-load-error"]').text()).toContain('連不上後端')
    expect(wrapper.find('[data-testid="telegram-unconfigured"]').exists()).toBe(false)
  })

  it('已連上時讀起來像一列紀錄：認得出是哪一組、送去哪裡', () => {
    const wrapper = mountConnected()

    const connection = wrapper.get('[data-testid="telegram-summary"]').text()
    expect(connection).toContain('已連線')
    expect(connection).toContain('金鑰結尾 1234')
    expect(connection).toContain('987654')
  })

  it('已連上時那兩格是收起來的', () => {
    // 金鑰拿不回來，所以一個永遠空著的密碼框擺在「已連線」底下，
    // 看起來像設定掉了。
    const wrapper = mountConnected()

    expect(wrapper.find('[data-testid="bot-token-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-id-input"]').exists()).toBe(false)
  })

  it('按「更換金鑰」才把那兩格叫出來', () => {
    const wrapper = mountConnected()

    return wrapper.get('[data-testid="telegram-edit"]').trigger('click').then(() => {
      expect(wrapper.emitted('startEditing')).toHaveLength(1)
    })
  })

  it('換到一半可以取消，還沒設定過時則沒有取消可按', () => {
    const editingWrapper = mountPanel({ setting: CONFIGURED, formVisible: true, editing: true })
    expect(editingWrapper.find('[data-testid="telegram-cancel"]').exists()).toBe(true)

    const firstTimeWrapper = mountPanel({ setting: UNCONFIGURED })
    expect(firstTimeWrapper.find('[data-testid="telegram-cancel"]').exists()).toBe(false)
  })

  it('金鑰那一格永遠是空的，並說明為什麼', () => {
    // 它已經拿不回來了，留半串在畫面上只會讓人以為它還在。
    const wrapper = mountPanel({ setting: CONFIGURED, editing: true })

    expect((wrapper.get('[data-testid="bot-token-input"]').element as HTMLInputElement).value)
      .toBe('')
    expect(wrapper.text()).toContain('存進去之後就拿不回來')
  })
})

describe('TelegramDeliveryPanel：儲存與移除', () => {
  it('兩格都有東西才存得下去', async () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    expect(wrapper.get('[data-testid="telegram-save"]').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ botToken: '123456:AAH', chatId: '987654' })

    expect(wrapper.get('[data-testid="telegram-save"]').attributes('disabled')).toBeUndefined()
  })

  it('只填了空白不算填了', async () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED, botToken: '   ', chatId: '987654' })

    expect(wrapper.get('[data-testid="telegram-save"]').attributes('disabled')).toBeDefined()
  })

  it('按下儲存就說一聲', async () => {
    const wrapper = mountPanel({
      setting: UNCONFIGURED, botToken: '123456:AAH', chatId: '987654',
    })

    await wrapper.get('[data-testid="telegram-save"]').trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('還沒設定過就沒有「移除」可按', () => {
    expect(mountPanel({ setting: UNCONFIGURED }).find('[data-testid="telegram-remove"]').exists())
      .toBe(false)
  })

  it('移除要先確認過才真的移除', async () => {
    // 手滑掉的話，要回到現在這個狀態得重新貼一整串金鑰——它已經拿不回來了。
    const wrapper = mountConnected()

    await wrapper.get('[data-testid="telegram-remove"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('取消就什麼都不變', async () => {
    const wrapper = mountConnected()

    await wrapper.get('[data-testid="telegram-remove"]').trigger('click')
    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('cancel')

    expect(wrapper.emitted('remove')).toBeUndefined()
  })
})

describe('TelegramDeliveryPanel：試送一則訊息', () => {
  it('輸入框預先填好一句可以直接送的話', () => {
    // 預填是為了讓「按一下就知道通不通」真的只要按一下。
    const wrapper = mountPanel({ setting: CONFIGURED })

    expect((wrapper.get('[data-testid="test-message-input"]').element as HTMLTextAreaElement).value)
      .toBe('這是一則來自 go-trading 的測試訊息。')
  })

  it('還沒設定過時那顆鍵按不下去，而且說得出為什麼', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED, canSendTestMessage: false })

    expect(wrapper.get('[data-testid="test-message-send"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="test-message-blocked"]').text()).toContain('先完成上面的 Telegram 設定')
  })

  it('可以送的時候按下去就說一聲', async () => {
    const wrapper = mountPanel({ setting: CONFIGURED, canSendTestMessage: true })

    await wrapper.get('[data-testid="test-message-send"]').trigger('click')

    expect(wrapper.emitted('sendTestMessage')).toHaveLength(1)
  })

  it('送出中那顆鍵說得出自己在忙', () => {
    const wrapper = mountPanel({ setting: CONFIGURED, sending: true, canSendTestMessage: false })

    expect(wrapper.get('[data-testid="test-message-send"]').text()).toBe('送出中…')
    expect(wrapper.get('[data-testid="test-message-send"]').attributes('disabled')).toBeDefined()
  })

  it('隨時看得到現在有幾個字、上限幾個字', () => {
    const wrapper = mountPanel({
      setting: CONFIGURED, characterCount: 4097, maximumCharacterCount: 4096,
    })

    expect(wrapper.text()).toContain('4097 / 4096 個字')
  })

  it('訊息不合規時說在那一格底下', () => {
    const wrapper = mountPanel({
      setting: CONFIGURED, messageError: '一則訊息上限為 4096 個字元，目前有 4097 個',
    })

    expect(wrapper.text()).toContain('一則訊息上限為 4096 個字元，目前有 4097 個')
  })

  it('送成功說成功', () => {
    const wrapper = mountPanel({
      setting: CONFIGURED, sendSucceeded: true, sendResultMessage: '送出成功，去 Telegram 看看那則訊息。',
    })

    expect(wrapper.get('[data-testid="test-message-result"]').text()).toContain('送出成功')
  })

  it.each([
    ['Telegram 不接受這組機器人金鑰，請重新填一次整串金鑰。'],
    ['Telegram 送不到這個聊天室。確認聊天室代號，並確認你已經在 Telegram 對這個 bot 按過 Start——它不能主動私訊沒找過它的人。'],
    ['連不上 Telegram，請稍後再試。'],
    ['Telegram 太久沒有回答，這一則當作沒送成，請稍後再試。'],
  ])('送不成時把那一句原樣說出來：%s', (sentence) => {
    // 這顆鍵的全部價值就在於它會說出是哪一格填錯。
    const wrapper = mountPanel({
      setting: CONFIGURED, sendSucceeded: false, sendResultMessage: sentence,
    })

    expect(wrapper.get('[data-testid="test-message-result"]').text()).toContain(sentence)
  })
})

describe('TelegramDeliveryPanel：三格都往上綁', () => {
  it.each([
    ['bot-token-input', 'update:botToken', '123456:AAH'],
    ['chat-id-input', 'update:chatId', '987654'],
    ['test-message-input', 'update:message', '換一句話'],
  ])('改 %s 就把新的值往上送', async (testId, event, value) => {
    const wrapper = mountPanel({ setting: CONFIGURED })

    await wrapper.find(`[data-testid="${testId}"]`).setValue(value)

    expect(wrapper.emitted(event)).toEqual([[value]])
  })

  it('換一組時那顆鍵說的是「更換設定」，第一次設定時說「儲存設定」', async () => {
    // 兩個字的差別就是使用者知不知道自己正在覆蓋掉一份既有的設定。
    const wrapper = mountPanel({
      setting: CONFIGURED, editing: true, botToken: '123456:AAH', chatId: '987654',
    })

    expect(wrapper.get('[data-testid="telegram-save"]').text()).toBe('更換設定')

    await wrapper.setProps({ setting: UNCONFIGURED, editing: false })
    expect(wrapper.get('[data-testid="telegram-save"]').text()).toBe('儲存設定')
  })

  it('儲存中那顆鍵說得出自己在忙', () => {
    const wrapper = mountPanel({
      setting: CONFIGURED, botToken: '123456:AAH', chatId: '987654', saving: true,
    })

    expect(wrapper.get('[data-testid="telegram-save"]').text()).toBe('儲存中…')
    expect(wrapper.get('[data-testid="telegram-save"]').attributes('disabled')).toBeDefined()
  })

  it('訊息不合規時那一格自己也標出來', () => {
    const wrapper = mountPanel({ setting: CONFIGURED, messageError: '訊息不得為空白' })

    expect(wrapper.get('[data-testid="test-message-input"]').attributes('aria-invalid'))
      .toBe('true')
  })

  it('儲存失敗的話說在那張卡上', () => {
    const wrapper = mountPanel({
      setting: UNCONFIGURED, saveErrorMessage: '系統目前無法安全保存機器人金鑰',
    })

    expect(wrapper.get('[data-testid="telegram-save-error"]').text())
      .toContain('系統目前無法安全保存機器人金鑰')
  })
})
