<script setup lang="ts">
import type { AnswerSegmentVo } from '~/domain/models/vo/answer-segment-vo'

// 分子：一行文字裡的那幾段——普通、被強調的、代號那類等寬的。
//
// 它獨立成一個元件，是因為段落、條列、編號的每一行**都是同一件事**：
// 幾段文字接起來。寫在每一種結構裡的話，「一段強調長什麼樣」就有四份，
// 而且四份會慢慢走鐘。
//
// **每一段都以文字繩定輸出**（`{{ }}`），沒有任何一處把內容當成標記解讀。
const { segments } = defineProps<{
  segments: readonly AnswerSegmentVo[]
}>()
</script>

<template>
  <span class="assistant-answer-line">
    <template
      v-for="(segment, segmentIndex) in segments"
      :key="segmentIndex"
    >
      <strong
        v-if="segment.kind === 'strong'"
        class="assistant-answer-line__strong"
      >{{ segment.text }}</strong>
      <code
        v-else-if="segment.kind === 'code'"
        class="assistant-answer-line__code"
      >{{ segment.text }}</code>
      <span v-else>{{ segment.text }}</span>
    </template>
  </span>
</template>

<style scoped lang="scss">
.assistant-answer-line {
  &__strong {
    color: color('text-strong');
    font-weight: font-weight('semibold');
  }

  &__code {
    border-radius: radius('pill');
    background-color: color('surface-raised');
    padding: 0.05rem spacing('xs');

    @include code-typography;
  }
}
</style>
