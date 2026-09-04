<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

// 分子：一次問答被拒絕時，長在**回答該出現的位置**的那一塊。
//
// 不是畫面頂端的橫幅：額度用盡是「這一句沒送成」，不是「整個畫面壞了」。
// 長在對話串裡，它就明確地屬於上面那一則提問。
//
// 說的是哪一句話由使用端決定（四種拒絕四種說法，那句話寫在共用狀態裡），
// 這裡只負責把它擺對位置並提供再試一次。
const { message, retryable = true } = defineProps<{
  message: string
  /** 有些拒絕重試沒有意義（例如那一段對話已經不在了）。 */
  retryable?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <AppAlert
    tone="danger"
    class="assistant-rejection-notice"
    data-testid="assistant-rejection"
  >
    <p
      class="assistant-rejection-notice__message"
      data-testid="assistant-rejection-message"
    >
      {{ message }}
    </p>

    <AppButton
      v-if="retryable"
      variant="ghost"
      size="small"
      shape="pill"
      data-testid="assistant-rejection-retry"
      @click="emit('retry')"
    >
      <AppIcon
        name="refresh"
        size="small"
      />
      再試一次
    </AppButton>
  </AppAlert>
</template>

<style scoped lang="scss">
.assistant-rejection-notice {
  // 這一塊住在對話串裡，所以它的角要跟泡泡一樣圓，而不是跟表單的警示一樣方。
  border-radius: radius('2xl');

  &__message {
    margin: 0 0 spacing('xs');
    line-height: line-height('relaxed');
  }
}
</style>
