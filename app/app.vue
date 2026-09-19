<script setup lang="ts">
import AssistantDrawer from '~/components/organisms/AssistantDrawer.vue'
import AssistantTriggerButton from '~/components/molecules/AssistantTriggerButton.vue'

// 應用程式的根，也是助手那兩塊的接線處。
//
// 它們掛在這裡而不是塞進 ConsoleLayout，理由有兩個：樣板**不得綁任何資料**，
// 而這兩塊要顯示對話與記住的位置；而且「每一個畫面都叫得出來」的意思就是
// 它得在 NuxtPage 之外。這也讓四個既有畫面一行都不必改。
//
// 這裡與 /chat 那一頁取用的是**同一份共用狀態**，所以在抽屜問完展開過去，
// 剛才那一則還在。
const { open, openDrawer, closeDrawer } = useAssistantDrawer()

// 助手要花錢，而且它讀得到行情——沒登入的人不該叫得出它，**還沒被放行的人也一樣**。
// 那顆鍵與抽屜因此跟著「這個人能不能用這台操作台」出現與消失，而不是永遠掛在那裡。
//
// 後端會擋下他，所以這不是安全上的必要；它是為了不要在一個他唯一到得了的畫面上，
// 擺一顆按下去只會失敗的鍵。
const { currentUser, awaitingActivation } = useUserSession()

/** 這個人進得了操作台。助手那兩塊只對他存在。 */
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
  triggerSize,
  position,
  dragging,
  loadTriggerPosition,
  keepTriggerInView,
  startDrag,
  moveDrag,
  endDrag,
} = useAssistantTrigger()

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
 * 拖曳中的 pointer 事件掛在 window 上，因為手一快就會離開那顆鍵——
 * 掛在鍵上的話，拖到一半游標跑出去，那顆鍵就黏在半路上不動了。
 *
 * 放下時才知道剛才那一下是按了一下還是拖曳，**只有按了一下才打開抽屜**。
 */
function onDragStart(pointerX: number, pointerY: number): void {
  startDrag(pointerX, pointerY)

  const onMove = (event: PointerEvent): void => moveDrag(event.clientX, event.clientY)
  const onUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)

    if (endDrag()) {
      openDrawer()
    }
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

/**
 * 拉動抽屜那條邊。與拖那顆鍵同一個做法：事件掛在 window 上，
 * 因為手一快就會離開那條細邊。
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

/** 視窗變小時，那顆鍵與抽屜都要收回看得見、還能用的範圍。 */
function keepAssistantUsable(): void {
  keepTriggerInView()
  keepDrawerWidthUsable()
}

// 這兩份都記在瀏覽器裡，所以只有到了瀏覽器才讀得到。
onMounted(() => {
  loadTriggerPosition()
  loadDrawerWidth()
  window.addEventListener('resize', keepAssistantUsable)

  // 回到上次看的那一段。這一行是「重新整理之後還看得到助手在寫」發生的地方：
  // 跨畫面共用的那份狀態撐不過整頁重新載入，所以哪一段要靠瀏覽器記著。
  //
  // 它放在這裡而不是助手那一頁，因為抽屜在**每一個畫面**都叫得出來——
  // 只在那一頁接回去的話，重整之後停在別的畫面的人就接不回去。
  void resumeCurrentConversation()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', keepAssistantUsable)
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />

  <!--
    那顆浮在畫面上的助手鍵**只在寬螢幕上出現**。
    窄螢幕的底部已經有一格「行情助手」了，一顆浮在右下角的鍵不只是重複——
    它就蓋在那一排分頁上，把「行情助手」與「更多」兩格壓在底下按不到。
  -->
  <AssistantTriggerButton
    v-if="mayUseConsole && !open && !layoutDensity.usesBottomNavigation"
    :position="position"
    :size="triggerSize"
    :dragging="dragging"
    @drag-start="onDragStart"
  />

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
