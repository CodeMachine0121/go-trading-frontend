<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 分子：問一個策略腳本的名稱與說明。
//
// 另存為新策略腳本與替現有的那一支改名共用它——兩者問的是同一件事，
// 差別只在標題與一開始框裡有沒有字。做成兩個元件，只會讓「名稱被佔用時怎麼辦」
// 有兩個地方要維護。
//
// 名稱被佔用時**不關閉、不清空**——讓使用者當場改一個字再送一次，
// 而不是把他剛打的名字丟掉重來。
const {
  open,
  title,
  hint,
  initialName = '',
  initialDescription = '',
  errorMessage = null,
  submitting = false,
} = defineProps<{
  open: boolean
  title: string
  hint: string
  /** 打開時框裡先放什麼。改名時放現在的名字，另存時留空。 */
  initialName?: string
  /** 說明那一格打開時先放什麼。**可以留空**——沒有說明是一個合法的答案。 */
  initialDescription?: string
  errorMessage?: LocalizedTextVo | null
  submitting?: boolean
}>()

const emit = defineEmits<{ submit: [name: string, description: string], cancel: [] }>()

const name = ref(initialName)
const description = ref(initialDescription)
const { t } = useI18n()
const { localize } = useLocalizedText()

const missingName = ref(false)
const nameErrorMessage = computed(() => {
  if (missingName.value) {
    return t('strategyScript.strategyScriptNameDialog.missingName')
  }

  return errorMessage === null ? null : localize(errorMessage)
})

// 每次打開都重新從「這一次該有的起點」開始；上一次留下的字對這一次沒有意義。
watch(() => open, (isOpen) => {
  if (isOpen) {
    name.value = initialName
    description.value = initialDescription
    missingName.value = false
  }
})

function submitName() {
  const trimmedName = name.value.trim()
  if (trimmedName === '') {
    missingName.value = true
    return
  }

  missingName.value = false
  // 說明不在這裡驗長度：那是後端的規則，抄一份下來，等那邊改了這邊沒跟著改，
  // 畫面就會擋掉其實存得下的東西。
  emit('submit', trimmedName, description.value)
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    @close="emit('cancel')"
  >
    <form
      class="strategy-script-name-dialog"
      @submit.prevent="submitName"
    >
      <FormField
        :label="t('strategyScript.strategyScriptNameDialog.nameLabel')"
        :hint="hint"
        :error-message="nameErrorMessage"
      >
        <AppInput
          v-model="name"
          :invalid="Boolean(nameErrorMessage)"
          data-testid="strategy-script-name-input"
          :placeholder="t('strategyScript.strategyScriptNameDialog.namePlaceholder')"
        />
      </FormField>

      <!--
        說明在名稱下面而不是另一個對話框：兩者一起被想到（「這是什麼、它做什麼」），
        分成兩步只會讓大部分人跳過第二步——而分享出去之後，那一步是別人唯一的介紹。
      -->
      <FormField
        :label="t('strategyScript.strategyScriptNameDialog.descriptionLabel')"
        :hint="t('strategyScript.strategyScriptNameDialog.descriptionHint')"
      >
        <AppTextarea
          v-model="description"
          data-testid="strategy-script-description-input"
          :placeholder="t('strategyScript.strategyScriptNameDialog.descriptionPlaceholder')"
        />
      </FormField>
    </form>

    <template #actions>
      <AppButton
        variant="secondary"
        @click="emit('cancel')"
      >
        {{ t('strategyScript.strategyScriptNameDialog.cancel') }}
      </AppButton>
      <AppButton
        :disabled="submitting"
        data-testid="strategy-script-name-submit"
        @click="submitName"
      >
        {{ submitting ? t('strategyScript.strategyScriptNameDialog.saving') : t('strategyScript.strategyScriptNameDialog.save') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-script-name-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
}
</style>
