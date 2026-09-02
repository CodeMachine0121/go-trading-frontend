<script setup lang="ts">
// 原子：全站唯一的程式碼編輯區。提供著色、自動縮排與常用片段補齊——
// 全部都只是**撰寫時的協助**：這裡不執行、也不驗證任何程式碼。
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

const { invalid = false, minHeight = '16rem' } = defineProps<{
  invalid?: boolean
  minHeight?: string
}>()

const modelValue = defineModel<string>({ required: true })

const editorHost = ref<HTMLElement | null>(null)
const editorView = shallowRef<import('@codemirror/view').EditorView | null>(null)

onMounted(async () => {
  const [{ EditorView, keymap }, { EditorState }, { indentWithTab, defaultKeymap, history, historyKeymap },
    { indentUnit, bracketMatching, indentOnInput }, { autocompletion, completionKeymap, snippetCompletion },
    { go, goLanguage }] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/state'),
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@codemirror/autocomplete'),
    import('@codemirror/lang-go'),
  ])

  if (editorHost.value === null) {
    return
  }

  const indicatorSnippets = SNIPPETS.map(
    snippet => snippetCompletion(snippet.template, { label: snippet.label, detail: snippet.detail }))

  const view = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: modelValue.value,
      extensions: [
        go(),
        goLanguage.data.of({ autocomplete: indicatorSnippets }),
        history(),
        indentOnInput(),
        bracketMatching(),
        autocompletion(),
        indentUnit.of('\t'),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            modelValue.value = update.state.doc.toString()
          }
        }),
      ],
    }),
  })

  editorView.value = view
})

// 外面換掉了內容（例如帶入範例）時，編輯器要跟著換；
// 使用者自己打字造成的變動已經一致，重設會白白弄丟游標位置，所以先比對。
watch(modelValue, (nextValue) => {
  const view = editorView.value
  if (view === null || view.state.doc.toString() === nextValue) {
    return
  }

  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextValue } })
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
  editorView.value = null
})
</script>

<template>
  <div
    ref="editorHost"
    class="app-code-editor"
    :class="{ 'app-code-editor--invalid': invalid }"
    :style="{ '--app-code-editor-min-height': minHeight }"
    data-testid="code-editor"
  />
</template>

<style scoped lang="scss">
.app-code-editor {
  transition: border-color duration('fast') ease;
  border: 1px solid color('border');
  border-radius: radius('sm');
  background-color: color('surface');
  min-height: var(--app-code-editor-min-height);
  overflow: hidden;
  font-size: font-size('sm');
  font-family: font-family('mono');

  &--invalid {
    border-color: color('danger');
  }

  // CodeMirror 的節點由它自己在執行期建立，構不到 scoped 屬性，只能以 :deep 覆寫。
  :deep(.cm-editor) {
    min-height: var(--app-code-editor-min-height);
  }

  :deep(.cm-editor.cm-focused) {
    outline: none;
  }

  :deep(.cm-scroller) {
    font-family: font-family('mono');
    line-height: line-height('relaxed');
  }

  :deep(.cm-gutters) {
    border-right: 1px solid color('border');
    background-color: color('surface-muted');
    color: color('text-muted');
  }
}
</style>
