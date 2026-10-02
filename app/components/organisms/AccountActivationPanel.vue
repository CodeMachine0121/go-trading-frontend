<script setup lang="ts">
import type { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

// 有機體：等待開通那一頁上的整張卡片。這一頁的互動全部住在這裡。
//
// 它與 SignInPanel 同一個外型，因為它們是同一類畫面：**還沒進門的人在看的那一頁**。
// 換一個長相會讓人以為自己走到了別的地方。
const { instruction, email, rechecking = false } = defineProps<{
  /**
   * 要寄去哪、主旨寫什麼。
   *
   * 它可以是 null——後端在放行之後就不再附上它。這一頁理論上到不了那個狀態
   * （把關會先把人送走），但這個元件不該假設呼叫端一定先問過。
   */
  instruction: AccountActivationInstructionDto | null
  email: string
  rechecking?: boolean
}>()

const emit = defineEmits<{
  recheck: []
  signOut: []
}>()

// 兩顆複製鍵各自記自己的狀態。共用一份的話，按了其中一顆，兩顆會同時打勾，
// 而使用者不會知道自己到底複製了哪一段。
const mailboxCopy = useCopyText()
const subjectCopy = useCopyText()

const { t } = useI18n()
const { localize } = useLocalizedText()

function labelFor(state: 'idle' | 'copied' | 'failed'): string {
  if (state === 'copied') {
    return t('shell.copyText.copied')
  }

  return state === 'failed' ? t('shell.copyText.failed') : t('shell.copyText.copy')
}

const copyFailureMessage = computed(
  () => subjectCopy.failureMessage.value ?? mailboxCopy.failureMessage.value)
</script>

<template>
  <section class="account-activation-panel">
    <div class="account-activation-panel__brand">
      <span class="account-activation-panel__brand-mark">
        <AppIcon name="candles" />
      </span>
      <span class="account-activation-panel__brand-name">Go Trading</span>
    </div>

    <div class="account-activation-panel__heading">
      <h1 class="account-activation-panel__title">
        {{ t('shell.accountActivation.title') }}
      </h1>
      <i18n-t
        keypath="shell.accountActivation.caption"
        tag="p"
        class="account-activation-panel__caption"
      >
        <template #email>
          <strong>{{ email }}</strong>
        </template>
      </i18n-t>
    </div>

    <template v-if="instruction">
      <div class="account-activation-panel__field">
        <span class="account-activation-panel__label">{{ t('shell.accountActivation.mailboxLabel') }}</span>
        <div class="account-activation-panel__value-row">
          <code
            class="account-activation-panel__value"
            data-testid="request-mailbox"
          >{{ instruction.requestMailbox }}</code>
          <AppButton
            variant="ghost"
            size="small"
            data-testid="copy-mailbox"
            @click="mailboxCopy.copyText(instruction.requestMailbox)"
          >
            {{ labelFor(mailboxCopy.state.value) }}
          </AppButton>
        </div>
      </div>

      <div class="account-activation-panel__field">
        <span class="account-activation-panel__label">{{ t('shell.accountActivation.subjectLabel') }}</span>
        <div class="account-activation-panel__value-row">
          <!--
            等寬字、可換行、整段選得起來：主旨裡有他自己的電子郵件，可能很長，
            而**改一個字收信的人就認不出是誰在申請**。截斷或加省略號，
            手動選取時就會漏掉尾巴。
          -->
          <code
            class="account-activation-panel__value account-activation-panel__value--wrap"
            data-testid="request-subject"
          >{{ instruction.subject }}</code>
          <AppButton
            variant="ghost"
            size="small"
            data-testid="copy-subject"
            @click="subjectCopy.copyText(instruction.subject)"
          >
            {{ labelFor(subjectCopy.state.value) }}
          </AppButton>
        </div>
      </div>

      <AppAlert
        v-if="copyFailureMessage"
        tone="danger"
        data-testid="copy-failure"
      >
        {{ localize(copyFailureMessage) }}
      </AppAlert>

      <a
        class="account-activation-panel__mailto"
        :href="instruction.toMailtoHref()"
        data-testid="open-mail"
      >
        {{ t('shell.accountActivation.sendRequest') }}
      </a>
    </template>

    <AppAlert
      v-else
      tone="info"
      data-testid="no-instruction"
    >
      {{ t('shell.accountActivation.noInstruction') }}
    </AppAlert>

    <div class="account-activation-panel__actions">
      <AppButton
        variant="secondary"
        size="large"
        block
        :disabled="rechecking"
        data-testid="recheck"
        @click="emit('recheck')"
      >
        {{ rechecking ? t('shell.accountActivation.rechecking') : t('shell.accountActivation.recheck') }}
      </AppButton>

      <!--
        登出留在這裡，因為這一頁是他唯一到得了的地方——沒有它，想換一個帳號的人
        就只能自己去清瀏覽器儲存。
      -->
      <AppButton
        variant="ghost"
        size="small"
        data-testid="sign-out"
        @click="emit('signOut')"
      >
        {{ t('shell.signedInUser.signOut') }}
      </AppButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
// 與登入那一張同一種語言：單欄、窄螢幕上佔滿畫面、主要動作沉到底；寬螢幕上一張置中的卡片。
.account-activation-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');
  width: 100%;
  max-width: 28rem;

  @include respond-to('md') {
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
    line-height: line-height('relaxed');
    font-size: font-size('sm');
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__label {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__value-row {
    display: flex;
    gap: spacing('xs');
    align-items: flex-start;
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('xs');
  }

  &__value {
    flex: 1;
    min-width: 0;
    color: color('text-strong');
    font-size: font-size('xs');
    font-family: font-family('mono');

    // 整段選得起來，而且選得完整：這一串是要被原字帶走的。
    user-select: all;
  }

  &__value--wrap {
    // 主旨裡有他自己的電子郵件，可能沒有空白可以斷。寧可從字中間折，
    // 也不要截斷——截斷之後手動選取會漏掉尾巴，而他不會發現。
    overflow-wrap: anywhere;
  }

  // 它是一條連結而不是一顆 AppButton，因為它真的要導去 mailto:——
  // 那是瀏覽器的事，不是這一頁的事。長相跟主要按鍵借同一組 token，
  // 免得畫面上出現兩種「主要動作」的樣子。
  &__mailto {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: radius('sm');
    background-color: color('primary');
    padding: spacing('xs') spacing('sm');
    color: color('text-inverse');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
    text-decoration: none;

    @include tap-target;
    @include focus-ring;

    &:hover {
      background-color: color('primary-strong');
    }
  }

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
