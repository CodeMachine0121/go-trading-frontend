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
  transition: border-color duration('fast') ease;
  border: 1px solid color('border');
  border-radius: radius('sm');
  background-color: color('surface');
  padding: spacing('xs') spacing('sm');
  width: 100%;
  color: color('text');
  font-size: font-size('sm');

  @include focus-ring;

  &:disabled {
    background-color: color('surface-muted');
    color: color('text-muted');
  }

  &--invalid {
    border-color: color('danger');
  }
}
</style>
