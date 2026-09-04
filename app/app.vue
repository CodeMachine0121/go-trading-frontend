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
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', keepAssistantUsable)
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />

  <AssistantTriggerButton
    v-if="!open"
    :position="position"
    :size="triggerSize"
    :dragging="dragging"
    @drag-start="onDragStart"
  />

  <AssistantDrawer
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
    @close-drawer="closeDrawer()"
    @send="question => ask(question)"
    @retry="retry()"
    @start-new="startNewConversation()"
    @select-conversation="id => selectConversation(id)"
    @open-history="loadConversations()"
    @resize-start="onResizeStart"
  />
</template>
