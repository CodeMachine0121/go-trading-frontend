<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import AppRadio from '~/components/atoms/AppRadio.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyScriptUsageOptionDto } from '~/domain/models/dto/strategy-script-usage-option-dto'
import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'

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
  usageOptions = [],
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
  /**
   * 另存新腳本時問用途的選項；第一個是預設。**改名時不給**——用途只能用切換改，
   * 改名順便送用途會被交易服務拒絕，所以那一格根本不出現。
   */
  usageOptions?: readonly StrategyScriptUsageOptionDto[]
}>()

const emit = defineEmits<{
  /** 用途在沒問的時候（改名）是 `null`：不送。 */
  submit: [name: string, description: string, usage: StrategyScriptUsage | null]
  cancel: []
}>()

const name = ref(initialName)
const description = ref(initialDescription)
const usage = ref<string>(usageOptions[0]?.value ?? '')
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
    usage.value = usageOptions[0]?.value ?? ''
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
  emit('submit', trimmedName, description.value,
    usageOptions.find(option => option.value === usage.value)?.value ?? null)
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

      <!-- 用途與名稱一起被想到：它決定這一支出現在圖表選單，還是挑得到當訊號來源。 -->
      <FormField
        v-if="usageOptions.length > 0"
        :label="t('strategyScript.strategyScriptNameDialog.usageLabel')"
        grouped
        data-testid="strategy-script-usage-field"
      >
        <div class="strategy-script-name-dialog__usages">
          <AppRadio
            v-for="option in usageOptions"
            :key="option.value"
            v-model="usage"
            name="strategy-script-usage"
            :value="option.value"
            :label="localize(option.label)"
            :description="localize(option.description)"
            :data-testid="`strategy-script-usage-${option.value}`"
          />
        </div>
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

  &__usages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: spacing('xs');
  }
}
</style>
