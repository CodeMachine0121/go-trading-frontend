<script setup lang="ts">
import AppCodeEditor from '~/components/atoms/AppCodeEditor.vue'
import AssistantAnswerLine from '~/components/molecules/AssistantAnswerLine.vue'
import type { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'

// 分子：把一則訊息拆好的那幾塊畫出來。
//
// 助手圈起來的**程式碼**用的是操作台**同一個**程式碼區塊元件（`AppCodeEditor`）的
// 唯讀樣子：同一套著色、同一條行號欄、同一組字體行高。使用者會把那段東西
// 貼進算式編輯器，兩邊長得一樣他才認得出那是同一種東西；而後端說「第 12 行出錯」時，
// 畫面上就是那一行。
//
// **唯讀不是樣式上的收斂，是那個元件的一種樣子**（`readonly`）：它拿掉整組編輯用的
// 擴充，並讓編輯器本身回報自己不可編輯。一則已經說出口的訊息不該能被改，
// 改了之後對話就不再是對話的紀錄。
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

      <!--
        助手圈起來的程式碼：與算式編輯器同一個元件的唯讀樣子。
        它不吃鍵盤、改不動——一則已經說出口的訊息不該能被改。
      -->
      <div
        v-else-if="block.kind === 'code'"
        class="assistant-answer-blocks__code-block"
        data-testid="assistant-answer-code"
      >
        <span
          v-if="block.language !== ''"
          class="assistant-answer-blocks__code-language"
          data-testid="assistant-answer-code-language"
        >{{ block.language }}</span>

        <AppCodeEditor
          readonly
          :model-value="rawTextOf(block)"
        />
      </div>

      <!-- 表格那幾行照原樣當文字：那不是程式碼，給它行號只會讓人以為可以貼去執行 -->
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

  // 程式碼那一塊自己是一整塊，所以圓角吃在外面這層，讓編輯器貼齊它的邊。
  &__code-block {
    position: relative;
    border-radius: radius('xl');
    background-color: color('surface-raised');
    overflow: hidden;
  }

  // 語言標在右上角，小而暗。它是那份 Go 味著色的誠實對照——
  // 助手貼一段 JSON 進來時，顏色是 Go 的，但這裡說得出那其實是 JSON。
  &__code-language {
    position: absolute;
    top: spacing('2xs');
    right: spacing('xs');
    z-index: 1;
    color: color('text-faint');

    @include dense-label;
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
