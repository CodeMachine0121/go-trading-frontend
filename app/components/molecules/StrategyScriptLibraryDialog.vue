<script setup lang="ts">
import AppModal from '~/components/atoms/AppModal.vue'
import StrategyScriptLibraryList from '~/components/molecules/StrategyScriptLibraryList.vue'
import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'

// 分子：窄螢幕上的策略腳本清單——同一份清單，收在一張蓋上來的紙裡。
//
// 寬螢幕上那一份是工作台左邊常駐的一欄；窄螢幕放不下第三欄，
// 所以它在一顆鍵後面。它是覆蓋在畫面上的，不是另一頁——換頁的話，
// 編輯器裡寫到一半的內容要嘛丟失、要嘛得額外做一套狀態保存。
const {
  open,
  strategyScripts,
  adoptedStrategyScripts,
  errorMessage = null,
  activeStrategyScriptId = null,
  activeAdoptedStrategyScriptId = null,
} = defineProps<{
  open: boolean
  strategyScripts: StrategyScriptDto[]
  adoptedStrategyScripts: PublishedStrategyScriptDto[]
  errorMessage?: string | null
  activeStrategyScriptId?: number | null
  activeAdoptedStrategyScriptId?: number | null
}>()

const emit = defineEmits<{
  load: [id: number]
  remove: [id: number]
  abandon: [id: number]
  close: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="策略腳本清單"
    @close="emit('close')"
  >
    <StrategyScriptLibraryList
      class="strategy-script-library-dialog"
      :strategy-scripts="strategyScripts"
      :adopted-strategy-scripts="adoptedStrategyScripts"
      :error-message="errorMessage"
      :active-strategy-script-id="activeStrategyScriptId"
      :active-adopted-strategy-script-id="activeAdoptedStrategyScriptId"
      @load="id => emit('load', id)"
      @remove="id => emit('remove', id)"
      @abandon="id => emit('abandon', id)"
    />
  </AppModal>
</template>

<style scoped lang="scss">
// 對話框自己的內距之內再畫一圈外框：清單一列一列貼齊這一圈，不必各自帶框。
.strategy-script-library-dialog {
  border: 1px solid color('border');
  border-radius: radius('md');
  overflow: hidden;
}
</style>
