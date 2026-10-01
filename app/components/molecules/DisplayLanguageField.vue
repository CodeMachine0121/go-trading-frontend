<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

// 分子：挑一個顯示語言。
// 清單與目前選的是哪一個都由外面給——記不記得住、換了之後誰跟著變，都不是這裡的事。
defineProps<{ selectableLanguages: DisplayLanguageDto[] }>()

const selectedCode = defineModel<string>({ required: true })

const { t } = useI18n()
</script>

<template>
  <AppSelect
    v-model="selectedCode"
    class="display-language-field"
    :aria-label="t('shell.displayLanguage.fieldLabel')"
    data-testid="display-language-select"
  >
    <option
      v-for="language in selectableLanguages"
      :key="language.code"
      :value="language.code"
      :lang="language.code"
    >
      {{ language.nativeName }}
    </option>
  </AppSelect>
</template>

<style scoped lang="scss">
.display-language-field {
  padding: spacing('2xs') spacing('xs');
  width: auto;
  font-size: font-size('xs');
}
</style>
