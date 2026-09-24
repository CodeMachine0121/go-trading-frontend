<script setup lang="ts">
import AssistantConsole from '~/components/organisms/AssistantConsole.vue'

// 頁面只做接線：取用跨畫面共用的那一段對話，往下傳給要說它的元件。
//
// 這一頁與抽屜看到的是**同一段對話**（同一份共用狀態），
// 所以在抽屜問完展開過來，剛才那一則還在。差別只有這裡多一欄清單、寬得多。
definePageMeta({
  layout: 'console',
  consoleTitle: 'AI-Assistant',
  consoleSubtitle: '用日常講話的方式問行情。助手會自己去查交易標的、K 線、指標與策略腳本。',
  consoleFillsViewport: true,
})

const { selectedTimeZone } = useSelectedTimeZone()

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

// 清單只在瀏覽器端讀：它是一份會變的東西，伺服器端算出來的那一份到畫面上就過期了。
//
// 回到上次看的那一段不在這裡接——抽屜在每一個畫面都叫得出來，所以那一步在 app.vue，
// 只做一次。這一頁若也接一次，只是同一段對話被讀兩遍。
onMounted(() => {
  void loadConversations()
})

// 現在這個寬度代表什麼。這一頁用到的是「助手是不是佔滿整個畫面」。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <div class="chat-page">
    <AssistantConsole
      v-model:draft="draft"
      :conversations="conversations"
      :active-conversation-id="conversationId"
      :conversations-error-message="conversationsErrorMessage"
      :messages="messages"
      :pending="pending"
      :rejection-message="rejectionMessage"
      :suggested-prompts="suggestedPrompts"
      :time-zone="selectedTimeZone"
      :layout-density="layoutDensity"
      @send="question => ask(question)"
      @retry="retry()"
      @start-new="startNewConversation()"
      @select-conversation="id => selectConversation(id)"
      @reload="loadConversations()"
    />
  </div>
</template>

<style scoped lang="scss">
// 版型把工作區撐成視窗剩下的高度（consoleFillsViewport），對話串在自己裡面捲、輸入框留在原地。
.chat-page {
  flex: 1;
  min-height: 0;
}
</style>
