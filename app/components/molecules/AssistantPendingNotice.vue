<script setup lang="ts">
// 分子：送出之後、回答回來之前那一塊。
//
// 它長在提問下面而不是蓋住整頁，因為使用者要看得到自己問了什麼——
// 一片遮罩會讓那兩分鐘變成「什麼都看不到的兩分鐘」。
//
// 助手一次回答可能來回查好幾次，因此比操作台任何既有操作都久。等超過門檻
// 就補一句說明：太早講顯得系統很慢，完全不講則讓人以為畫面壞了而去重整——
// 重整之後那一次的結果就看不到了（雖然它其實已經落在後端）。
const { patienceThresholdSeconds = 20 } = defineProps<{
  patienceThresholdSeconds?: number
}>()

const waitedLong = ref(false)

onMounted(() => {
  const timer = setTimeout(() => {
    waitedLong.value = true
  }, patienceThresholdSeconds * 1000)

  onBeforeUnmount(() => clearTimeout(timer))
})
</script>

<template>
  <div
    class="assistant-pending-notice"
    role="status"
    data-testid="assistant-pending"
  >
    <span class="assistant-pending-notice__dots">
      <span />
      <span />
      <span />
    </span>

    <span class="assistant-pending-notice__label">
      助手正在查…
      <span
        v-if="waitedLong"
        class="assistant-pending-notice__patience"
        data-testid="assistant-pending-patience"
      >這一題查得比較久，最長會等兩分鐘。</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
.assistant-pending-notice {
  display: flex;
  align-items: baseline;
  gap: spacing('xs');
  color: color('text-muted');
  font-size: font-size('sm');

  &__dots {
    display: inline-flex;
    gap: 3px;
    padding-top: 6px;

    > span {
      animation: assistant-pending-pulse 1.2s ease-in-out infinite;
      border-radius: radius('pill');
      background-color: color('text-faint');
      width: 5px;
      height: 5px;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  &__patience {
    display: block;
    color: color('text-faint');
    font-size: font-size('xs');
  }
}

@keyframes assistant-pending-pulse {
  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }
}
</style>
