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
} = useUserSession()
</script>

<template>
  <main class="login-page">
    <SignInPanel
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
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color('background');
  padding: spacing('lg');

  // 卡片後面那層光暈是它自己的 ::before，畫在 z-index -1 上。
  // 沒有這一行的話，那個負數會把它推到這一層的底色後面去——也就是看不見。
  isolation: isolate;

  // 整片視窗都是這一頁：門後面的東西一點都不該露出來。
  min-height: 100%;
}
</style>
