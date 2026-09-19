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
