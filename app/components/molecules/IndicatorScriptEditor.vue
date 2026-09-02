<script setup lang="ts">
import AppCodeEditor from '~/components/atoms/AppCodeEditor.vue'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'

// 分子：把唯讀的外框頭、可編輯的算式內容、唯讀的外框尾疊成一段看起來完整的算式。
// 使用者因此看得到自己寫的東西被放進哪裡，也對得上錯誤訊息裡的行號。
defineProps<{
  scriptTemplate: IndicatorScriptTemplateDto
  errorMessage?: string | null
}>()

const scriptBody = defineModel<string>({ required: true })
</script>

<template>
  <div class="indicator-script-editor">
    <div class="indicator-script-editor__labels">
      <span class="indicator-script-editor__label">指標算式</span>
      <span class="indicator-script-editor__hint">
        只要寫進入點裡面那幾行；上下的外框由畫面備妥，會跟著指標值種類變
      </span>
    </div>

    <pre
      class="indicator-script-editor__frame indicator-script-editor__frame--header"
      data-testid="script-frame-header"
    >{{ scriptTemplate.frameHeader }}</pre>

    <AppCodeEditor
      v-model="scriptBody"
      class="indicator-script-editor__body"
      :invalid="Boolean(errorMessage)"
    />

    <pre
      class="indicator-script-editor__frame indicator-script-editor__frame--footer"
      data-testid="script-frame-footer"
    >{{ scriptTemplate.frameFooter }}</pre>

    <span
      v-if="errorMessage"
      class="indicator-script-editor__error"
      data-testid="script-body-error"
    >{{ errorMessage }}</span>
  </div>
</template>

<style scoped lang="scss">
.indicator-script-editor {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');

  &__labels {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__label {
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__hint {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__frame {
    margin: 0;
    border: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('xs') spacing('sm');
    overflow-x: auto;
    color: color('text-muted');
    font-size: font-size('sm');
    font-family: font-family('mono');
    line-height: line-height('relaxed');

    &--header {
      border-bottom: none;
      border-radius: radius('sm') radius('sm') 0 0;
    }

    &--footer {
      border-top: none;
      border-radius: 0 0 radius('sm') radius('sm');
    }
  }

  &__body :deep(.app-code-editor) {
    border-radius: 0;
  }

  &__error {
    color: color('danger');
    font-size: font-size('xs');
  }
}
</style>
