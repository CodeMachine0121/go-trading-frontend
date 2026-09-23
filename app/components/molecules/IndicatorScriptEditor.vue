<script setup lang="ts">
import AppCodeEditor from '~/components/atoms/AppCodeEditor.vue'

// 分子：一整塊「就是一份 Go 檔案」的編輯區。
//
// **整份都是使用者的**——最上面的 package 與 import 也一樣。它們是開一份新的空白
// 策略腳本時預填進來的內容，不是畫面把持的外框：改得動、刪得掉，而畫面上這一份
// 就是送出去、存下去的那一份。
//
// 因此這裡只有一個編輯器、一欄行號，從第 1 行算起——後端說「第 12 行出錯」時，
// 畫面上就是那一行。
const { concealed = false } = defineProps<{
  errorMessage?: string | null
  /**
   * 這支策略腳本的算式不公開——它是從市集加入來的。
   *
   * 那時這裡**沒有編輯器**，只有一句話：市集上的策略腳本本來就沒有算式這一欄，
   * 畫一個空白的編輯器會讓人以為那支策略腳本是空的，或以為自己可以開始寫。
   */
  concealed?: boolean
}>()

const script = defineModel<string>({ required: true })

const scriptEditor = useTemplateRef('scriptEditor')

// 整塊留著一份夠大的高度，多出來的空白落在整份檔案的後面（就像編輯器裡的檔尾），
// 而不是把收尾的括號推得離程式碼老遠。點在那片空白上照樣接著最後一行打字。
function continueWriting() {
  scriptEditor.value?.focusAtEnd()
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
        <span
          v-if="concealed"
          class="indicator-script-editor__hint"
        >
          從市集加入的，只能用、不能改
        </span>
        <span
          v-else
          class="indicator-script-editor__hint"
        >
          整份都改得動，至少要有一個 Calculate 進入點；換指標值種類會改它的回傳型別
        </span>
      </div>
      <div class="indicator-script-editor__tools">
        <slot name="toolbar" />
      </div>
    </header>

    <p
      v-if="concealed"
      class="indicator-script-editor__concealed"
      data-testid="script-concealed"
    >
      這支策略腳本的算式不公開
    </p>

    <div
      v-else
      class="indicator-script-editor__file"
    >
      <AppCodeEditor
        ref="scriptEditor"
        v-model="script"
        data-testid="script"
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
  // 一排不會縮的圖示鍵加一個檔名，在窄螢幕上排不成一行。讓它換行，
  // 而不是把檔名擠成一行一個字。
  &__bar {
    display: flex;
    flex-wrap: wrap;
    flex: none;
    gap: spacing('xs') spacing('md');
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

  // 六顆圖示鍵排起來將近四百像素，比一支手機還寬，而圖示不會縮。
  // 它們自己也要能換行——不然那一整組會把窄帶撐破。
  &__tools {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    align-items: center;
    justify-content: flex-end;
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

  // 與檔案那一塊同一個高度底線：切換之後整塊不會忽然縮成一行，把右欄的結果頂上來。
  &__concealed {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: spacing('lg');
    min-height: 24rem;
    color: color('text-faint');
    font-size: font-size('sm');
    text-align: center;
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
