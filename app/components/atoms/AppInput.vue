<script setup lang="ts">
// 原子：全站唯一的文字輸入框。型別（text / datetime-local…）與其餘原生屬性
// 一律走 attribute fallthrough，由使用端決定。
const { invalid = false } = defineProps<{ invalid?: boolean }>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <input
    v-model="modelValue"
    class="app-input"
    :class="{ 'app-input--invalid': invalid }"
    :aria-invalid="invalid"
  >
</template>

<style scoped lang="scss">
.app-input {
  transition: border-color duration('fast') ease, background-color duration('fast') ease;
  border: 1px solid color('border-strong');
  border-radius: radius('sm');

  // 輸入的東西是凹進面板裡的，比面板底色更暗——
  // 深色介面上「可以打字的地方」就是靠這個暗度被認出來的。
  background-color: color('background');
  padding: spacing('xs');
  width: 100%;
  color: color('text-strong');
  font-size: font-size('sm');

  @include numeric;
  @include focus-ring;

  &:hover:not(:disabled) {
    border-color: color('text-faint');
  }

  &:disabled {
    border-color: color('border');
    background-color: color('surface-muted');
    color: color('text-faint');
  }

  &--invalid {
    border-color: color('danger');
  }
}
</style>
