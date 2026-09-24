<script setup lang="ts">
import AssistantDrawer from '~/components/organisms/AssistantDrawer.vue'
import AppProgressBar from '~/components/atoms/AppProgressBar.vue'

// 應用程式的根，也是助手抽屜的接線處。
//
// 抽屜掛在這裡而不是塞進 ConsoleLayout，理由有兩個：樣板**不得綁任何資料**，
// 而它要顯示對話與記住的寬度；而且「每一個畫面都叫得出來」的意思就是
// 它得在 NuxtPage 之外。叫出它的是頂列的助手鍵（layouts/console），
// 兩邊取用的是同一份 useAssistantDrawer 狀態。
//
// 這裡與 /chat 那一頁取用的是**同一份共用狀態**，所以在抽屜問完展開過去，
// 剛才那一則還在。

// 外觀在第一個畫面畫出來之前就要套上，否則選了淺色的人會先看到一瞬間的深色。
// 整台操作台只在瀏覽器裡畫（ssr: false），所以這裡的 setup 就已經在瀏覽器裡。
const { initializeAppearance } = useAppearance()
initializeAppearance()

const { open, closeDrawer } = useAssistantDrawer()

// 助手要花錢，而且它讀得到行情——沒登入的人不該叫得出它，**還沒被放行的人也一樣**。
// 抽屜因此跟著「這個人能不能用這台操作台」出現與消失，而不是永遠掛在那裡。
const { currentUser, awaitingActivation } = useUserSession()

/** 這個人進得了操作台。助手抽屜只對他存在。 */
const mayUseConsole = computed(() => currentUser.value !== null && !awaitingActivation.value)

const {
  suggestedPrompts,
  conversationId,
  messages,
  draft,
  pending,
  rejectionMessage,
  conversations,
  conversationsErrorMessage,
  ask,
  retry,
  startNewConversation,
  selectConversation,
  loadConversations,
  resumeCurrentConversation,
} = useAssistantConversation()
const { selectedTimeZone } = useSelectedTimeZone()

const {
  width: drawerWidth,
  resizing,
  loadDrawerWidth,
  keepDrawerWidthUsable,
  startResize,
  moveResize,
  endResize,
} = useAssistantDrawerWidth()

// 現在這個寬度代表什麼。這裡用到的是「助手蓋不蓋滿整個畫面」。
const { layoutDensity } = useLayoutDensity()

/**
 * 拉動抽屜那條邊。事件掛在 window 上，因為手一快就會離開那條細邊——
 * 掛在邊上的話，拉到一半游標跑出去，寬度就停在半路上不動了。
 */
function onResizeStart(pointerX: number): void {
  startResize(pointerX)

  const onMove = (event: PointerEvent): void => moveResize(event.clientX)
  const onUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    endResize()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// 頂端那條進度條：畫面正在等系統回話，或正在換頁。
const { visible: waiting, followNavigation } = useRequestActivity()
followNavigation()

// 抽屜寬度記在瀏覽器裡，所以只有到了瀏覽器才讀得到。
onMounted(() => {
  loadDrawerWidth()

  // 視窗變小時，抽屜要收回看得見、還能用的寬度。
  window.addEventListener('resize', keepDrawerWidthUsable)

  // 回到上次看的那一段。這一行是「重新整理之後還看得到助手在寫」發生的地方：
  // 跨畫面共用的那份狀態撐不過整頁重新載入，所以哪一段要靠瀏覽器記著。
  //
  // 它放在這裡而不是助手那一頁，因為抽屜在**每一個畫面**都叫得出來——
  // 只在那一頁接回去的話，重整之後停在別的畫面的人就接不回去。
  void resumeCurrentConversation()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', keepDrawerWidthUsable)
})
</script>

<template>
  <AppProgressBar :active="waiting" />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <AssistantDrawer
    v-if="mayUseConsole"
    v-model:draft="draft"
    :open="open"
    :messages="messages"
    :pending="pending"
    :rejection-message="rejectionMessage"
    :suggested-prompts="suggestedPrompts"
    :time-zone="selectedTimeZone"
    :conversations="conversations"
    :active-conversation-id="conversationId"
    :conversations-error-message="conversationsErrorMessage"
    :width="drawerWidth"
    :resizing="resizing"
    :covers-screen="layoutDensity.assistantCoversScreen"
    @close-drawer="closeDrawer()"
    @send="question => ask(question)"
    @retry="retry()"
    @start-new="startNewConversation()"
    @select-conversation="id => selectConversation(id)"
    @open-history="loadConversations()"
    @resize-start="onResizeStart"
  />
</template>
