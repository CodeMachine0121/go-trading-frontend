/**
 * 抽屜開著沒有。
 *
 * 它與「我們正在談什麼」（useAssistantConversation）刻意分開：
 * 一個是純粹的畫面開關，一個是要活過抽屜開關與畫面切換的對話。
 * 合成一個的話，關掉抽屜就會有人順手把對話一起清掉。
 *
 * **換畫面即關**。抽屜是隨手問一句的地方，不是常駐側欄——
 * 跟著使用者走到下一個畫面的浮層，會遮住他真正想去看的東西。
 */
export function useAssistantDrawer() {
  const open = useState('assistant-drawer-open', () => false)
  const route = useRoute()

  watch(() => route.fullPath, () => {
    open.value = false
  })

  function openDrawer(): void {
    open.value = true
  }

  function closeDrawer(): void {
    open.value = false
  }

  return { open, openDrawer, closeDrawer }
}
