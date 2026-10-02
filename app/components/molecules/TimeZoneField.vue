<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：挑一個顯示時區。
// 清單與目前選的是哪一個都由外面給——記不記得住、換了之後誰跟著變，都不是這裡的事。
defineProps<{ selectableTimeZones: TimeZoneDto[] }>()

const selectedIdentifier = defineModel<string>({ required: true })

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppSelect
    v-model="selectedIdentifier"
    class="time-zone-field"
    :aria-label="t('shell.timeZone.fieldLabel')"
    data-testid="time-zone-select"
  >
    <option
      v-for="timeZone in selectableTimeZones"
      :key="timeZone.identifier"
      :value="timeZone.identifier"
    >
      {{ localize(timeZone.label) }}
    </option>
  </AppSelect>
</template>

<style scoped lang="scss">
.time-zone-field {
  padding: spacing('2xs') spacing('xs');
  width: auto;
  font-size: font-size('xs');
  font-family: font-family('mono');
}
</style>
