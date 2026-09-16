// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppButton from '~/components/atoms/AppButton.vue'

// 這個檔案**故意不替換 NuxtLink**。
//
// 其餘的測試都把它換成自己的替身（它們問的是「這顆按鈕帶去哪裡」，不是「連結長什麼樣」），
// 而替身永遠找得到——所以那些測試全綠的同時，真正跑起來的畫面在印
// 「Failed to resolve component: NuxtLink」，連結靜靜渲染成一個空殼。
//
// 一個把被測的東西換掉的測試，問不出那個東西在不在。這一條就是為了問那件事。
describe('AppButton 當成連結用', () => {
  it('給了 to 就真的拿到那個元件，不是一個查不到的名字', () => {
    // 查不到的時候 Vue 會把那個名字**當成一個標籤名**照樣渲染出去——
    // 畫面上出現一個 <nuxtlink>，它不是連結、點了什麼都不會發生，
    // 而唯一的線索是主控台裡一行警告。所以這裡問的正是那個標籤名。
    //
    // 這個測試環境沒有裝 router，所以真的拿到 NuxtLink 時它會停在 RouterLink——
    // 那已經足以分辨「拿到了」與「沒拿到」，而那正是這條要問的事。
    const wrapper = mount(AppButton, {
      props: { to: '/strategy-bots/new' },
      slots: { default: '拼一台機器人' },
    })

    expect(wrapper.element.tagName).not.toBe('NUXTLINK')
    expect(wrapper.element.tagName).not.toBe('BUTTON')
    expect(wrapper.html()).toContain('/strategy-bots/new')
    expect(wrapper.text()).toBe('拼一台機器人')
  })

  it('長相跟一般的按鈕一模一樣——它只是去得了別的地方', () => {
    const wrapper = mount(AppButton, {
      props: { to: '/strategy-bots/new', variant: 'ghost' },
      slots: { default: '編輯' },
    })

    expect(wrapper.classes()).toContain('app-button')
    expect(wrapper.classes()).toContain('app-button--ghost')
  })

  it('沒給 to 就還是一顆按鈕', () => {
    const wrapper = mount(AppButton, { slots: { default: '儲存' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })
})
