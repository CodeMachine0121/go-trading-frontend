<script setup lang="ts">
import SignInPanel from '~/components/organisms/SignInPanel.vue'

// 頁面只做接線：取用跨畫面共用的「現在是誰在用」，往下傳給那張卡片。
//
// 它**不套用操作台外框**——側欄與頂欄是給進了門的人看的，
// 而還沒進門的人在這一頁能做的事只有一件。
const {
  pending,
  errorMessage,
  fieldErrors,
  submitCredentials,
  clearSubmissionFeedback,
  takeSignInNotice,
} = useUserSession()

/**
 * 上一個畫面留下的一句話，例如「密碼已更換」。
 *
 * 它在這裡就被取走並用掉——留著的話，下一次因為別的原因回到登入畫面時，
 * 它會再說一次一件早就過去的事。
 */
const notice = ref(takeSignInNotice())
</script>

<template>
  <main class="login-page">
    <SignInPanel
      :notice="notice"
      :pending="pending"
      :error-message="errorMessage"
      :email-error="fieldErrors?.email ?? null"
      :password-error="fieldErrors?.password ?? null"
      @submit="submitCredentials"
      @mode-change="clearSubmissionFeedback"
    />
  </main>
</template>

<style scoped lang="scss">
.login-page {
  // 窄螢幕：卡片就是整個畫面，從上往下排；寬螢幕：一張置中的卡片。
  display: flex;
  justify-content: center;
  background-color: color('background');
  padding: spacing('2xl') spacing('xl') spacing('lg');

  // 整片視窗都是這一頁：門後面的東西一點都不該露出來。
  min-height: 100dvh;

  @include respond-to('md') {
    align-items: center;
    padding: spacing('lg');
  }
}
</style>
