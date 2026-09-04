<script setup lang="ts">
import AssistantAnswerLine from '~/components/molecules/AssistantAnswerLine.vue'
import type { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'

// 分子：把一則訊息拆好的那幾塊畫出來。
//
// 每一塊都是「一種 + 幾行」，所以這裡只是把種類分派到對應的容器；
// 一行裡面長什麼樣是 AssistantAnswerLine 的事。要多認一種結構時，
// 是在 domain 的拆解器加一種、在這裡加一個分支——一行都不必改別的地方。
const { blocks } = defineProps<{
  blocks: readonly AnswerBlockVo[]
}>()

/** 照原樣的那一塊要顯示的原文。它刻意不拆行內片段——原樣的重點就是原樣。 */
function rawTextOf(block: AnswerBlockVo): string {
  return block.lines
    .map(line => line.map(segment => segment.text).join(''))
    .join('\n')
}
</script>

<template>
  <div
    class="assistant-answer-blocks"
    data-testid="assistant-answer-blocks"
  >
    <template
      v-for="(block, blockIndex) in blocks"
      :key="blockIndex"
    >
      <h3
        v-if="block.kind === 'heading'"
        class="assistant-answer-blocks__heading"
        data-testid="assistant-answer-heading"
      >
        <AssistantAnswerLine :segments="block.lines[0] ?? []" />
      </h3>

      <ul
        v-else-if="block.kind === 'bulletList'"
        class="assistant-answer-blocks__list"
      >
        <li
          v-for="(line, lineIndex) in block.lines"
          :key="lineIndex"
        >
          <AssistantAnswerLine :segments="line" />
        </li>
      </ul>

      <ol
        v-else-if="block.kind === 'orderedList'"
        class="assistant-answer-blocks__list"
      >
        <li
          v-for="(line, lineIndex) in block.lines"
          :key="lineIndex"
        >
          <AssistantAnswerLine :segments="line" />
        </li>
      </ol>

      <!-- 照原樣的那幾行：助手排的表格與程式碼片段都落在這裡，一個字都不解讀 -->
      <pre
        v-else-if="block.kind === 'preformatted'"
        class="assistant-answer-blocks__preformatted"
        data-testid="assistant-answer-preformatted"
      >{{ rawTextOf(block) }}</pre>

      <p
        v-else
        class="assistant-answer-blocks__paragraph"
        data-testid="assistant-answer-paragraph"
      >
        <template
          v-for="(line, lineIndex) in block.lines"
          :key="lineIndex"
        >
          <br v-if="lineIndex > 0">
          <AssistantAnswerLine :segments="line" />
        </template>
      </p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.assistant-answer-blocks {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');
  color: color('text');
  font-size: font-size('sm');
  line-height: line-height('relaxed');

  &__heading {
    margin: spacing('xs') 0 0;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');

    &:first-child {
      margin-top: 0;
    }
  }

  &__paragraph {
    margin: 0;
  }

  &__list {
    margin: 0;
    padding-left: spacing('md');

    > li + li {
      margin-top: spacing('xs');
    }
  }

  &__preformatted {
    margin: 0;
    border-radius: radius('xl');
    background-color: color('surface-raised');
    padding: spacing('xs');
    overflow-x: auto;

    @include code-typography;
  }
}
</style>
