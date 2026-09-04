<script setup lang="ts">
import AssistantAnswerBlocks from '~/components/molecules/AssistantAnswerBlocks.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：對話串上的一則。
//
// 提問靠右有底色、回答靠左滿寬——回答通常比提問長好幾倍，
// 把它也塞進一個泡泡裡會讓每一行都變短，帶小標與條列的內容特別難讀。
//
// 附註與「提早收尾」的提醒只有回答那一則才有，而且**只有剛收到的那一則帶得動**：
// 從對話裡讀回來的訊息沒有那組數字（後端不再回），因此 `note` 是 `null`。
const { message, timeZone } = defineProps<{
  message: ConversationMessageDto
  timeZone: TimeZoneDto
}>()
</script>

<template>
  <article
    class="assistant-message"
    :class="`assistant-message--${message.role}`"
    :data-testid="`assistant-message-${message.role}`"
  >
    <div class="assistant-message__body">
      <AssistantAnswerBlocks :blocks="message.blocks" />
    </div>

    <p
      v-if="message.note?.stoppedAtQueryLimitLabel"
      class="assistant-message__limit"
      data-testid="assistant-message-limit"
    >
      {{ message.note.stoppedAtQueryLimitLabel }}
    </p>

    <p
      class="assistant-message__meta"
      data-testid="assistant-message-meta"
    >
      <span>{{ timeZone.formatDateTime(message.createdAt) }}</span>
      <span v-if="message.note"> · {{ message.note.label }}</span>
    </p>
  </article>
</template>

<style scoped lang="scss">
.assistant-message {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &--ask {
    align-self: flex-end;
    max-width: 85%;

    .assistant-message__body {
      border-radius: radius('md');
      background-color: color('primary-soft');
      padding: spacing('xs') spacing('sm');
    }

    .assistant-message__meta {
      text-align: right;
    }
  }

  &--answer {
    align-self: stretch;
  }

  &__limit {
    display: flex;
    align-items: baseline;
    gap: spacing('xs');
    margin: 0;
    border-left: 2px solid color('warning');
    padding-left: spacing('xs');
    color: color('warning');
    font-size: font-size('xs');
    line-height: line-height('relaxed');
  }

  &__meta {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');

    @include numeric;
  }
}
</style>
