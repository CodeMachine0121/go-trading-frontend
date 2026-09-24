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
//
// 標頭是一張檔案卡的頭：左邊是檔名與它的狀態（status 插槽），右邊是對這一支做的事
// （actions 插槽）；底下一條細帶放寫的時候會調的東西（toolbar 插槽）。
// 三個插槽裝什麼由使用端決定，這裡只管它們擺在哪。
const { concealed = false, fileName = 'indicator.go' } = defineProps<{
  errorMessage?: string | null
  /**
   * 標頭上那個檔名。工作區載入了哪一支，這裡就寫那一支的名字；
   * 一支都還沒有時是一份沒有名字的新檔。
   */
  fileName?: string
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
    <header class="indicator-script-editor__head">
      <div class="indicator-script-editor__identity">
        <span class="indicator-script-editor__filename">{{ fileName }}</span>
        <slot name="status" />
      </div>
      <div
        v-if="$slots.actions"
        class="indicator-script-editor__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <div class="indicator-script-editor__bar">
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
      <div class="indicator-script-editor__tools">
        <slot name="toolbar" />
      </div>
    </div>

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
  background-color: color('surface');
  overflow: hidden;

  &--invalid {
    border-color: color('danger');
  }

  // 檔案卡的頭：檔名在左、動作在右。窄螢幕上一排動作鍵比螢幕還寬，
  // 讓它換行，而不是把檔名擠成一行一個字。
  &__head {
    display: flex;
    flex-wrap: wrap;
    flex: none;
    gap: spacing('xs') spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    padding: spacing('xs') spacing('sm');
  }

  &__identity {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    min-width: 0;
  }

  &__filename {
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
    font-family: font-family('mono');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions,
  &__tools {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    align-items: center;
  }

  // 寫的時候會調的那幾樣，一條比標頭淡一階的細帶；那句提醒靠左，控制項靠右。
  &__bar {
    display: flex;
    flex-wrap: wrap;
    flex: none;
    gap: spacing('2xs') spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('sm');
  }

  &__hint {
    min-width: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__file {
    display: flex;
    flex: 1;
    flex-direction: column;
    background-color: color('surface-raised');

    // 上下疊起來的窄螢幕上沒有「剩下的高度」可以吃，所以仍然留一塊夠大的底線。
    // 寬螢幕上它只是地板：真正決定高度的是這一欄還剩多少，由外面的 flex 給。
    min-height: 24rem;
    overflow: auto;
  }

  // 它吃掉這一塊剩下的高度，那一句落在正中間。不沿用檔案那一塊的 24rem 底線：
  // 窄螢幕上外框比那矮，置中的那一句會被推到框外、被切掉——而它是這裡唯一的內容。
  &__concealed {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    margin: 0;
    background-color: color('surface-raised');
    padding: spacing('lg');
    min-height: 8rem;
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
    flex: none;
    margin: 0;
    border-top: 1px solid color('border');
    background-color: color('danger-soft');
    padding: spacing('2xs') spacing('sm');
    color: color('danger');
    font-size: font-size('2xs');
  }
}
</style>
