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
