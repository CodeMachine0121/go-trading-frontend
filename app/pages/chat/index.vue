<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import AssistantConsole from '~/components/organisms/AssistantConsole.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'

// 頁面只做接線：取用跨畫面共用的那一段對話，往下傳給要說它的元件。
//
// 這一頁與抽屜看到的是**同一段對話**（同一份共用狀態），
// 所以在抽屜問完展開過來，剛才那一則還在。差別只有這裡多一欄清單、寬得多。
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()

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

// 側欄底下那一行：現在是誰在用。它與那顆連線燈一樣是「這條線路的狀態」，
// 所以同樣由頁面填進樣板的插槽——樣板不綁任何資料。
const { currentUser, signOut } = useUserSession()

// 現在這個寬度代表什麼。這一頁用到的是「助手是不是佔滿整個畫面」。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <ConsoleLayout
    title="行情助手"
    subtitle="用日常講話的方式問行情。助手會自己去查交易標的、K 線、指標與策略腳本。"
  >
    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <template #status>
      <BackendStatusIndicator
        :health="health"
        :checking="checking"
        :error-message="errorMessage"
        @recheck="checkBackendHealth"
      />
    </template>

    <template #account>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

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
  </ConsoleLayout>
</template>
