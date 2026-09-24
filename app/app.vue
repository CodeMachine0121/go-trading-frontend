<script setup lang="ts">
import AppProgressBar from '~/components/atoms/AppProgressBar.vue'

// 外觀在第一個畫面畫出來之前就要套上，否則選了淺色的人會先看到一瞬間的深色。
// 整台操作台只在瀏覽器裡畫（ssr: false），所以這裡的 setup 就已經在瀏覽器裡。
const { initializeAppearance } = useAppearance()
initializeAppearance()

// 頂端那條進度條：畫面正在等系統回話，或正在換頁。
const { visible: waiting, followNavigation } = useRequestActivity()
followNavigation()
</script>

<template>
  <AppProgressBar :active="waiting" />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
