<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantAnswerBlocks from '~/components/molecules/AssistantAnswerBlocks.vue'
import CopyTextButton from '~/components/molecules/CopyTextButton.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：對話串上的一則。
//
// 提問靠右、回答靠左，**貼著說話者那一側的那個角收緊**——那個缺口就是泡泡的尾巴。
// 回答那一側多一顆助手記號，因為回答通常長好幾倍：有一個固定的起點，
// 眼睛才知道每一則從哪裡開始。
//
// 附註（查了幾次、份量）與「提早收尾」的提醒只有回答那一則才有，
// 而且**只有剛收到的那一則帶得動**：從對話裡讀回來的訊息沒有那組數字
// （後端不再回），因此 `note` 是 `null`。附註收在泡泡底部那一條內凹的小字裡，
// 讀起來是「這段回答的依據」，而不是另一則訊息。
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
        name="sparkle"
        size="small"
      />
    </span>

    <div class="assistant-message__column">
      <div class="assistant-message__body">
        <AssistantAnswerBlocks :blocks="message.blocks" />

        <p
          v-if="message.note"
          class="assistant-message__note"
          data-testid="assistant-message-note"
        >
          <AppIcon
            name="info"
            size="small"
          />
          {{ message.note.label }}
        </p>
      </div>

      <p
        v-if="message.note?.stoppedAtQueryLimitLabel"
        class="assistant-message__limit"
        data-testid="assistant-message-limit"
      >
        {{ message.note.stoppedAtQueryLimitLabel }}
      </p>

      <div class="assistant-message__footer">
        <p
          class="assistant-message__meta"
          data-testid="assistant-message-meta"
        >
          {{ timeZone.formatDateTime(message.createdAt) }}
        </p>

        <!-- 整段複製只給回答那一側：使用者自己問的那句話，他手上本來就有。 -->
        <CopyTextButton
          v-if="message.role === 'answer'"
          :text="message.content"
          label="複製這則回答"
        />
      </div>
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
    gap: spacing('3xs');
    min-width: 0;
  }

  &__avatar {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: radius('pill');
    background-color: color('primary-soft');
    width: 1.5rem;
    height: 1.5rem;
    color: color('primary');
  }

  &__body {
    border: 1px solid color('border');
    border-radius: radius('lg');
    padding: spacing('xs') spacing('sm');
  }

  &--ask {
    justify-content: flex-end;

    .assistant-message__column {
      align-items: flex-end;
      max-width: 86%;
    }

    .assistant-message__body {
      border-color: transparent;
      border-bottom-right-radius: radius('xs');
      background-color: color('primary-soft');
    }
  }

  &--answer {
    .assistant-message__column {
      flex: 1;
      min-width: 0;
    }

    .assistant-message__body {
      border-bottom-left-radius: radius('xs');
      background-color: color('surface-muted');
    }
  }

  // 依據那一條：內凹、小字、不搶正文。
  &__note {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    margin: spacing('xs') 0 0;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('2xs') spacing('xs');
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__limit {
    margin: 0;
    border-radius: radius('sm');
    background-color: color('warning-soft');
    padding: spacing('2xs') spacing('sm');
    color: color('warning');
    font-size: font-size('xs');
    line-height: line-height('relaxed');
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: spacing('xs');
  }

  &__meta {
    margin: 0 spacing('2xs');
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }
}
</style>
