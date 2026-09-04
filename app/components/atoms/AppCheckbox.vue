<script setup lang="ts">
// 原子：全站唯一的勾選框。一個是非只有兩個狀態，所以它不需要任何變體。
//
// 它不認識任何領域概念：勾了是 true，沒勾是 false，其餘一切由使用端決定。
const modelValue = defineModel<boolean>({ required: true })
</script>

<template>
  <input
    v-model="modelValue"
    type="checkbox"
    class="app-checkbox"
  >
</template>

<style scoped lang="scss">
.app-checkbox {
  flex: none;
  cursor: pointer;
  margin: 0;
  width: 1rem;
  height: 1rem;

  // 勾起來的顏色跟著主色走，而不是瀏覽器預設的那個藍。
  accent-color: color('primary');

  @include focus-ring;
}
</style>
