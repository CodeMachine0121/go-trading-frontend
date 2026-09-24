<script setup lang="ts">
// 分子：標籤 + 控制項 + 說明／錯誤訊息。
// 用 <label> 包住控制項形成隱含關聯，因此不需要在使用端自己配 id。
const { grouped = false } = defineProps<{
  label: string
  hint?: string
  errorMessage?: string | null
  /**
   * 這一格裝的是**一組**控制項（例如並排的單選鈕），而不是單一個。
   *
   * 那時候不能用 <label> 包起來——每一顆單選鈕有自己的 <label>，而 <label> 不得巢狀；
   * 巢狀的那一版在螢幕上看不出差別，但點選時會把焦點送去錯的地方。
   * 所以改用 <fieldset> + <legend>，長相一模一樣。
   */
  grouped?: boolean
}>()
</script>

<template>
  <component
    :is="grouped ? 'fieldset' : 'label'"
    class="form-field"
  >
    <component
      :is="grouped ? 'legend' : 'span'"
      class="form-field__label"
    >
      {{ label }}
    </component>
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
  </component>
</template>

<style scoped lang="scss">
.form-field {
  display: flex;
  flex-direction: column;

  // fieldset 自備一圈邊框與內距，而這一格與旁邊那幾格必須看起來一模一樣。
  margin: 0;
  border: 0;
  padding: 0;
  gap: spacing('3xs');
  min-width: 0;

  // legend 預設會浮在邊框上並自帶內距，拿掉之後才與 span 版對得起來。
  &__label:is(legend) {
    padding: 0;
  }

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
