<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'

// 分子：「這件事要再問一次」。刪掉一支策略與放棄還沒存的內容共用同一個——
// 它們是同一個 UI 概念，長相的差別由使用端以 confirmLabel / variant 決定。
const { open, title, message, confirmLabel = '確定', variant = 'primary' } = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
}>()

const emit = defineEmits<{ confirm: [], cancel: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    @close="emit('cancel')"
  >
    <p class="confirm-dialog__message">
      {{ message }}
    </p>

    <template #actions>
      <AppButton
        variant="secondary"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <AppButton
        :variant="variant"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.confirm-dialog__message {
  margin: 0;
  color: color('text');
  line-height: line-height('normal');
  font-size: font-size('sm');
}
</style>
