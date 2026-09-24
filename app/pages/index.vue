<script setup lang="ts">
import { HOME_PATH } from '~/composables/use-user-session'

// 網址的根目錄不是一個畫面，它只是門牌：走到這裡的人一律被帶到第一站。
//
// 它以前是「連線狀態」那一頁。那一頁只說後端還活不活著，而那件事側欄那顆燈
// 在每一頁都已經說了——一個去處不值得只為了把同一句話說大聲一點而存在。
definePageMeta({ redirect: HOME_PATH })
</script>

<template>
  <div />
</template>
