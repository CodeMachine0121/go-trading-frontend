<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import StrategyBotConditionMat from '~/components/organisms/StrategyBotConditionMat.vue'
import StrategyBotPieceSettingsDialog from '~/components/organisms/StrategyBotPieceSettingsDialog.vue'
import StrategyBotPieceShelf from '~/components/organisms/StrategyBotPieceShelf.vue'
import type { ConditionBoardDto } from '~/domain/models/dto/condition-board-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

// 有機體：一張工作檯——左邊零件架，右邊兩張墊子。
//
// 它自己**不畫任何東西**，只負責一件事：**手上拿著的那一塊要去哪裡**。
// 那件事沒辦法交給架子或墊子其中之一，因為一次拖曳的起點與落點常常不在同一塊裡——
// 從架子拖到墊子、從一張墊子拖到另一張，都是。所以它住在唯一同時看得到三者的這一層。
const { sources, buyBoard, sellBoard, parameterNamesByStrategyScriptId } = defineProps<{
  sources: readonly StrategyBotSignalSourceDto[]
  buyBoard: ConditionBoardDto
  sellBoard: ConditionBoardDto
  strategyScriptOptions: readonly { value: number, label: string }[]
  intervalOptions: readonly { value: string, label: string }[]
  parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
  canAdd: boolean
  signalSourceLimit: number
  hasNoStrategyScripts: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategyScript: [index: number, strategyScriptId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
  toggleSignal: [side: Side, sourceLabel: string, signal: string]
  changeOperator: [side: Side, operator: ConditionOperatorVo]
  changeBundleOperator: [side: Side, itemKey: string, operator: ConditionOperatorVo]
  place: [side: Side, sourceLabel: string, position: number]
  takeOff: [side: Side, sourceLabel: string]
  bundleOnto: [side: Side, sourceLabel: string, targetLabel: string]
  unbundle: [side: Side, sourceLabel: string]
}>()

type Side = 'buy' | 'sell'

const MATS = [
  { key: 'buy' as Side, heading: '買入', board: () => buyBoard },
  { key: 'sell' as Side, heading: '賣出', board: () => sellBoard },
]

/**
 * 手上拿著的那一塊，以及它是從哪裡拿起來的。
 *
 * 從哪裡拿起來要記著，因為**同一個放下的動作有兩種意思**：從架子上拿的放到墊子上
 * 是「擺一塊」，從墊子上拿的放到另一張墊子是「搬過去」，而放回架子是「拿走」。
 * 只記「拿著什麼」的話，放下的那一刻答不出該做哪一件。
 */
const holding = ref<{ sourceLabel: string, from: Side | 'shelf' } | null>(null)

/** 現在游標懸在哪一張墊子的哪一格上——那條插入線就畫在這裡。 */
const hoveringAt = ref<{ side: Side, position: number } | null>(null)

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

function pickUp(event: DragEvent, sourceLabel: string, from: Side | 'shelf') {
  // 瀏覽器的拖放通道要有東西才認得這是一次拖曳，但沒有人會去讀它——
  // 拿著什麼由這裡記著。
  event.dataTransfer?.setData('text/plain', sourceLabel)
  holding.value = { sourceLabel, from }
}

function letGo() {
  holding.value = null
  hoveringAt.value = null
}

function hoverOver(side: Side, position: number) {
  if (holding.value !== null) {
    hoveringAt.value = { side, position }
  }
}

function hoveringOn(side: Side): number | null {
  return hoveringAt.value?.side === side ? hoveringAt.value.position : null
}

/** 放到某張墊子的第幾格。 */
function dropOnMat(side: Side, position: number) {
  const carried = holding.value
  letGo()
  if (carried === null) {
    return
  }

  if (carried.from !== 'shelf' && carried.from !== side) {
    emit('takeOff', carried.from, carried.sourceLabel)
  }
  emit('place', side, carried.sourceLabel, position)
}

/**
 * 把一塊疊到另一塊上＝把它們扣成一組。
 *
 * 這是墊子上唯一造得出巢狀的動作，也是「A 而且（B 或 C）」唯一的寫法。
 * 從別張墊子拖過來的要先從那邊收走——不然同一塊會同時在兩張墊子上。
 */
function dropOntoPiece(side: Side, targetLabel: string) {
  const carried = holding.value
  letGo()
  if (carried === null || carried.sourceLabel === targetLabel) {
    return
  }

  if (carried.from !== 'shelf' && carried.from !== side) {
    emit('takeOff', carried.from, carried.sourceLabel)
    emit('place', side, carried.sourceLabel, 0)
  }
  emit('bundleOnto', side, carried.sourceLabel, targetLabel)
}

/** 放回架子上＝從它原本那張墊子上拿走。從架子拿起來又放回架子是什麼都沒發生。 */
function dropOnShelf() {
  const carried = holding.value
  letGo()
  if (carried !== null && carried.from !== 'shelf') {
    emit('takeOff', carried.from, carried.sourceLabel)
  }
}
</script>

<template>
  <div class="canvas">
    <AppAlert
      v-for="mat in MATS.filter(candidate => !candidate.board().representable)"
      :key="`unrepresentable-${mat.key}`"
      tone="warning"
      :data-testid="`board-unrepresentable-${mat.key}`"
    >
      「{{ mat.heading }}」存的是一個且與或交錯的條件，這張工作檯排不出它。
      在這裡重排一次會換掉原本那一個。
    </AppAlert>

    <div class="canvas__bench">
      <StrategyBotPieceShelf
        :sources="sources"
        :placed-labels="placedLabels"
        :interval-options="intervalOptions"
        :can-add="canAdd"
        :signal-source-limit="signalSourceLimit"
        :has-no-strategy-scripts="hasNoStrategyScripts"
        @add="emit('add')"
        @remove="index => emit('remove', index)"
        @tune="index => tuningIndex = index"
        @pick-up="(event, sourceLabel) => pickUp(event, sourceLabel, 'shelf')"
        @let-go="letGo"
        @drop-back="dropOnShelf"
      />

      <StrategyBotConditionMat
        v-for="mat in MATS"
        :key="mat.key"
        :board="mat.board()"
        :heading="mat.heading"
        :tone="mat.key"
        :side="mat.key"
        :hovering-at="hoveringOn(mat.key)"
        @hover-over="position => hoverOver(mat.key, position)"
        @drop-at="position => dropOnMat(mat.key, position)"
        @drop-onto-piece="targetLabel => dropOntoPiece(mat.key, targetLabel)"
        @pick-up-piece="(event, sourceLabel) => pickUp(event, sourceLabel, mat.key)"
        @let-go="letGo"
        @toggle-signal="(sourceLabel, signal) => emit('toggleSignal', mat.key, sourceLabel, signal)"
        @take-off="sourceLabel => emit('takeOff', mat.key, sourceLabel)"
        @unbundle="sourceLabel => emit('unbundle', mat.key, sourceLabel)"
        @change-operator="operator => emit('changeOperator', mat.key, operator)"
        @change-bundle-operator="(itemKey, operator) =>
          emit('changeBundleOperator', mat.key, itemKey, operator)"
      />
    </div>

    <StrategyBotPieceSettingsDialog
      :piece="tuningPiece"
      :strategy-script-options="strategyScriptOptions"
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
