<script setup lang="ts">
// 原子：全站唯一的多行輸入框。
//
// 它與 AppInput 是兩個元件，理由與 AppButton／AppLink 相同：**語意與元素不同**，
// 一個是 `<input>`、一個是 `<textarea>`。不是因為長得不一樣。
//
// 它自己長高，因為打一個有前提的問題常常要兩三行，而固定一行高的框會讓人
// 在一條縫裡打完整段話、看不到自己寫了什麼。到上限之後改成內部捲動——
// 再高下去就開始擠壓它上面的內容了。
//
// 它不認識任何領域概念：幾行、有沒有問題，都由使用端決定。
const { invalid = false, maxRows = 6 } = defineProps<{
  invalid?: boolean
  /** 最多長到幾行，超過就在裡面捲。 */
  maxRows?: number
}>()

const modelValue = defineModel<string>({ required: true })

const control = useTemplateRef<HTMLTextAreaElement>('control')

/**
 * 依內容調整高度。
 *
 * 先歸零再讀 `scrollHeight`——不歸零的話讀到的是「目前多高」而不是「內容要多高」，
 * 於是框只長不縮：刪掉幾行之後留下一大片空白。
 */
function resize(): void {
  const element = control.value
  if (element === null) {
    return
  }

  element.style.height = 'auto'
  const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
  const verticalPadding = element.offsetHeight - element.clientHeight
  const maxHeight = lineHeight * maxRows + verticalPadding

  element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`
  element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

/** 由外面塞進內容時（例如被拒絕後那一句回到輸入框）也要跟著調整。 */
watch(modelValue, () => {
  void nextTick(resize)
})

onMounted(resize)

defineExpose({
  focus: (): void => control.value?.focus(),
})
</script>

<template>
  <textarea
    ref="control"
    v-model="modelValue"
    class="app-textarea"
    :class="{ 'app-textarea--invalid': invalid }"
    :aria-invalid="invalid"
    rows="1"
    @input="resize"
  />
</template>

<style scoped lang="scss">
.app-textarea {
  transition: border-color duration('fast') ease, background-color duration('fast') ease;
  border: 1px solid color('border-strong');
  border-radius: radius('sm');

  // 與 AppInput 同一個暗度：深色介面上「可以打字的地方」就是靠這個暗度被認出來的。
  background-color: color('background');
  padding: spacing('xs');
  width: 100%;
  resize: none;
  overflow-y: hidden;
  color: color('text-strong');
  font-size: font-size('sm');
  line-height: line-height('relaxed');
  font-family: inherit;

  @include focus-ring;

  &:hover:not(:disabled) {
    border-color: color('text-faint');
  }

  &:disabled {
    border-color: color('border');
    color: color('disabled');
    cursor: not-allowed;
  }

  &--invalid {
    border-color: color('danger');
  }

  &::placeholder {
    color: color('text-faint');
  }
}
</style>
