// @vitest-environment nuxt
// 樣板記著「側欄收起來了沒有」，而那份記憶要跨畫面活著（`useState`）——
// 需要 Nuxt runtime 才問得到它。
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'

/**
 * 現在停在哪一條路由。
 *
 * 路由是框架的邊界，所以它是替身——真的去 push 會被「還沒登入就回登入頁」
 * 那條全域中介攔下來，而這裡要問的與登入沒有關係。
 */
const { rawRoute } = vi.hoisted(() => ({ rawRoute: { path: '/login', fullPath: '/login' } }))
mockNuxtImport('useRoute', () => () => reactive(rawRoute))

function stopAt(path: string) {
  const route = reactive(rawRoute)
  route.path = path
  route.fullPath = path
}

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
    stopAt('/login')
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

  it('提供各畫面之間的導覽，而且是照那個順序', () => {
    // 逐字、逐順序地釘住整張去處表，而不是問「有沒有提到某幾個字」——
    // 「策略腳本」是好幾個名字的前綴（它一度也是「策略腳本市集」的），
    // 所以那種問法分不開相鄰的兩格。
    //
    // 順序本身是規則的一部分：中間那幾個照「寫腳本 → 逛市集 → 拼規則 → 派機器人」排。
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.findAll('.console-layout__link-label').map(label => label.text()))
      .toEqual([
        'K 線瀏覽',
        'K 線圖表',
        '策略腳本',
        'Marketplace',
        '交易策略',
        '策略機器人',
        'AI-Assistant',
        '設定',
      ])
  })

  it('側欄上每一格的圖示都不一樣', () => {
    // 兩個去處共用一顆圖示，等於側欄上有兩格長得一模一樣——
    // 而使用者在側欄上找東西，多半是先認圖示再讀字。
    const wrapper = mountLayout()

    const icons = wrapper.findAll('.console-layout__link svg')
      .map(icon => icon.attributes('data-icon'))

    expect(icons).toHaveLength(8)
    expect(new Set(icons).size).toBe(8)
  })

  it('連線狀態已經不是一個去處了', () => {
    // 那一頁只在說側欄那顆燈在每一頁都說得出來的事。
    const wrapper = mountLayout()

    expect(wrapper.findAll('.console-layout__link-label').map(label => label.text()))
      .not.toContain('連線狀態')
    expect(wrapper.find('[data-testid="more-/"]').exists()).toBe(false)
  })

  it('觀察清單已經不是一個去處了', () => {
    // 它做的是一次性的設定，卻佔著窄螢幕底部四格中的一格。
    const wrapper = mountLayout()

    expect(wrapper.text()).not.toContain('觀察清單')
    expect(wrapper.findAll('a').map(link => link.attributes('href') ?? ''))
      .not.toContain('/watchlist')
  })

  it('側欄收得起來，而且收起來之後每個畫面都還在', () => {
    // 收起來的是那幾個字，不是那幾個地方——整條藏起來會逼使用者為了回去而先展開。
    const wrapper = mountLayout('K 線圖表')

    wrapper.get('[data-testid="toggle-rail"]').trigger('click')

    // 名字仍然在 DOM 裡（只是看不見）：拿掉它們，讀螢幕的人聽到的
    // 就是一排沒有名字的連結，而那條側欄等於壞了。
    expect(wrapper.findAll('a')).toHaveLength(8)
    expect(wrapper.text()).toContain('策略腳本')
    expect(wrapper.text()).toContain('交易策略')
    expect(wrapper.text()).toContain('設定')
  })

  it('收起來的側欄在走到下一個畫面時不會自己彈回來', async () => {
    // 每換一個畫面，樣板就重新掛載一次。收起側欄的人是為了讓工作區寬一點，
    // 那個理由不會因為他走去看另一張表就消失。
    const onOneScreen = mountLayout('K 線圖表')
    await onOneScreen.get('[data-testid="toggle-rail"]').trigger('click')
    onOneScreen.unmount()

    const onTheNextScreen = mountLayout('策略腳本')

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

  describe('窄螢幕上導覽貼在畫面底部', () => {
    it('常用的四個直接露出來，加上一顆「更多」', async () => {
      // 一排超過五格，每一格就窄到放不下一個讀得出來的名字。
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="tab-/k-candles/chart"]').text()).toContain('K 線圖表')
      expect(wrapper.get('[data-testid="tab-/strategy-scripts"]').text()).toContain('策略腳本')
      expect(wrapper.get('[data-testid="tab-/strategy-bots"]').text()).toContain('策略機器人')
      expect(wrapper.get('[data-testid="tab-/chat"]').text()).toContain('AI-Assistant')
      expect(wrapper.get('[data-testid="tab-more"]').text()).toContain('更多')
    })

    it('去處永遠看得見，不必先按一顆鍵才知道自己能去哪裡', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.findAll('[data-testid^="tab-"]')).toHaveLength(5)
    })

    it('其餘四個收在「更多」那張紙裡，連同那顆燈與現在是誰在用', async () => {
      // 側欄底部那兩樣在窄螢幕上沒有側欄可待，而它們與「我還能去哪裡」
      // 回答的是同一個問題：這條線路現在怎麼了。
      const wrapper = mount(ConsoleLayout, {
        props: { title: 'K 線圖表' },
        slots: {
          status: '<span data-testid="status">可用</span>',
          account: '<span data-testid="account">james</span>',
        },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
      })
      window.innerWidth = PHONE
      window.dispatchEvent(new Event('resize'))
      await nextTick()

      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      expect(wrapper.get('[data-testid="more-/k-candles"]').text()).toContain('K 線瀏覽')
      expect(wrapper.get('[data-testid="more-/marketplace"]').text()).toContain('Marketplace')
      expect(wrapper.get('[data-testid="more-/trading-strategies"]').text())
        .toContain('交易策略')
      expect(wrapper.get('[data-testid="more-/settings"]').text()).toContain('設定')
      expect(wrapper.get('[data-testid="status"]').text()).toBe('可用')
      expect(wrapper.get('[data-testid="account"]').text()).toBe('james')
    })

    it('沒按「更多」以前那張紙不在', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.find('[data-testid="more-/settings"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="tab-more"]').attributes('aria-expanded')).toBe('false')
    })

    it('八個去處加起來出現一次，不多不少', async () => {
      // 四格加四條，剛好是側欄上的那八個——兩份導覽會讓讀螢幕的人聽到兩遍。
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      expect(wrapper.findAll('nav')).toHaveLength(1)
      expect(wrapper.findAll('a')).toHaveLength(8)
    })

    it('待在「更多」裡面的那一頁時，那一格自己會亮', async () => {
      // 底下四格沒有一格是亮的，那一排讀起來像「我不在任何地方」。
      stopAt('/settings')
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="tab-more"]').classes())
        .toContain('console-layout__tab--current')
    })

    it('待在底下那四格其中一格時，「更多」不亮', async () => {
      stopAt('/strategy-scripts')
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="tab-more"]').classes())
        .not.toContain('console-layout__tab--current')
    })

    it('走到別的畫面，那張紙自己收起來', async () => {
      // 它的任務在使用者挑完那一刻就結束了。
      stopAt('/strategy-scripts')
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="tab-more"]').trigger('click')
      expect(wrapper.find('[data-testid="more-/settings"]').exists()).toBe(true)

      stopAt('/marketplace')
      await nextTick()

      expect(wrapper.find('[data-testid="more-/settings"]').exists()).toBe(false)
    })

    it('「更多」那張紙關得掉', async () => {
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      await wrapper.get('[aria-label="關閉"]').trigger('click')

      expect(wrapper.find('[data-testid="more-/settings"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="tab-more"]').attributes('aria-expanded')).toBe('false')
    })

    it('視窗拉寬再拉窄，開著的那張紙不會自己跳回來', async () => {
      // 不收掉的話那個「開著」會留在狀態裡，而使用者沒有按過任何東西。
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      await resizeTo(wrapper, DESKTOP)
      await resizeTo(wrapper, PHONE)

      expect(wrapper.find('[data-testid="more-/settings"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="tab-more"]').attributes('aria-expanded')).toBe('false')
    })

    it('把視窗拉寬，外框就換成側欄那一種，反過來也是', async () => {
      const wrapper = await mountLayoutAt(PHONE)
      expect(wrapper.find('[data-testid="tab-more"]').exists()).toBe(true)

      await resizeTo(wrapper, DESKTOP)

      expect(wrapper.find('[data-testid="tab-more"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="toggle-rail"]').exists()).toBe(true)

      await resizeTo(wrapper, PHONE)

      expect(wrapper.find('[data-testid="tab-more"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="toggle-rail"]').exists()).toBe(false)
    })

    it('寬螢幕上沒有底部那一排，側欄照舊', async () => {
      const wrapper = await mountLayoutAt(1024)

      expect(wrapper.find('[data-testid="tab-more"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="toggle-rail"]').exists()).toBe(true)
      expect(wrapper.findAll('a')).toHaveLength(8)
    })
  })
})
