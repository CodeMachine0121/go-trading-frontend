<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 有機體：設定畫面上「更換密碼」那一段。
//
// 送出之前的規則不在這裡：四條規則（三格都要填、夠長、不太長、兩次一樣）住在
// PasswordChangeDomain，這裡只把三格往上送，再把回來的每一格說明畫在該格底下。
// 元件不寫業務規則——寫了就會有第二份，而其中一份遲早與後端說不同的話。
const {
  pending = false,
  errorMessage = null,
  currentPasswordError = null,
  newPasswordError = null,
  newPasswordConfirmationError = null,
} = defineProps<{
  pending?: boolean
  errorMessage?: LocalizedTextVo | null
  currentPasswordError?: LocalizedTextVo | null
  newPasswordError?: LocalizedTextVo | null
  newPasswordConfirmationError?: LocalizedTextVo | null
}>()

const emit = defineEmits<{
  submit: [currentPassword: string, newPassword: string, newPasswordConfirmation: string]
  /** 有人動了那幾格。頁面接到它就清掉上一次的說明——那句話講的是上一次送出。 */
  edit: []
}>()

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirmation = ref('')

const { t } = useI18n()
const { localize } = useLocalizedText()

const submitLabel = computed(
  () => pending ? t('settings.passwordChange.submitting') : t('settings.passwordChange.submit'))

function submit(): void {
  // 送出中那顆鍵本來就按不下去，但表單還能靠 Enter 送出。這一行是那個保證的另一半：
  // 第二次送出帶的是**已經失效的舊密碼**，使用者會看到「目前的密碼不正確」，
  // 而他的密碼其實已經換好了。
  if (pending) {
    return
  }

  emit('submit', currentPassword.value, newPassword.value, newPasswordConfirmation.value)
}
</script>

<template>
  <SettingsSection
    :title="t('settings.passwordChange.title')"
    :description="t('settings.passwordChange.description')"
  >
    <form
      class="password-change-panel"
      @submit.prevent="submit"
    >
      <FormField
        :label="t('settings.passwordChange.currentPasswordLabel')"
        :error-message="currentPasswordError ? localize(currentPasswordError) : null"
      >
        <AppInput
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          data-testid="current-password-input"
          :invalid="currentPasswordError !== null"
          @update:model-value="emit('edit')"
        />
      </FormField>

      <FormField
        :label="t('settings.passwordChange.newPasswordLabel')"
        :hint="t('settings.passwordChange.newPasswordHint')"
        :error-message="newPasswordError ? localize(newPasswordError) : null"
      >
        <AppInput
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          data-testid="new-password-input"
          :invalid="newPasswordError !== null"
          @update:model-value="emit('edit')"
        />
      </FormField>

      <FormField
        :label="t('settings.passwordChange.confirmationLabel')"
        :error-message="newPasswordConfirmationError ? localize(newPasswordConfirmationError) : null"
      >
        <AppInput
          v-model="newPasswordConfirmation"
          type="password"
          autocomplete="new-password"
          data-testid="new-password-confirmation-input"
          :invalid="newPasswordConfirmationError !== null"
          @update:model-value="emit('edit')"
        />
      </FormField>

      <AppAlert
        v-if="errorMessage"
        tone="danger"
        data-testid="password-change-error"
      >
        {{ localize(errorMessage) }}
      </AppAlert>

      <div class="password-change-panel__actions">
        <AppButton
          type="submit"
          variant="primary"
          :disabled="pending"
          data-testid="password-change-submit"
        >
          {{ submitLabel }}
        </AppButton>
      </div>
    </form>
  </SettingsSection>
</template>

<style scoped lang="scss">
.password-change-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  // 一個密碼框不需要一整張卡那麼寬：拉到卡片的全寬，眼睛要橫著跑過一片空白。
  max-width: 26rem;

  &__actions {
    display: flex;
  }
}
</style>
