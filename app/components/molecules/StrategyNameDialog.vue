<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import FormField from '~/components/molecules/FormField.vue'

// 分子：另存一支新策略時只問名稱。
//
// 其餘四樣東西畫面上都已經有了，再問一次是多餘的。
// 名稱被佔用時**不關閉、不清空**——讓使用者當場改一個字再送一次，
// 而不是把他剛打的名字丟掉重來。
const { open, errorMessage = null, submitting = false } = defineProps<{
  open: boolean
  errorMessage?: string | null
  submitting?: boolean
}>()

const emit = defineEmits<{ submit: [name: string], cancel: [] }>()

const name = ref('')
const missingNameMessage = ref<string | null>(null)

// 每次打開都從空白開始；上一次留下的名字對這一次沒有意義。
watch(() => open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    missingNameMessage.value = null
  }
})

function submitName() {
  const trimmedName = name.value.trim()
  if (trimmedName === '') {
    missingNameMessage.value = '請填寫策略名稱'
    return
  }

  missingNameMessage.value = null
  emit('submit', trimmedName)
}
</script>

<template>
  <AppModal
    :open="open"
    title="另存為新策略"
    @close="emit('cancel')"
  >
    <form
      class="strategy-name-dialog"
      @submit.prevent="submitName"
    >
      <FormField
        label="策略名稱"
        hint="其餘內容取自畫面上目前的算式、指標值種類、彙總刻度與計算根數。"
        :error-message="missingNameMessage ?? errorMessage"
      >
        <AppInput
          v-model="name"
          :invalid="Boolean(missingNameMessage ?? errorMessage)"
          data-testid="strategy-name-input"
          placeholder="例如：二十根均線"
        />
      </FormField>
    </form>

    <template #actions>
      <AppButton
        variant="secondary"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <AppButton
        :disabled="submitting"
        data-testid="strategy-name-submit"
        @click="submitName"
      >
        {{ submitting ? '儲存中…' : '儲存' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-name-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
}
</style>
