<script setup lang="ts">
// 原子：全站唯一的下拉選單。選項以 slot 傳入（一律是原生的 <option>），
// 原子因此不必認識任何領域資料，其餘原生屬性走 attribute fallthrough。
const { invalid = false } = defineProps<{ invalid?: boolean }>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <select
    v-model="modelValue"
    class="app-select"
    :class="{ 'app-select--invalid': invalid }"
    :aria-invalid="invalid"
  >
    <slot />
  </select>
</template>

<style scoped lang="scss">
.app-select {
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
