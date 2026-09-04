<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantAnswerBlocks from '~/components/molecules/AssistantAnswerBlocks.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：對話串上的一則。
//
// 提問靠右、回答靠左，兩邊都是捏圓的泡泡，而**貼著對話者那一側的那個角收緊**——
// 這是聊天泡泡的既有慣例（Hims、Substack、Teams），那個缺口就是它的尾巴，
// 指向說話的人。四個角一樣圓的話，泡泡會漂在半空中不知道是誰講的。
//
// 回答那一側多一顆圓形的機器人頭像，因為回答通常長好幾倍：有一個固定的起點，
// 眼睛才知道每一則從哪裡開始。
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
    <span
      v-if="message.role === 'answer'"
      class="assistant-message__avatar"
      aria-hidden="true"
    >
      <AppIcon
        name="robot"
        size="small"
      />
    </span>

    <div class="assistant-message__column">
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
    </div>
  </article>
</template>

<style scoped lang="scss">
.assistant-message {
  display: flex;
  gap: spacing('xs');

  &__column {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    min-width: 0;
  }

  // 一顆圓形的頭像，與泡泡的第一行對齊。
  &__avatar {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: radius('pill');
    background-color: color('primary-soft');
    width: 1.75rem;
    height: 1.75rem;
    color: color('primary');
  }

  &__body {
    border-radius: radius('2xl');
    padding: spacing('xs') spacing('md');
  }

  &--ask {
    justify-content: flex-end;

    .assistant-message__column {
      max-width: 85%;
    }

    .assistant-message__body {
      // 右下角收緊：那是尾巴，指向講這句話的人。
      border-bottom-right-radius: radius('sm');
      background-color: color('primary-soft');
    }

    .assistant-message__meta {
      text-align: right;
    }
  }

  &--answer {
    .assistant-message__column {
      flex: 1;
      min-width: 0;
    }

    .assistant-message__body {
      // 左下角收緊，與提問那一側對稱。
      border-bottom-left-radius: radius('sm');
      background-color: color('surface-muted');
    }
  }

  &__limit {
    display: flex;
    align-items: baseline;
    gap: spacing('xs');
    margin: 0 spacing('xs');
    border-radius: radius('xl');
    background-color: color('warning-soft');
    padding: spacing('2xs') spacing('sm');
    color: color('warning');
    font-size: font-size('xs');
    line-height: line-height('relaxed');
  }

  &__meta {
    margin: 0 spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');

    @include numeric;
  }
}
</style>
