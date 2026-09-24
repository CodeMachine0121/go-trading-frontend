import type { AppearanceApplication } from '~/application/appearance-application'
import type { AppearanceDto } from '~/domain/models/dto/appearance-dto'

const SYSTEM_PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * 整個操作台共用的一份外觀。
 *
 * 頂列的快速切換與設定頁的那一項看的是**同一份**，所以兩個入口永遠一致。
 * 它把實際的主題寫在 `<html data-theme>` 上——token 的淺色那一組就掛在那個屬性底下，
 * 元件因此一行都不必知道現在是哪一種主題。
 */
export function useAppearance(
  appearanceApplication: AppearanceApplication = useNuxtApp().$appearanceApplication,
) {
  const appearance = useState<AppearanceDto | null>('appearance', () => null)
  const listening = useState('appearance-listening', () => false)

  function systemPrefersDark(): boolean {
    return window.matchMedia(SYSTEM_PREFERS_DARK_QUERY).matches
  }

  function apply(nextAppearance: AppearanceDto): void {
    appearance.value = nextAppearance
    document.documentElement.dataset.theme = nextAppearance.resolvedTheme
  }

  /**
   * 還原記住的外觀並開始聽系統的深淺。只有第一次呼叫會掛上監聽——
   * 根元件叫它一次就夠，再叫也不會重複掛。
   */
  function initializeAppearance(): void {
    apply(appearanceApplication.restoreAppearance(systemPrefersDark()))

    if (listening.value) {
      return
    }
    listening.value = true

    window.matchMedia(SYSTEM_PREFERS_DARK_QUERY).addEventListener('change', (event) => {
      if (appearance.value !== null) {
        apply(appearanceApplication.resolveAppearance(appearance.value.choice, event.matches))
      }
    })
  }

  function selectAppearance(choice: string): void {
    apply(appearanceApplication.selectAppearance(choice, systemPrefersDark()))
  }

  return {
    appearance: computed(() => appearance.value),
    initializeAppearance,
    selectAppearance,
  }
}
