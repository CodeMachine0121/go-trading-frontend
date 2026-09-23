<script setup lang="ts">
// 原子：貼在畫面最頂端的一條細橫條，說「正在等」。
//
// 它不知道在等什麼、等了幾件——那是使用端的事，它只負責在 `active` 時出現。
// 進度是**不定**的：沒有人知道一發請求還要多久，畫一個走到 70% 的條只是在編一個數字。
//
// 它不佔版面、不擋點擊：等待期間其他東西照樣看得到、按得到。
const { active = false } = defineProps<{ active?: boolean }>()
</script>

<template>
  <Transition name="app-progress-bar">
    <div
      v-if="active"
      class="app-progress-bar"
      role="progressbar"
      aria-label="載入中"
      aria-busy="true"
    >
      <span class="app-progress-bar__runner" />
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.app-progress-bar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: z-index('progress');
  overflow: hidden;
  background-color: color('primary-soft');
  height: 0.1875rem;
  pointer-events: none;

  &__runner {
    display: block;
    animation: app-progress-bar-run 1.1s ease-in-out infinite;
    background-color: color('primary');
    width: 40%;
    height: 100%;
  }
}

// 淡入淡出而不是直接出現：它在眼角餘光裡，直接冒出來看起來像閃一下。
.app-progress-bar-enter-active,
.app-progress-bar-leave-active {
  transition: opacity duration('normal') ease;
}

.app-progress-bar-enter-from,
.app-progress-bar-leave-to {
  opacity: 0;
}

// 關掉動畫的人仍然要看得出「正在等」，只是那一段不再來回跑。
@media (prefers-reduced-motion: reduce) {
  .app-progress-bar__runner {
    animation: none;
    width: 100%;
  }

  .app-progress-bar-enter-active,
  .app-progress-bar-leave-active {
    transition: none;
  }
}

@keyframes app-progress-bar-run {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(250%);
  }
}
</style>
