<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/atoms/AppModal.vue'

// 分子：「這件事要再問一次」。刪掉一支策略腳本與放棄還沒存的內容共用同一個——
// 它們是同一個 UI 概念，長相的差別由使用端以 confirmLabel / variant 決定。
const { open, title, message, confirmLabel, variant = 'primary' } = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
}>()

const emit = defineEmits<{ confirm: [], cancel: [] }>()

const { t } = useI18n()
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
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton
        :variant="variant"
        @click="emit('confirm')"
      >
        {{ confirmLabel ?? t('common.confirm') }}
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
