<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import TradingStrategyConditionMat from '~/components/organisms/TradingStrategyConditionMat.vue'
import TradingStrategyPieceSettingsDialog from '~/components/organisms/TradingStrategyPieceSettingsDialog.vue'
import TradingStrategyPieceShelf from '~/components/organisms/TradingStrategyPieceShelf.vue'
import type { ConditionBoardDto } from '~/domain/models/dto/condition-board-dto'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'
import { usePieceDrag } from '~/composables/use-piece-drag'
import { usePieceDragGestures } from '~/composables/use-piece-drag-gestures'

// 有機體：一張工作檯——左邊零件架，右邊兩張墊子。
//
// 它自己**不畫任何東西**，只負責一件事：**手上拿著的那一塊要去哪裡**。
// 那件事沒辦法交給架子或墊子其中之一，因為一次拖曳的起點與落點常常不在同一塊裡——
// 從架子拖到墊子、從一張墊子拖到另一張，都是。所以它住在唯一同時看得到三者的這一層。
//
// 拖曳本身不在這裡：手上拿著什麼、放下去算哪一種搬動住在 usePieceDrag，
// 而怎麼從指標事件讀出那兩件事住在 usePieceDragGestures。這一層只把兩者接上，
// 並把結果往上報。
const { sources, buyBoard, sellBoard, parameterNamesByStrategyScriptId, editable }
  = defineProps<{
    sources: readonly TradingStrategySignalSourceDto[]
    buyBoard: ConditionBoardDto
    sellBoard: ConditionBoardDto
    strategyScriptOptions: readonly { value: number, label: string }[]
    intervalOptions: readonly { value: string, label: string }[]
    parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
    unusableStrategyScripts: Readonly<Record<number, string>>
    canAdd: boolean
    signalSourceLimit: number
    shortage: 'noStrategyScripts' | 'noSignalStrategyScripts' | null
    /**
     * 這張工作檯現在編不編得動。
     *
     * 編不動的時候**內容一個字都不少**——拼好的條件仍然看得到，因為
     * 「在手機上查一眼我派出去的策略長什麼樣」是真實的用途；
     * 「在手機上組一條策略」不是。窄螢幕減的是可編輯性，不是可讀性。
     */
    editable: boolean
  }>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategyScript: [index: number, strategyScriptId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
  toggleSignal: [side: ConditionSideVo, sourceLabel: string, signal: string]
  changeOperator: [side: ConditionSideVo, operator: ConditionOperatorVo]
  changeBundleOperator: [side: ConditionSideVo, itemKey: string, operator: ConditionOperatorVo]
  place: [side: ConditionSideVo, sourceLabel: string, position: number]
  takeOff: [side: ConditionSideVo, sourceLabel: string]
  bundleOnto: [side: ConditionSideVo, sourceLabel: string, targetLabel: string]
  unbundle: [side: ConditionSideVo, sourceLabel: string]
}>()

const MATS = [
  { key: 'buy' as ConditionSideVo, heading: '買入', board: () => buyBoard },
  { key: 'sell' as ConditionSideVo, heading: '賣出', board: () => sellBoard },
]

// 三種搬動往上報。usePieceDrag 只認得這三件事，一句規則都不知道——
// 墊子上那幾格因此長什麼樣子，仍然只有表單那一層說得出來。
const pieceDrag = usePieceDrag(
  (side, sourceLabel, position) => emit('place', side, sourceLabel, position),
  (side, sourceLabel) => emit('takeOff', side, sourceLabel),
  (side, sourceLabel, targetLabel) => emit('bundleOnto', side, sourceLabel, targetLabel),
)

const { benchElement } = usePieceDragGestures(pieceDrag, () => editable)

/** 正在調設定的那一塊零件，用它在架子上的位置記。 */
const tuningIndex = ref<number | null>(null)

const tuningPiece = computed(
  () => (tuningIndex.value === null ? null : sources[tuningIndex.value] ?? null))

const tuningParameterNames = computed(
  () => (tuningPiece.value === null
    ? []
    : parameterNamesByStrategyScriptId[tuningPiece.value.strategyScriptId] ?? []))

const placedLabels = computed(
  () => [...buyBoard.placedLabels, ...sellBoard.placedLabels])
</script>

<template>
  <div class="canvas">
    <AppAlert
      v-if="!editable"
      tone="info"
      data-testid="read-only-notice"
    >
      這個螢幕的寬度排不開一張工作檯，所以這裡只能看不能改。
      條件長什麼樣仍然看得到；要修改請換一個寬一點的螢幕。
    </AppAlert>

    <AppAlert
      v-for="mat in MATS.filter(candidate => !candidate.board().representable)"
      :key="`unrepresentable-${mat.key}`"
      tone="warning"
      :data-testid="`board-unrepresentable-${mat.key}`"
    >
      「{{ mat.heading }}」存的是一個且與或交錯的條件，這張工作檯排不出它。
      在這裡重排一次會換掉原本那一個。
    </AppAlert>

    <!-- 選擇器只在這個元素底下生效，所以同一頁上的別的東西不會被當成零件。 -->
    <div
      ref="benchElement"
      class="canvas__bench"
    >
      <TradingStrategyPieceShelf
        :editable="editable"
        :sources="sources"
        :placed-labels="placedLabels"
        :interval-options="intervalOptions"
        :can-add="canAdd"
        :signal-source-limit="signalSourceLimit"
        :shortage="shortage"
        @add="emit('add')"
        @remove="index => emit('remove', index)"
        @tune="index => tuningIndex = index"
      />

      <TradingStrategyConditionMat
        v-for="mat in MATS"
        :key="mat.key"
        :editable="editable"
        :board="mat.board()"
        :heading="mat.heading"
        :side="mat.key"
        :hovering-at="pieceDrag.hoveringOn(mat.key)"
        :carrying="pieceDrag.carrying.value"
        @toggle-signal="(sourceLabel, signal) => emit('toggleSignal', mat.key, sourceLabel, signal)"
        @take-off="sourceLabel => emit('takeOff', mat.key, sourceLabel)"
        @unbundle="sourceLabel => emit('unbundle', mat.key, sourceLabel)"
        @change-operator="operator => emit('changeOperator', mat.key, operator)"
        @change-bundle-operator="(itemKey, operator) =>
          emit('changeBundleOperator', mat.key, itemKey, operator)"
      />
    </div>

    <TradingStrategyPieceSettingsDialog
      :piece="tuningPiece"
      :strategy-script-options="strategyScriptOptions"
      :unusable-strategy-scripts="unusableStrategyScripts"
      :interval-options="intervalOptions"
      :parameter-names="tuningParameterNames"
      @close="tuningIndex = null"
      @change-label="label => emit('changeLabel', tuningIndex!, label)"
      @change-strategy-script="strategyScriptId => emit('changeStrategyScript', tuningIndex!, strategyScriptId)"
      @change-interval="interval => emit('changeInterval', tuningIndex!, interval)"
      @change-parameter-value="(name, value) =>
        emit('changeParameterValue', tuningIndex!, name, value)"
    />
  </div>
</template>

<style scoped lang="scss">
.canvas {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__bench {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    // 工作檯比頁面暗一階，墊子與零件才浮得起來。
    border-radius: radius('lg');
    background-color: color('background');
    padding: spacing('sm');

    @include respond-to('lg') {
      // 架子窄、兩張墊子一樣寬——兩邊同時成立時這台機器人什麼都不會說，
      // 而那件事只有並排時才看得出來。
      grid-template-columns: 15rem repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
