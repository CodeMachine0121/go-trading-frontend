<script setup lang="ts">
// 原子：多行輸入。等寬字體讓貼進來的程式碼對得齊，其餘一律由使用端決定。
const { invalid = false, rows = 12 } = defineProps<{ invalid?: boolean, rows?: number }>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <textarea
    v-model="modelValue"
    class="app-textarea"
    :class="{ 'app-textarea--invalid': invalid }"
    :rows="rows"
    :aria-invalid="invalid"
    spellcheck="false"
  />
</template>

<style scoped lang="scss">
.app-textarea {
  transition: border-color duration('fast') ease;
  border: 1px solid color('border');
  border-radius: radius('sm');
  background-color: color('surface');
  padding: spacing('xs') spacing('sm');
  width: 100%;
  resize: vertical;
  color: color('text');
  font-size: font-size('sm');
  font-family: font-family('mono');

  @include focus-ring;

  &--invalid {
    border-color: color('danger');
  }
}
</style>
