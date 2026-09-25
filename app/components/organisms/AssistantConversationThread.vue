<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantMessage from '~/components/molecules/AssistantMessage.vue'
import AssistantPendingNotice from '~/components/molecules/AssistantPendingNotice.vue'
import AssistantPendingRevisionCard from '~/components/molecules/AssistantPendingRevisionCard.vue'
import AssistantRejectionNotice from '~/components/molecules/AssistantRejectionNotice.vue'
import AssistantSuggestedPrompts from '~/components/molecules/AssistantSuggestedPrompts.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：對話串一整塊。抽屜與整頁**共用這一個**——
// 兩個地方的差別只有寬度與旁邊有沒有清單，不是兩套實作。
//
// 它自己捲動而不是讓整頁一起捲：對話會越來越長，而輸入框必須一直在原地。
// 新東西出現時捲到底，因為新東西就是使用者在等的東西。
//
// 對話還是空的時候，建議提問排在串的最底下——緊貼著輸入框，看到就能點。
const {
  messages, pending, rejectionMessage, suggestedPrompts, timeZone,
  resolvingPendingRevisionId = null, pendingRevisionErrors = {},
} = defineProps<{
  messages: readonly ConversationMessageDto[]
  pending: boolean
  rejectionMessage: string | null
  suggestedPrompts: readonly string[]
  timeZone: TimeZoneDto
  resolvingPendingRevisionId?: number | null
  pendingRevisionErrors?: Readonly<Record<number, string>>
}>()

const emit = defineEmits<{
  retry: []
  selectPrompt: [prompt: string]
  confirmPendingRevision: [id: number]
  rejectPendingRevision: [id: number]
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
      <span
        class="assistant-conversation-thread__mark"
        aria-hidden="true"
      >
        <AppIcon name="sparkle" />
      </span>

      <p class="assistant-conversation-thread__lead">
        用日常講話的方式問行情就好。助手會自己去查交易標的、K 線、指標與策略腳本，再用一段話回答。
      </p>
    </div>

    <template v-else>
      <template
        v-for="(message, messageIndex) in messages"
        :key="messageIndex"
      >
        <AssistantMessage
          :message="message"
          :time-zone="timeZone"
        />

        <AssistantPendingRevisionCard
          v-for="revision in message.pendingRevisions"
          :key="`revision-${revision.id}`"
          :revision="revision"
          :busy="resolvingPendingRevisionId !== null"
          :error-message="pendingRevisionErrors[revision.id] ?? null"
          @confirm="id => emit('confirmPendingRevision', id)"
          @reject="id => emit('rejectPendingRevision', id)"
        />
      </template>
    </template>

    <AssistantPendingNotice v-if="pending" />

    <AssistantRejectionNotice
      v-if="rejectionMessage !== null && !pending"
      :message="rejectionMessage"
      :retryable="messages.length > 0"
      @retry="emit('retry')"
    />

    <AssistantSuggestedPrompts
      v-if="isEmpty"
      class="assistant-conversation-thread__prompts"
      :prompts="suggestedPrompts"
      @select="prompt => emit('selectPrompt', prompt)"
    />
  </div>
</template>

<style scoped lang="scss">
.assistant-conversation-thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  padding: spacing('md');
  min-height: 0;
  overflow-y: auto;

  // 空的時候那一段置中，建議提問沉到底、貼著輸入框。
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: spacing('sm');
    margin: auto 0;
    padding: spacing('lg') spacing('md');
    text-align: center;
  }

  &__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: radius('pill');
    background-color: color('primary-soft');
    width: 2.5rem;
    height: 2.5rem;
    color: color('primary');
  }

  &__lead {
    margin: 0;
    max-width: 28rem;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('relaxed');
  }

  &__prompts {
    flex: none;
  }
}
</style>
