<script setup lang="ts">
// 原子：全站唯一的程式碼區塊。行號、著色、自動縮排與常用片段補齊——
// 全部都只是**撰寫時的協助**：這裡不執行、也不驗證任何程式碼。
//
// 唯讀與可編輯是同一個元件的兩種樣子（`readonly`），不是兩個元件：
// 兩者要並排成同一份檔案，就必須共用同一套著色、同一條行號欄與同一組字體行高，
// 拆成兩個元件只會讓它們慢慢對不齊。
//
// 編輯器在掛載後才動態載入，理由有兩個：它碰得到 document（伺服器端沒有），
// 以及不讓它的體積擋在畫面第一次顯示的路上。載入完成前先呈現一個空的容器。

// 常用片段：走訪每一根 K 線、收集收盤價、加總平均、找極值。
// 都是「怎麼寫程式」的協助，不是任何一段算式的外框——外框由領域產生，這裡一個字也不碰。
const SNIPPETS = [
  {
    label: 'forcandle',
    detail: '走訪每一根 K 線',
    template: 'for _, candle := range data {\n\t${}\n}',
  },
  {
    label: 'closes',
    detail: '收集每一根的收盤價',
    template: 'closePrices := []float64{}\n'
      + 'for _, candle := range data {\n\tclosePrices = append(closePrices, candle.Close)\n}\n${}',
  },
  {
    label: 'average',
    detail: '加總後取平均',
    template: 'sum := 0.0\nfor _, candle := range data {\n\tsum += candle.${Close}\n}\n'
      + 'average := sum / float64(len(data))\n${}',
  },
  {
    label: 'extremes',
    detail: '找出最高與最低',
    template: 'highest := data[0].High\nlowest := data[0].Low\n'
      + 'for _, candle := range data {\n\thighest = math.Max(highest, candle.High)\n'
      + '\tlowest = math.Min(lowest, candle.Low)\n}\n${}',
  },
]

const { invalid = false, readonly = false, indented = false, startLineNumber = 1 } = defineProps<{
  invalid?: boolean
  /** 唯讀的一段程式碼：一樣著色、一樣有行號，但改不動也不吃鍵盤。 */
  readonly?: boolean
  /** 內容整段往內縮一層，用在住在某個區塊裡面的那幾行。 */
  indented?: boolean
  /** 第一行要標成幾號。內容接在別段程式碼後面時，行號從那裡接續下去。 */
  startLineNumber?: number
}>()

const modelValue = defineModel<string>({ required: true })

const editorHost = ref<HTMLElement | null>(null)
const editorView = shallowRef<import('@codemirror/view').EditorView | null>(null)
// 起始行號會變（它前面那段程式碼變長了），而擴充是建立編輯器時就固定下來的東西，
// 所以行號這一塊要能單獨換掉——這就是 compartment 的用途。
const reconfigureLineNumbers = shallowRef<((firstLineNumber: number) => void) | null>(null)

onMounted(async () => {
  const [{ EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection },
    { EditorState, Compartment }, { indentWithTab, defaultKeymap, history, historyKeymap },
    { indentUnit, bracketMatching, indentOnInput }, { autocompletion, completionKeymap, snippetCompletion },
    { go, goLanguage }, { oneDark }] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/state'),
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@codemirror/autocomplete'),
    import('@codemirror/lang-go'),
    import('@codemirror/theme-one-dark'),
  ])

  if (editorHost.value === null) {
    return
  }

  const indicatorSnippets = SNIPPETS.map(
    snippet => snippetCompletion(snippet.template, { label: snippet.label, detail: snippet.detail }))

  // 行號從外面指定的號碼接續，這樣後端說「第幾行出錯」時，畫面上就是那一行。
  const lineNumbersFrom = (firstLineNumber: number) => lineNumbers({
    formatNumber: lineIndex => String(lineIndex + firstLineNumber - 1),
  })
  const lineNumbering = new Compartment()

  // 唯讀那一份不必帶編輯用的行李——歷史、補齊、快捷鍵對它都沒有意義。
  const writingExtensions = readonly
    ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
    : [
        goLanguage.data.of({ autocomplete: indicatorSnippets }),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        autocompletion(),
        indentUnit.of('\t'),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
      ]

  const view = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: modelValue.value,
      extensions: [
        go(),
        oneDark,
        lineNumbering.of(lineNumbersFrom(startLineNumber)),
        EditorView.lineWrapping,
        ...writingExtensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            modelValue.value = update.state.doc.toString()
          }
        }),
      ],
    }),
  })

  editorView.value = view
  reconfigureLineNumbers.value = (firstLineNumber: number) => view.dispatch({
    effects: lineNumbering.reconfigure(lineNumbersFrom(firstLineNumber)),
  })
})

// 前面那段程式碼變長，這一段的起始行號就得跟著往下走，否則行號會開始說謊。
watch(() => startLineNumber, (nextStartLineNumber) => {
  reconfigureLineNumbers.value?.(nextStartLineNumber)
})

// 外面換掉了內容（例如帶入範例、或換了種類）時，編輯器要跟著換；
// 使用者自己打字造成的變動已經一致，重設會白白弄丟游標位置，所以先比對。
watch(modelValue, (nextValue) => {
  const view = editorView.value
  if (view === null || view.state.doc.toString() === nextValue) {
    return
  }

  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextValue } })
})

/**
 * 點在區塊裡任何一個沒有字的地方——最後一行下方的空白、行號欄旁邊——都要能開始打字。
 * 編輯器自己只認得它畫出來的那幾行，所以這裡把落在外面的點擊接住，
 * 一律當成「游標放到最後」。少了這一段，使用者會點在一片看起來可以打字的地方卻沒有反應。
 */
function focusAtEnd() {
  const view = editorView.value
  if (readonly || view === null) {
    return
  }

  view.focus()
  view.dispatch({ selection: { anchor: view.state.doc.length } })
}

function focusOnEmptySpace(event: MouseEvent) {
  const view = editorView.value
  if (readonly || view === null || view.dom.contains(event.target as Node)) {
    return
  }

  event.preventDefault()
  focusAtEnd()
}

// 這塊程式碼周圍的空白由外面決定要留多大，點在那片空白上一樣要能接著打字，
// 所以把「跳到最後」開放出去讓外面呼叫。
defineExpose({ focusAtEnd })

onBeforeUnmount(() => {
  editorView.value?.destroy()
  editorView.value = null
})
</script>

<template>
  <div
    class="app-code-editor"
    :class="{
      'app-code-editor--invalid': invalid,
      'app-code-editor--readonly': readonly,
      'app-code-editor--indented': indented,
    }"
    data-testid="code-editor"
    @mousedown="focusOnEmptySpace"
  >
    <div
      ref="editorHost"
      class="app-code-editor__host"
    />
  </div>
</template>

<style scoped lang="scss">
.app-code-editor {
  display: flex;
  background-color: color('surface-raised');

  &__host {
    flex: 1;
    min-width: 0;
  }

  &--invalid :deep(.cm-gutters) {
    border-right-color: color('danger');
  }

  &--readonly :deep(.cm-content) {
    cursor: default;
  }

  // 住在某個區塊裡面的那幾行整段往內縮一層——
  // 少了這一層，內容會和外框切齊，看起來不像在函式內。
  &--indented :deep(.cm-content) {
    padding-left: $code-indent-width;
  }

  :deep(.cm-editor) {
    height: 100%;
    background-color: color('surface-raised');

    @include code-typography;
  }

  // 內容區撐滿整塊，點在最後一行下方時編輯器自己就接得到，游標會落在最近的位置
  :deep(.cm-content) {
    min-height: 100%;
  }

  :deep(.cm-scroller) {
    @include code-typography;
  }

  :deep(.cm-gutters) {
    border-right: 1px solid color('border');
    background-color: color('surface-raised');
    color: color('text-muted');
  }

  :deep(.cm-lineNumbers .cm-gutterElement) {
    min-width: $code-gutter-width;
    padding: 0 spacing('sm') 0 0;
  }

  :deep(.cm-activeLineGutter),
  :deep(.cm-activeLine) {
    background-color: color('surface-muted');
  }

  // 游標是一個中等粗細的白色方塊，不是一條細線——
  // 在滿是文字的深色區塊裡，細線游標很容易跟字混在一起找不到。
  :deep(.cm-cursor),
  :deep(.cm-cursor-primary) {
    border-left: none;
    background-color: color('caret');
    width: 0.5ch;
  }

  :deep(.cm-editor.cm-focused) {
    outline: none;
  }
}
</style>
