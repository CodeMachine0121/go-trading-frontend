<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：對話清單。只有整頁有它——420 像素的抽屜硬塞兩欄的結果是兩邊都難用。
//
// **取不到與一段都沒有是兩件事**，所以是兩個狀態：用一個空清單同時表示兩者，
// 會讓後端掛掉時看起來像「你還沒問過任何問題」。
//
// 每一列說出最後有動靜的時刻與有幾則訊息，因為後端不讓對話取名字——
// 這兩個數字是唯一能用來認出「這是哪一段」的東西。
const { conversations, activeConversationId, errorMessage, timeZone } = defineProps<{
  conversations: readonly ConversationSummaryDto[]
  activeConversationId: number | null
  errorMessage: string | null
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{
  select: [id: number]
  startNew: []
  reload: []
}>()
</script>

<template>
  <div class="assistant-conversation-list">
    <div class="assistant-conversation-list__head">
      <span class="assistant-conversation-list__title">對話</span>

      <AppButton
        variant="ghost"
        size="small"
        label="開新對話"
        data-testid="assistant-list-start-new"
        @click="emit('startNew')"
      >
        <AppIcon
          name="new"
          size="small"
        />
        開新的
      </AppButton>
    </div>

    <AppAlert
      v-if="errorMessage !== null"
      tone="danger"
      class="assistant-conversation-list__error"
      data-testid="assistant-list-error"
    >
      <p class="assistant-conversation-list__error-message">
        {{ errorMessage }}
      </p>

      <AppButton
        variant="ghost"
        size="small"
        data-testid="assistant-list-reload"
        @click="emit('reload')"
      >
        <AppIcon
          name="refresh"
          size="small"
        />
        重新讀取
      </AppButton>
    </AppAlert>

    <p
      v-else-if="conversations.length === 0"
      class="assistant-conversation-list__empty"
      data-testid="assistant-list-empty"
    >
      還沒有任何對話。在右邊問一句就開始了。
    </p>

    <ul
      v-else
      class="assistant-conversation-list__items"
    >
      <li
        v-for="conversation in conversations"
        :key="conversation.id"
      >
        <button
          type="button"
          class="assistant-conversation-list__item"
          :class="{
            'assistant-conversation-list__item--active': conversation.id === activeConversationId,
          }"
          :aria-current="conversation.id === activeConversationId ? 'true' : undefined"
          :data-testid="`assistant-list-item-${conversation.id}`"
          @click="emit('select', conversation.id)"
        >
          <span class="assistant-conversation-list__item-time">
            {{ timeZone.formatDateTime(conversation.lastActiveAt) }}
          </span>
          <span class="assistant-conversation-list__item-count">
            {{ conversation.messageCountLabel }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.assistant-conversation-list {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  border-right: 1px solid color('border');
  padding: spacing('sm');
  overflow-y: auto;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: spacing('xs');
  }

  &__title {
    @include dense-label;
  }

  &__error-message {
    margin: 0 0 spacing('xs');
    line-height: line-height('relaxed');
  }

  &__empty {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
    line-height: line-height('relaxed');
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: background-color duration('fast') ease;
    border: 1px solid transparent;
    border-radius: radius('sm');
    background-color: transparent;
    cursor: pointer;
    padding: spacing('xs');
    width: 100%;
    text-align: left;

    @include focus-ring;

    &:hover {
      background-color: color('surface-muted');
    }

    &--active {
      border-color: color('primary');
      background-color: color('primary-soft');
    }
  }

  &__item-time {
    color: color('text-strong');
    font-size: font-size('sm');

    @include numeric;
  }

  &__item-count {
    color: color('text-faint');
    font-size: font-size('xs');
  }
}
</style>
