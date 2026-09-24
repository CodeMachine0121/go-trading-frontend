import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import SettingsPage from '~/pages/settings/index.vue'
import { AppearanceDomain } from '~/domain/models/domains/appearance-domain'

// 設定頁的「顯示」那一段只做接線：外觀與時區取用的是頂列同一份共用狀態，
// 這裡只看在這一段選了什麼，就往那一份狀態說什麼——兩個入口因此永遠一致。
const selectAppearance = vi.hoisted(() => vi.fn())
const selectTimeZone = vi.hoisted(() => vi.fn())

mockNuxtImport('definePageMeta', () => () => {})
mockNuxtImport('useAppearance', () => () => ({
  appearance: computed(() => new AppearanceDomain('dark', false).toDto()),
  selectAppearance,
}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [],
  selectedTimeZone: computed(() => ({ identifier: 'UTC' })),
  selectTimeZone,
}))
mockNuxtImport('useUserSession', () => () => ({ currentUser: ref(null), signOut: vi.fn() }))
// 密碼與 Telegram 那兩段在這裡被換成替身，它們的狀態只要「每一格都在」就夠了。
function stateWithEveryFieldEmpty() {
  return new Proxy({}, { get: () => ref(null) })
}
mockNuxtImport('usePasswordChange', () => () => stateWithEveryFieldEmpty())
mockNuxtImport('useTelegramDelivery', () => () => {
  const state = stateWithEveryFieldEmpty()
  return new Proxy(state, {
    get: (target, key) => key === 'loadDeliverySetting' ? vi.fn() : Reflect.get(target, key),
  })
})

const STUBS = {
  AccountProfilePanel: true,
  PasswordChangePanel: true,
  TelegramDeliveryPanel: true,
  TimeZoneField: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<button data-testid="time-zone-stub" @click="$emit(\'update:modelValue\', \'Asia/Taipei\')">{{ modelValue }}</button>',
  },
}

describe('設定頁：顯示', () => {
  it('外觀那一項顯示目前的選擇', () => {
    const wrapper = mount(SettingsPage, { global: { stubs: STUBS } })

    expect(wrapper.get('[data-testid="tab-dark"]').attributes('aria-selected')).toBe('true')
  })

  it.each(['light', 'system'] as const)('在這裡選了 %s，就往共用的外觀狀態說出它', async (choice) => {
    selectAppearance.mockClear()
    const wrapper = mount(SettingsPage, { global: { stubs: STUBS } })

    await wrapper.get(`[data-testid="tab-${choice}"]`).trigger('click')

    expect(selectAppearance).toHaveBeenCalledWith(choice)
  })

  it('在這裡換顯示時區，換的是共用的那一份', async () => {
    const wrapper = mount(SettingsPage, { global: { stubs: STUBS } })

    await wrapper.get('[data-testid="time-zone-stub"]').trigger('click')

    expect(selectTimeZone).toHaveBeenCalledWith('Asia/Taipei')
  })
})
