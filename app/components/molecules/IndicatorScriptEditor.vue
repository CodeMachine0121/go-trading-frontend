<script setup lang="ts">
import AppCodeEditor from '~/components/atoms/AppCodeEditor.vue'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'

// 分子：一整塊「看起來就是一份 Go 檔案」的編輯區。
//
// 唯讀的外框（package 與 import）與可編輯的檔案主體是同一個原子的兩份，因此著色、
// 行號欄與字體行高天生一致，讀起來是一份連續的程式碼。行號也是連續的：外框從第一行
// 開始，主體接在一個空行之後——後端說「第 12 行出錯」時，畫面上就是那一行。
//
// **進入點與收尾的括號都在可編輯區裡**：使用者可以自訂進入點的長相、也可以在它旁邊
// 寫 helper 函式。外框只固定最上面那七行——它不隨指標值種類變。
const { scriptTemplate } = defineProps<{
  scriptTemplate: IndicatorScriptTemplateDto
  errorMessage?: string | null
}>()

const scriptBody = defineModel<string>({ required: true })

// 外框之後留一個空行（Go 慣例），主體接在它下面。
const frameWithSeparator = computed(() => `${scriptTemplate.frameHeader}\n`)

const bodyEditor = useTemplateRef('bodyEditor')

// 整塊留著一份夠大的高度，多出來的空白落在整份檔案的後面（就像編輯器裡的檔尾），
// 而不是把收尾的括號推得離程式碼老遠。點在那片空白上照樣接著最後一行打字。
function continueWriting() {
  bodyEditor.value?.focusAtEnd()
}
</script>

<template>
  <section
    class="indicator-script-editor"
    :class="{ 'indicator-script-editor--invalid': Boolean(errorMessage) }"
  >
    <header class="indicator-script-editor__bar">
      <div class="indicator-script-editor__identity">
        <span class="indicator-script-editor__filename">indicator.go</span>
        <span class="indicator-script-editor__hint">
          在 import 底下寫，至少要有一個 Calculate 進入點；換指標值種類會改它的回傳型別
        </span>
      </div>
      <div class="indicator-script-editor__tools">
        <slot name="toolbar" />
      </div>
    </header>

    <div class="indicator-script-editor__file">
      <AppCodeEditor
        :model-value="frameWithSeparator"
        class="indicator-script-editor__frame"
        readonly
        data-testid="script-frame-header"
      />

      <AppCodeEditor
        ref="bodyEditor"
        v-model="scriptBody"
        class="indicator-script-editor__body"
        data-testid="script-body"
        :start-line-number="scriptTemplate.bodyStartLineNumber"
        :invalid="Boolean(errorMessage)"
      />

      <div
        class="indicator-script-editor__filler"
        data-testid="script-filler"
        @mousedown.prevent="continueWriting"
      />
    </div>

    <p
      v-if="errorMessage"
      class="indicator-script-editor__error"
      data-testid="field-error"
    >
      {{ errorMessage }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.indicator-script-editor {
  display: flex;
  flex-direction: column;

  // 編輯區跟著工作台的高度長，多出來的高度落在檔尾（見 __filler），
  // 不是留在面板外面當空白。
  min-height: 0;
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface-raised');
  overflow: hidden;

  &--invalid {
    border-color: color('danger');
  }

  // 這條列與面板的標題列是同一條列——編輯區也是這個操作台上的一塊面板，
  // 只是它裡面裝的是一份檔案。
  &__bar {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('sm');
    min-height: 2.25rem;
  }

  &__identity {
    display: flex;
    gap: spacing('sm');
    align-items: baseline;
    min-width: 0;
  }

  &__filename {
    color: color('text-strong');
    font-size: font-size('xs');
    font-family: font-family('mono');
    white-space: nowrap;
  }

  &__hint {
    overflow: hidden;
    color: color('text-faint');
    font-size: font-size('2xs');
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__tools {
    display: flex;
    flex: none;
    gap: spacing('2xs');
    align-items: center;
  }

  &__file {
    display: flex;
    flex: 1;
    flex-direction: column;

    // 上下疊起來的窄螢幕上沒有「剩下的高度」可以吃，所以仍然留一塊夠大的底線。
    // 寬螢幕上它只是地板：真正決定高度的是這一欄還剩多少，由外面的 flex 給。
    min-height: 24rem;
    overflow: auto;
  }

  &__filler {
    flex: 1;
    min-height: spacing('2xl');
    cursor: text;
  }

  &__error {
    margin: 0;
    flex: none;
    border-top: 1px solid color('border');
    background-color: color('danger-soft');
    padding: spacing('2xs') spacing('sm');
    color: color('danger');
    font-size: font-size('2xs');
  }
}
</style>
