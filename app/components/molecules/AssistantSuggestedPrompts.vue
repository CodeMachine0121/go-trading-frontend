<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 分子：空的對話上那幾句可直接點的範例提問。
//
// 它存在的理由不是裝飾：助手辦得到好幾種事（列交易標的、查行情、讀策略腳本、算指標），
// 而使用者從畫面上**看不出來**。只放一句「請開始輸入」等於要人猜，
// 猜錯幾次之後他就不再用這個功能了。
//
// 點一下直接送出，不必再按送出鍵——它的重點是「看到就能試」。
//
// 外形是膠囊：一句可以點的話是一枚籌碼，方形會讓它看起來像四顆按鈕排在那裡，
// 而按鈕讀起來是「動作」，籌碼讀起來是「選一個」。
const { prompts } = defineProps<{
  prompts: readonly LocalizedTextVo[]
}>()

/** 送出的是畫面上看到的那一句：英文畫面點下去問的就是英文那一句。 */
const emit = defineEmits<{ select: [prompt: string] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <div
    class="assistant-suggested-prompts"
    data-testid="assistant-suggested-prompts"
  >
    <p class="assistant-suggested-prompts__title">
      {{ t('assistant.suggestedPrompts.title') }}
    </p>

    <ul class="assistant-suggested-prompts__list">
      <li
        v-for="prompt in prompts"
        :key="prompt.traditionalChinese"
      >
        <AppButton
          variant="secondary"
          size="small"
          shape="pill"
          data-testid="assistant-suggested-prompt"
          @click="emit('select', localize(prompt))"
        >
          {{ localize(prompt) }}
        </AppButton>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.assistant-suggested-prompts {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__title {
    margin: 0;

    @include dense-label;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }
}
</style>
