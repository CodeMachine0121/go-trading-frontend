<script setup lang="ts">
// 分子：標籤 + 控制項 + 說明／錯誤訊息。
// 用 <label> 包住控制項形成隱含關聯，因此不需要在使用端自己配 id。
defineProps<{
  label: string
  hint?: string
  errorMessage?: string | null
}>()
</script>

<template>
  <label class="form-field">
    <span class="form-field__label">{{ label }}</span>
    <slot />
    <span
      v-if="errorMessage"
      class="form-field__error"
      data-testid="field-error"
    >{{ errorMessage }}</span>
    <span
      v-else-if="hint"
      class="form-field__hint"
    >{{ hint }}</span>
  </label>
</template>

<style scoped lang="scss">
.form-field {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  min-width: 0;

  // 欄位名與表頭是同一種東西：說出「底下那格是什麼」，然後閉嘴。
  &__label {
    @include dense-label;
  }

  &__hint {
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__error {
    color: color('danger');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
