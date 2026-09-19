// @vitest-environment nuxt
// 樣板記著「側欄收起來了沒有」，而那份記憶要跨畫面活著（`useState`）——
// 需要 Nuxt runtime 才問得到它。
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'

/** 一台坐著用的機器：導覽是那條固定側欄。 */
const DESKTOP = 1280
/** 一隻手拿著的螢幕：導覽收進一片叫得出來的抽屜。 */
const PHONE = 390

function mountLayout(title = 'K 線瀏覽') {
  return mount(ConsoleLayout, {
    props: { title },
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
}

/** 在這個寬度下打開畫面。寬度要在掛載之前就定下來——樣板是在那一刻量的。 */
async function mountLayoutAt(width: number) {
  window.innerWidth = width
  const wrapper = mountLayout()
  await nextTick()

  return wrapper
}

async function resizeTo(wrapper: ReturnType<typeof mountLayout>, width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
  await nextTick()
}

describe('ConsoleLayout', () => {
  // 側欄收起來與否是**跨畫面共用**的一份狀態，所以它活得比任何一次掛載久——
  // 每個案例都從「側欄開著」開始，才不會讀到上一個案例按過的那一下。
  beforeEach(() => {
    clearNuxtState()
    window.innerWidth = DESKTOP
  })

  afterEach(() => {
    window.innerWidth = DESKTOP
    window.dispatchEvent(new Event('resize'))
  })

  it('呈現標題與內容插槽', () => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      slots: { default: '<p data-testid="content">內容</p>' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get('h1').text()).toBe('K 線瀏覽')
    expect(wrapper.get('[data-testid="content"]').text()).toBe('內容')
  })

  it('有副標就說出這個畫面怎麼用，沒有就不佔那一行', () => {
    const withSubtitle = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽', subtitle: '一次最多一千根' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(withSubtitle.text()).toContain('一次最多一千根')
    expect(mountLayout().find('p').exists()).toBe(false)
  })

  it('提供各畫面之間的導覽', () => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: '連線狀態' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.text()).toContain('連線狀態')
    expect(wrapper.text()).toContain('K 線瀏覽')
    expect(wrapper.text()).toContain('K 線圖表')
    expect(wrapper.text()).toContain('指標計算')
    expect(wrapper.text()).toContain('策略機器人')
  })

  it('側欄收得起來，而且收起來之後每個畫面都還在', () => {
    // 收起來的是那幾個字，不是那幾個地方——整條藏起來會逼使用者為了回去而先展開。
    const wrapper = mountLayout('K 線圖表')

    wrapper.get('[data-testid="toggle-rail"]').trigger('click')

    // 名字仍然在 DOM 裡（只是看不見）：拿掉它們，讀螢幕的人聽到的
    // 就是一排沒有名字的連結，而那條側欄等於壞了。
    expect(wrapper.findAll('a')).toHaveLength(9)
    expect(wrapper.text()).toContain('指標計算')
    expect(wrapper.text()).toContain('觀察清單')
    expect(wrapper.text()).toContain('設定')
  })

  it('收起來的側欄在走到下一個畫面時不會自己彈回來', async () => {
    // 每換一個畫面，樣板就重新掛載一次。收起側欄的人是為了讓工作區寬一點，
    // 那個理由不會因為他走去看另一張表就消失。
    const onOneScreen = mountLayout('K 線圖表')
    await onOneScreen.get('[data-testid="toggle-rail"]').trigger('click')
    onOneScreen.unmount()

    const onTheNextScreen = mountLayout('指標計算')

    expect(onTheNextScreen.get('[data-testid="toggle-rail"]').attributes('aria-label'))
      .toBe('展開側欄')
  })

  it('收起來那顆鍵自己說它要做哪一件事', async () => {
    const wrapper = mountLayout('K 線圖表')

    expect(wrapper.get('[data-testid="toggle-rail"]').attributes('aria-label')).toBe('收起側欄')

    await wrapper.get('[data-testid="toggle-rail"]').trigger('click')

    expect(wrapper.get('[data-testid="toggle-rail"]').attributes('aria-label')).toBe('展開側欄')
  })

  it.each([
    ['時區選單', 'timezone', 'time-zone', '台北（UTC+08:00）'],
    ['後端狀態那顆燈', 'status', 'status', '可用'],
  ])('外框留一個位置給%s', (_label, slotName, testId, content) => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      slots: { [slotName]: `<span data-testid="${testId}">${content}</span>` },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get(`[data-testid="${testId}"]`).text()).toBe(content)
  })

  describe('窄螢幕上導覽收進一片叫得出來的抽屜', () => {
    it('平時只有一顆鍵，九個去處還沒被叫出來', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('false')
    })

    it('按下那顆鍵，九個去處一次全看得到', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('true')
      expect(wrapper.findAll('a')).toHaveLength(9)
    })

    it('挑了一個去處，抽屜自己收起來', async () => {
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      await wrapper.findAll('a')[0]?.trigger('click')

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('false')
    })

    it('點抽屜外面只是把它收起來，不會換到別的畫面', async () => {
      // 叫出去處清單之後改變主意，是這裡最常發生的一件事。
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      await wrapper.get('[data-testid="navigation-scrim"]').trigger('click')

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('false')
      expect(wrapper.find('[data-testid="navigation-scrim"]').exists()).toBe(false)
    })

    it('按 Esc 也收得起來', async () => {
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('false')
    })

    it('按別的鍵不會把抽屜收起來', async () => {
      // 只有 Esc 是「收起疊在畫面上的東西」，其餘每一個鍵都與它無關——
      // 在抽屜裡用方向鍵走過九個去處的人，不該走到一半整片消失。
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      await nextTick()

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('true')
    })

    it('那顆鍵自己說它要做哪一件事', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-label'))
        .toBe('開啟導覽')

      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-label'))
        .toBe('關閉導覽')
    })

    it('寬螢幕上那顆鍵不存在——一顆什麼都不做的鍵是一條假的路', async () => {
      const wrapper = await mountLayoutAt(1024)

      expect(wrapper.find('[data-testid="toggle-navigation"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="toggle-rail"]').exists()).toBe(true)
    })

    it('視窗被拉寬之後，開著的抽屜不會留在那裡', async () => {
      // 不收掉的話，使用者把視窗拉寬再拉窄回來，抽屜會自己跳出來，
      // 而他沒有按過任何東西。
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="toggle-navigation"]').trigger('click')

      await resizeTo(wrapper, DESKTOP)
      await resizeTo(wrapper, PHONE)

      expect(wrapper.get('[data-testid="toggle-navigation"]').attributes('aria-expanded'))
        .toBe('false')
    })

    it.each([
      ['窄螢幕', PHONE],
      ['寬螢幕', DESKTOP],
    ])('%s上九個去處都只出現一次——兩份導覽會讓讀螢幕的人聽到兩遍', async (_label, width) => {
      const wrapper = await mountLayoutAt(width)

      expect(wrapper.findAll('nav')).toHaveLength(1)
      expect(wrapper.findAll('a')).toHaveLength(9)
    })
  })
})
