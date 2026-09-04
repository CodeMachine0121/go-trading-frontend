<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'
import AssistantConversationList from '~/components/organisms/AssistantConversationList.vue'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'

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
onMounted(() => {
  void loadConversations()
})
</script>

<template>
  <ConsoleLayout
    title="行情助手"
    subtitle="用日常講話的方式問行情。助手會自己去查交易標的、K 線、指標與策略。"
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

    <div class="chat-page">
      <AssistantConversationList
        class="chat-page__list"
        :conversations="conversations"
        :active-conversation-id="conversationId"
        :error-message="conversationsErrorMessage"
        :time-zone="selectedTimeZone"
        @select="id => selectConversation(id)"
        @start-new="startNewConversation()"
        @reload="loadConversations()"
      />

      <section class="chat-page__conversation">
        <AssistantConversationThread
          :messages="messages"
          :pending="pending"
          :rejection-message="rejectionMessage"
          :suggested-prompts="suggestedPrompts"
          :time-zone="selectedTimeZone"
          @retry="retry()"
          @select-prompt="prompt => ask(prompt)"
        />

        <div class="chat-page__composer">
          <AssistantComposer
            v-model="draft"
            :pending="pending"
            autofocus
            @send="ask(draft)"
          />
        </div>
      </section>
    </div>
  </ConsoleLayout>
</template>

<style scoped lang="scss">
// 清單欄的寬度是一次性的尺寸：夠放一個時刻與一句「幾則訊息」，其餘的寬度全留給對話。
$list-width: 260px;

.chat-page {
  display: grid;
  grid-template-columns: $list-width minmax(0, 1fr);

  // 兩欄各自捲動，不讓整頁一起捲——輸入框必須一直在原地。
  min-height: 0;
  height: 100%;

  &__list {
    min-height: 0;
  }

  &__conversation {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__composer {
    border-top: 1px solid color('border');
    padding: spacing('sm') spacing('md');
  }
}
</style>
