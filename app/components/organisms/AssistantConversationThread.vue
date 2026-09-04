<script setup lang="ts">
import AssistantMessage from '~/components/molecules/AssistantMessage.vue'
import AssistantPendingNotice from '~/components/molecules/AssistantPendingNotice.vue'
import AssistantRejectionNotice from '~/components/molecules/AssistantRejectionNotice.vue'
import AssistantSuggestedPrompts from '~/components/molecules/AssistantSuggestedPrompts.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：對話串一整塊。抽屜與整頁**共用這一個**——
// 兩個地方的差別只有寬度與旁邊有沒有清單，不是兩套實作。
//
// 它自己捲動而不是讓整頁一起捲：對話會越來越長，而輸入框必須一直在原地。
// 新東西出現時捲到底，因為新東西就是使用者在等的東西。
const { messages, pending, rejectionMessage, suggestedPrompts, timeZone } = defineProps<{
  messages: readonly ConversationMessageDto[]
  pending: boolean
  rejectionMessage: string | null
  suggestedPrompts: readonly string[]
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{
  retry: []
  selectPrompt: [prompt: string]
}>()

const scroller = useTemplateRef<HTMLElement>('scroller')

/** 對話還是空的——這時要給建議提問，而不是留一片白。 */
const isEmpty = computed(() => messages.length === 0)

function scrollToBottom(): void {
  const element = scroller.value
  if (element === null) {
    return
  }

  element.scrollTop = element.scrollHeight
}

watch(
  () => [messages.length, pending, rejectionMessage] as const,
  () => {
    void nextTick(scrollToBottom)
  },
)

onMounted(scrollToBottom)
</script>

<template>
  <div
    ref="scroller"
    class="assistant-conversation-thread"
  >
    <div
      v-if="isEmpty"
      class="assistant-conversation-thread__empty"
      data-testid="assistant-thread-empty"
    >
      <p class="assistant-conversation-thread__lead">
        用日常講話的方式問行情就好。助手會自己去查交易標的、K 線、指標與策略，再用一段話回答。
      </p>

      <AssistantSuggestedPrompts
        :prompts="suggestedPrompts"
        @select="prompt => emit('selectPrompt', prompt)"
      />
    </div>

    <template v-else>
      <AssistantMessage
        v-for="(message, messageIndex) in messages"
        :key="messageIndex"
        :message="message"
        :time-zone="timeZone"
      />
    </template>

    <AssistantPendingNotice v-if="pending" />

    <AssistantRejectionNotice
      v-if="rejectionMessage !== null && !pending"
      :message="rejectionMessage"
      :retryable="messages.length > 0"
      @retry="emit('retry')"
    />
  </div>
</template>

<style scoped lang="scss">
.assistant-conversation-thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('md');
  padding: spacing('md');
  overflow-y: auto;

  &__empty {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    margin: auto 0;
  }

  &__lead {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('relaxed');
  }
}
</style>
