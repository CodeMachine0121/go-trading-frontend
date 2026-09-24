<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

// 分子：把一段文字複製走。
//
// 助手給的東西是要拿去用的——一段算式貼進編輯器、一組數字貼進試算表。
// 沒有這一顆，使用者得自己在一個唯讀的區塊裡拖曳選取，而那在圓角的小卡片裡
// 又特別難選。
//
// 它自己記著剛才那一下的結果（**每一顆各自記**），因為共用一份的話，
// 按了某一段程式碼旁邊那顆，畫面上每一顆都會同時打勾。
//
// 複製失敗不靜靜失敗：瀏覽器在非安全連線或權限被拒時會拒絕，
// 使用者若不知道，他會帶著一個空的剪貼簿去貼上，然後以為是貼上的地方壞了。
const { text, label = '複製' } = defineProps<{
  text: string
  /** 這一顆複製的是什麼，說給讀螢幕的人與滑鼠停留的提示聽。 */
  label?: string
}>()

const { state, failureMessage, copyText } = useCopyText()

const currentLabel = computed(() => {
  if (state.value === 'copied') {
    return '已複製'
  }

  return state.value === 'failed' ? (failureMessage.value ?? '複製失敗') : label
})
</script>

<template>
  <AppButton
    variant="ghost"
    size="small"
    shape="pill"
    :label="currentLabel"
    class="copy-text-button"
    :class="{ 'copy-text-button--failed': state === 'failed' }"
    data-testid="copy-text-button"
    @click="copyText(text)"
  >
    <AppIcon
      :name="state === 'copied' ? 'copied' : 'copy'"
      size="small"
    />
  </AppButton>
</template>

<style scoped lang="scss">
.copy-text-button {
  // 它疊在內容旁邊，平常不搶注意力；滑到它上面（或剛複製完）才亮起來。
  color: color('text-faint');

  &:hover:not(:disabled) {
    color: color('text-strong');
  }

  &--failed {
    color: color('danger');
  }
}
</style>
