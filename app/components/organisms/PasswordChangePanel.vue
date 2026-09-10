<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'

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
  errorMessage?: string | null
  currentPasswordError?: string | null
  newPasswordError?: string | null
  newPasswordConfirmationError?: string | null
}>()

const emit = defineEmits<{
  submit: [currentPassword: string, newPassword: string, newPasswordConfirmation: string]
  /** 有人動了那幾格。頁面接到它就清掉上一次的說明——那句話講的是上一次送出。 */
  edit: []
}>()

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirmation = ref('')

const submitLabel = computed(() => pending ? '更換中…' : '更換密碼')

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
    title="更換密碼"
    description="換好之後，你在每一台裝置上的登入都不再算數，包含這一台——會請你用新密碼重新登入一次。"
  >
    <form
      class="password-change-panel"
      @submit.prevent="submit"
    >
      <FormField
        label="目前的密碼"
        :error-message="currentPasswordError"
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
        label="新的密碼"
        hint="至少 8 個字元，上限 72 個位元組（中文字一個算三個）。"
        :error-message="newPasswordError"
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
        label="再打一次新的密碼"
        :error-message="newPasswordConfirmationError"
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
        {{ errorMessage }}
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
  gap: spacing('md');

  // 動作跟著欄位那一欄的右緣走，而不是跟著整頁的右緣。
  // 貼在頁緣的話，填完最後一格的眼睛要橫著跑過整片空白才找得到它。
  //
  // 欄位本身不另訂寬度：整欄的上限由 SettingsSection 一次訂好，
  // 四個段落因此切在同一條右緣上。
  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
