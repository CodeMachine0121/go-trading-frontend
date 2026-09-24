<script setup lang="ts">
import AccountActivationPanel from '~/components/organisms/AccountActivationPanel.vue'

// 頁面只做接線：取用跨畫面共用的「現在是誰在用」，往下傳給那張卡片。
//
// 它**不套用操作台外框**——與登入頁完全同一個決定。側欄與頂欄是給進了門的人看的，
// 而給一個還沒被放行的人看一個點不動的操作台，只會讓他一直去點。
//
// 這一頁沒有自己的把關。誰看得到它、誰看不到，全部由全域中介層決定——
// 在這裡再判一次，就是同一條規則寫兩遍，而兩遍總有一天會不一致。
const { currentUser, activationInstruction, pending, recheckActivation, signOut } = useUserSession()
</script>

<template>
  <main class="pending-approval-page">
    <AccountActivationPanel
      :instruction="activationInstruction"
      :email="currentUser?.email ?? ''"
      :rechecking="pending"
      @recheck="recheckActivation"
      @sign-out="signOut"
    />
  </main>
</template>

<style scoped lang="scss">
.pending-approval-page {
  // 與登入頁同一個版面：窄螢幕上卡片就是整個畫面，寬螢幕上置中。
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
