<script setup lang="ts">
import AssistantDrawer from '~/components/organisms/AssistantDrawer.vue'

// 應用程式的根，也是助手抽屜的接線處。
//
// 抽屜掛在這裡而不是塞進 ConsoleLayout，理由有兩個：樣板**不得綁任何資料**，
// 而抽屜要顯示對話；而且「每一個畫面都叫得出來」的意思就是它得在 NuxtPage 之外。
// 這也讓四個既有畫面一行都不必改。
//
// 這裡與 /chat 那一頁取用的是**同一份共用狀態**，所以在抽屜問完展開過去，
// 剛才那一則還在。
const { open, openDrawer, closeDrawer } = useAssistantDrawer()
const {
  suggestedPrompts,
  messages,
  draft,
  pending,
  rejectionMessage,
  ask,
  retry,
} = useAssistantConversation()
const { selectedTimeZone } = useSelectedTimeZone()
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />

  <AssistantDrawer
    v-model:draft="draft"
    :open="open"
    :messages="messages"
    :pending="pending"
    :rejection-message="rejectionMessage"
    :suggested-prompts="suggestedPrompts"
    :time-zone="selectedTimeZone"
    @open-drawer="openDrawer()"
    @close-drawer="closeDrawer()"
    @send="question => ask(question)"
    @retry="retry()"
  />
</template>
