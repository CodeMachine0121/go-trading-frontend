<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import IndicatorScriptGuide from '~/components/molecules/IndicatorScriptGuide.vue'
import type { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'

/**
 * 分子：「算式裡可以用什麼」收在一個對話框裡。
 *
 * **它是打開來看的，不是攤在版面上的。** 這份說明是「想不起來翻一下」，
 * 不是「一直看著」；常駐在畫面上只會跟編輯區搶同一塊寬度，
 * 而使用者九成的時間並不在查它。說明的內容本身住在 IndicatorScriptGuide。
 */
defineProps<{
  open: boolean
  guide: ScriptInputGuideDto
  parameterAccesses: readonly ScriptParameterAccessDto[]
  signalReadings: readonly SignalReadingDto[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    title="算式裡可以用什麼"
    @close="emit('close')"
  >
    <IndicatorScriptGuide
      class="indicator-script-guide-dialog"
      :guide="guide"
      :parameter-accesses="parameterAccesses"
      :signal-readings="signalReadings"
    />

    <template #actions>
      <AppButton @click="emit('close')">
        知道了
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
// 一行說明讀到一半就要換行的寬度最好讀；對話框本身可以更寬，這份說明不跟著撐開。
.indicator-script-guide-dialog {
  max-width: 34rem;
}
</style>
