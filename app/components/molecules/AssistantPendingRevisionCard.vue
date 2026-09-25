<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'

// 分子：助手提出、等使用者決定的一筆修改。內容要讀過才確認得下去，所以收在一個可展開的區塊裡。
const { revision, busy = false, errorMessage = null } = defineProps<{
  revision: AssistantPendingRevisionDto
  /** 這一筆的結果還沒回來，兩顆鍵都不給按。 */
  busy?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  confirm: [id: number]
  reject: [id: number]
}>()
</script>

<template>
  <section
    class="assistant-pending-revision-card"
    data-testid="assistant-pending-revision"
  >
    <header class="assistant-pending-revision-card__header">
      <span
        class="assistant-pending-revision-card__title"
        data-testid="assistant-pending-revision-title"
      >
        {{ revision.title }}
      </span>

      <AppBadge
        :variant="revision.canResolve ? 'warning' : 'neutral'"
        data-testid="assistant-pending-revision-status"
      >
        {{ revision.statusLabel }}
      </AppBadge>
    </header>

    <details class="assistant-pending-revision-card__details">
      <summary>改成的內容</summary>
      <pre
        class="assistant-pending-revision-card__content"
        data-testid="assistant-pending-revision-content"
      >{{ revision.content }}</pre>
    </details>

    <div
      v-if="revision.canResolve"
      class="assistant-pending-revision-card__actions"
    >
      <AppButton
        size="small"
        :disabled="busy"
        data-testid="assistant-pending-revision-confirm"
        @click="emit('confirm', revision.id)"
      >
        確認
      </AppButton>

      <AppButton
        variant="ghost"
        size="small"
        :disabled="busy"
        data-testid="assistant-pending-revision-reject"
        @click="emit('reject', revision.id)"
      >
        拒絕
      </AppButton>
    </div>

    <p
      v-if="errorMessage"
      class="assistant-pending-revision-card__error"
      role="alert"
      data-testid="assistant-pending-revision-error"
    >
      {{ errorMessage }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.assistant-pending-revision-card {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');
  border: 1px solid color('border');
  border-radius: radius('lg');
  background-color: color('surface-raised');
  padding: spacing('xs') spacing('sm');

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: spacing('xs');
  }

  &__title {
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__details summary {
    cursor: pointer;
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__content {
    margin: spacing('2xs') 0 0;
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('xs');
    max-height: 16rem;
    overflow: auto;
    font-family: font-family('mono');
    font-size: font-size('2xs');
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
  }

  &__error {
    margin: 0;
    color: color('danger');
    font-size: font-size('xs');
    line-height: line-height('relaxed');
  }
}
</style>
