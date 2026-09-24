<script setup lang="ts">
import type { SignInMode } from '~/domain/models/vo/sign-in-mode'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'

// 有機體：登入畫面上那一整張卡片。這一頁的互動全部住在這裡。
//
// 這張卡片有兩種模式，切換不換頁——兩件事填的是同樣的兩格，
// 換一整頁只是為了換兩個字，而使用者多半是打完才發現自己按錯了那一邊。
// 所以**切換時已填的內容留著**。
//
// 送出之前的規則不在這裡：規則住在 CredentialsDomain，這裡只把兩格與模式往上送，
// 再把回來的每一格錯誤畫在該格底下。元件不寫業務規則——鎖定前還剩幾次、
// 暫停到幾點，那幾句話都由 useUserSession 備好，這裡照原樣說出來。
//
// 單欄。窄螢幕上它佔滿整個畫面、主要那一顆沉到最底下，拇指搆得到；
// 寬螢幕上它是一張置中的卡片。
const {
  pending = false,
  errorMessage = null,
  emailError = null,
  passwordError = null,
  notice = null,
} = defineProps<{
  pending?: boolean
  errorMessage?: string | null
  emailError?: string | null
  passwordError?: string | null
  /**
   * 上一個畫面留下的一句話，例如「密碼已更換，請用新密碼重新登入」。
   *
   * 它與 errorMessage 分開，因為它講的不是這一次送出失敗了——它解釋的是
   * **為什麼這個人會在這裡**。用紅字說出來，看起來就像他剛才做的事出了錯。
   */
  notice?: string | null
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
      <span class="sign-in-panel__brand-mark">
        <AppIcon name="candles" />
      </span>
      <span class="sign-in-panel__brand-name">Go Trading</span>
    </div>

    <div class="sign-in-panel__heading">
      <h1 class="sign-in-panel__title">
        {{ title }}
      </h1>
      <p class="sign-in-panel__caption">
        {{ caption }}
      </p>
    </div>

    <div class="sign-in-panel__fields">
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
        v-if="notice"
        tone="info"
        data-testid="sign-in-notice"
      >
        {{ notice }}
      </AppAlert>

      <AppAlert
        v-if="errorMessage"
        tone="danger"
        data-testid="submission-error"
      >
        {{ errorMessage }}
      </AppAlert>
    </div>

    <div class="sign-in-panel__actions">
      <AppButton
        type="submit"
        size="large"
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
    </div>
  </form>
</template>

<style scoped lang="scss">
.sign-in-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('xl');
  width: 100%;

  // 窄螢幕上它被頁面撐滿整個畫面的高度，主要那一顆因此沉得到底。
  max-width: 24rem;

  @include respond-to('md') {
    gap: spacing('lg');
    box-shadow: shadow('md');
    border: 1px solid color('border');
    border-radius: radius('lg');
    background-color: color('surface');
    padding: spacing('2xl') spacing('xl');
  }

  &__brand {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }

  // 與側欄同一顆記號：一走進門就看得出這裡是哪裡。
  &__brand-mark {
    display: grid;
    flex: none;
    place-items: center;
    border-radius: radius('md');
    background-image: linear-gradient(135deg, color('primary'), color('primary-strong'));
    width: 2.75rem;
    height: 2.75rem;
    color: color('text-inverse');
  }

  &__brand-name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-size: font-size('2xl');
    line-height: line-height('tight');
  }

  &__caption {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  // 窄螢幕上把動作推到最底下；寬螢幕上它就接在欄位後面。
  &__actions {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    align-items: center;
    margin-top: auto;

    @include safe-area-bottom;

    @include respond-to('md') {
      margin-top: 0;
      padding-bottom: 0;
    }
  }
}
</style>
