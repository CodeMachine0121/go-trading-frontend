<script setup lang="ts">
import type { SignInMode } from '~/domain/models/vo/sign-in-mode'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'

// 有機體：登入畫面上那一整張卡片。這一頁的互動全部住在這裡。
//
// 這張卡片有兩種模式，切換不換頁——兩件事填的是同樣的兩格，
// 換一整頁只是為了換兩個字，而使用者多半是打完才發現自己按錯了那一邊。
// 所以**切換時已填的內容留著**。
//
// 送出之前的規則不在這裡：規則住在 CredentialsDomain，這裡只把兩格與模式往上送，
// 再把回來的每一格錯誤畫在該格底下。元件不寫業務規則。
const { pending = false, errorMessage = null, emailError = null, passwordError = null } = defineProps<{
  pending?: boolean
  errorMessage?: string | null
  emailError?: string | null
  passwordError?: string | null
}>()

const emit = defineEmits<{
  submit: [email: string, password: string, mode: SignInMode]
  /**
   * 模式換了。頁面接到它就清掉上一次的訊息——那句話講的是上一件事，
   * 留在畫面上只會讓人以為自己剛按的那一下也失敗了。
   */
  modeChange: []
}>()

const mode = ref<SignInMode>('signIn')
const email = ref('')
const password = ref('')

const registering = computed(() => mode.value === 'register')
const title = computed(() => registering.value ? '建立帳號' : '登入')
const caption = computed(() => registering.value
  ? '用一個電子郵件與一組密碼開一個新的帳號。'
  : '用你的電子郵件與密碼進入操作台。')
const submitLabel = computed(() => {
  if (pending) {
    return registering.value ? '建立中…' : '登入中…'
  }

  return title.value
})
const switchLabel = computed(() => registering.value
  ? '已經有帳號了？登入'
  : '還沒有帳號？建立一個')

function switchMode(): void {
  mode.value = registering.value ? 'signIn' : 'register'
  emit('modeChange')
}

function submit(): void {
  // 送出中那顆鍵本來就按不下去，但表單還能靠 Enter 送出——
  // 連按三次不會開出三個帳號，這一行是那個保證的另一半。
  if (pending) {
    return
  }

  emit('submit', email.value, password.value, mode.value)
}
</script>

<template>
  <form
    class="sign-in-panel"
    @submit.prevent="submit"
  >
    <div class="sign-in-panel__brand">
      <span class="sign-in-panel__brand-mark" />
      <span class="sign-in-panel__brand-name">go-trading</span>
    </div>

    <div class="sign-in-panel__heading">
      <h1 class="sign-in-panel__title">
        {{ title }}
      </h1>
      <p class="sign-in-panel__caption">
        {{ caption }}
      </p>
    </div>

    <FormField
      label="電子郵件"
      :error-message="emailError"
    >
      <AppInput
        v-model="email"
        type="email"
        autocomplete="email"
        autocapitalize="off"
        spellcheck="false"
        data-testid="email-input"
        :invalid="emailError !== null"
      />
    </FormField>

    <FormField
      label="密碼"
      :error-message="passwordError"
    >
      <!--
        自動填入的提示隨模式換：瀏覽器與密碼管理器靠它決定要提供既有的那一組，
        還是提議產生一組新的。給錯了，建立帳號時它會一直塞舊密碼進來。
      -->
      <AppInput
        v-model="password"
        type="password"
        :autocomplete="registering ? 'new-password' : 'current-password'"
        data-testid="password-input"
        :invalid="passwordError !== null"
      />
    </FormField>

    <AppAlert
      v-if="errorMessage"
      tone="danger"
      data-testid="submission-error"
    >
      {{ errorMessage }}
    </AppAlert>

    <AppButton
      type="submit"
      block
      :disabled="pending"
      data-testid="submit"
    >
      {{ submitLabel }}
    </AppButton>

    <AppButton
      variant="ghost"
      size="small"
      data-testid="switch-mode"
      @click="switchMode"
    >
      {{ switchLabel }}
    </AppButton>
  </form>
</template>

<style scoped lang="scss">
.sign-in-panel {
  display: flex;
  position: relative;
  flex-direction: column;
  gap: spacing('md');
  box-shadow: shadow('md');
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('xl') spacing('lg');
  width: 100%;
  max-width: 22rem;

  // 卡片後面一層極淡的光暈，讓它從近全黑的底浮起來，而不是貼在上面。
  // 它是裝飾，所以不擋點擊，也不佔版面。
  &::before {
    position: absolute;
    z-index: -1;
    background: radial-gradient(circle, color('primary-soft'), transparent 70%);
    content: '';
    inset: -40%;
    pointer-events: none;
  }

  // 與側欄同一顆點加同一組字：一走進門就看得出這裡是哪裡。
  &__brand {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    justify-content: center;
  }

  &__brand-mark {
    flex: none;
    border-radius: radius('pill');
    background-color: color('primary');
    width: 0.5rem;
    height: 0.5rem;
  }

  &__brand-name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
    font-family: font-family('mono');
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: font-size('xl');
  }

  &__caption {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
