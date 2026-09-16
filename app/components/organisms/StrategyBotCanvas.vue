<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ConditionMatrixDto } from '~/domain/models/dto/condition-matrix-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：一張工作檯——左邊是零件架，右邊兩張墊子。
//
// 這個畫面的前幾版都輸在同一件事：它們是**表單**。下拉選單、核取方塊、表格，
// 排法換過四次，每一次得到的評語都是「區塊換位置而已」。那是對的，
// 因為那幾版真正在做的事都是「填欄位」。
//
// 這一版做的是**搬東西**：一塊零件拿在手上，放到某張墊子上，
// 不要了就拖回架子。墊子上的順序是使用者自己排的，而且會被存下來——
// 樹的子節點本來就有順序，所以那不是一個假的自由度。
const {
  sources, buyMatrix, sellMatrix, strategyOptions, intervalOptions,
  parameterNamesByStrategyId, canAdd, signalSourceLimit, hasNoStrategies,
} = defineProps<{
  sources: readonly StrategyBotSignalSourceDto[]
  buyMatrix: ConditionMatrixDto
  sellMatrix: ConditionMatrixDto
  strategyOptions: readonly { value: number, label: string }[]
  intervalOptions: readonly { value: string, label: string }[]
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  canAdd: boolean
  signalSourceLimit: number
  hasNoStrategies: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategy: [index: number, strategyId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
  toggleSignal: [side: Side, sourceLabel: string, signal: string]
  changeOperator: [side: Side, operator: ConditionOperatorVo]
  place: [side: Side, sourceLabel: string, position: number]
  takeOff: [side: Side, sourceLabel: string]
  bundleOnto: [side: Side, sourceLabel: string, targetLabel: string]
  unbundle: [side: Side, sourceLabel: string]
  changeBundleOperator: [side: Side, itemKey: string, operator: ConditionOperatorVo]
}>()

type Side = 'buy' | 'sell'

const SIGNAL_CHIPS = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
] as const

const MATS = [
  { key: 'buy' as Side, heading: '買入', matrix: () => buyMatrix },
  { key: 'sell' as Side, heading: '賣出', matrix: () => sellMatrix },
]

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/**
 * 手上拿著的那一塊，以及它是從哪裡拿起來的。
 *
 * 從哪裡拿起來要記著，因為**同一個放下的動作有兩種意思**：從架子上拿的放到墊子上
 * 是「擺一塊」，從墊子上拿的放到另一張墊子是「搬過去」，而放回架子是「拿走」。
 * 只記「拿著什麼」的話，放下的那一刻答不出該做哪一件。
 */
const holding = ref<{ sourceLabel: string, from: Side | 'shelf' } | null>(null)

/** 現在游標懸在哪一格上——那條插入線就畫在這裡。 */
const hoveringAt = ref<{ side: Side, position: number } | null>(null)

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

/** 放回架子上＝從它原本那張墊子上拿走。從架子拿起來又放回架子是什麼都沒發生。 */
function dropOnShelf() {
  const carried = holding.value
  letGo()
  if (carried !== null && carried.from !== 'shelf') {
    emit('takeOff', carried.from, carried.sourceLabel)
  }
}

function isOnAnyMat(sourceLabel: string): boolean {
  return MATS.some(mat => mat.matrix().placedLabels.includes(sourceLabel))
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

/**
 * 一塊零件收著的那幾個信號，翻成人話。
 *
 * **一支策略同一時間只吐一個信號**，所以三個開關之間是「其中之一」，不是「而且」——
 * 而畫面上三塊並排的開關看起來就像「而且」。那句誤會很難自己發現：
 * 使用者會盯著一塊寫著「賣出、持有」的零件，想不通一支策略怎麼可能同時是兩者。
 *
 * 只在選了兩個以上時才說，因為只選一個時沒有任何東西需要解釋。
 */
function inPlainWords(accepted: readonly string[]): string {
  if (accepted.length < 2) {
    return ''
  }

  if (accepted.length === SIGNAL_CHIPS.length) {
    return '也就是「不管它說什麼都算」'
  }

  const excluded = SIGNAL_CHIPS.find(chip => !accepted.includes(chip.value))

  return `也就是「不是${excluded?.label ?? ''}」`
}

function onBundleOperatorChange(side: Side, itemKey: string, chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeBundleOperator', side, itemKey, operator)
  }
}

function onOperatorChange(side: Side, chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeOperator', side, operator)
  }
}

/**
 * 正在調設定的那一塊零件，用它在架子上的位置記。
 *
 * 設定走**彈窗**而不是原地展開：展開會把架子撐長，而架子旁邊就是兩張墊子——
 * 一塊零件的參數有五個的時候，墊子會被推到看不見的地方。
 * 而調參數是偶爾才做一次的事，不該讓它佔著工作區的高度。
 *
 * 記位置而不是記代號，是因為**代號正是這個彈窗裡改得動的東西之一**：
 * 記代號的話，使用者一改名，彈窗就會認不得自己開的是誰而自己關掉。
 */
const tuningIndex = ref<number | null>(null)

const tuningSource = computed(
  () => (tuningIndex.value === null ? null : sources[tuningIndex.value] ?? null))

function parameterNamesOf(strategyId: number): readonly string[] {
  return parameterNamesByStrategyId[strategyId] ?? []
}

/** 沒填過的旋鈕顯示空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(source: StrategyBotSignalSourceDto, name: string): string {
  return source.parameterValues.find(candidate => candidate.name === name)?.value.toString() ?? ''
}

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onParameterInput(index: number, name: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeParameterValue', index, name, value)
  }
}
</script>

<template>
  <div
    class="canvas"
    :class="{ 'canvas--carrying': holding !== null }"
  >
    <AppAlert
      v-for="mat in MATS.filter(candidate => !candidate.matrix().representable)"
      :key="`unrepresentable-${mat.key}`"
      tone="warning"
      :data-testid="`matrix-unrepresentable-${mat.key}`"
    >
      「{{ mat.heading }}」存的是一個且與或交錯的條件，這張工作檯排不出它。
      在這裡重排一次會換掉原本那一個。
    </AppAlert>

    <div class="canvas__bench">
      <!-- 零件架。拖回這裡＝把它從墊子上收走。 -->
      <section
        class="canvas__shelf"
        data-testid="shelf"
        @dragover.prevent="undefined"
        @drop.prevent="dropOnShelf"
      >
        <h3 class="canvas__shelf-heading">
          零件架
        </h3>

        <p
          v-if="hasNoStrategies"
          class="canvas__note"
          data-testid="no-strategies"
        >
          還沒有任何會吐訊號的策略。先去策略庫建一支。
        </p>
        <p
          v-else-if="sources.length === 0"
          class="canvas__note"
          data-testid="no-sources"
        >
          架子是空的。加一塊零件，就可以把它拖到右邊的墊子上。
        </p>

        <ul class="canvas__shelf-pieces">
          <li
            v-for="(source, index) in sources"
            :key="source.label + index"
            data-testid="strategy-row"
          >
            <div
              class="canvas__piece canvas__piece--shelf"
              :class="{ 'canvas__piece--in-use': isOnAnyMat(source.label) }"
              :draggable="true"
              :data-testid="`shelf-piece-${source.label}`"
              @dragstart="pickUp($event, source.label, 'shelf')"
              @dragend="letGo"
            >
              <span
                class="canvas__grip"
                aria-hidden="true"
              >⠿</span>
              <span class="canvas__piece-name">{{ source.label }}</span>
              <span class="canvas__piece-note">{{
                intervalOptions.find(option => option.value === source.aggregationInterval)?.label
                  ?? source.aggregationInterval
              }}</span>

              <AppButton
                type="button"
                variant="ghost"
                size="small"
                label="這塊零件的設定"
                :data-testid="`strategy-settings-${index}`"
                @click="tuningIndex = index"
              >
                ⚙
              </AppButton>
              <AppButton
                type="button"
                variant="danger-ghost"
                size="small"
                label="丟掉這塊零件"
                data-testid="strategy-remove"
                @click="emit('remove', index)"
              >
                ✕
              </AppButton>
            </div>
          </li>

          <li v-if="canAdd && !hasNoStrategies">
            <AppButton
              type="button"
              variant="secondary"
              size="small"
              block
              data-testid="strategy-add"
              @click="emit('add')"
            >
              ＋ 加一塊零件
            </AppButton>
          </li>
          <li v-else-if="!hasNoStrategies">
            <span class="canvas__note">架子上最多 {{ signalSourceLimit }} 塊</span>
          </li>
        </ul>
      </section>

      <!-- 兩張墊子。 -->
      <section
        v-for="mat in MATS"
        :key="mat.key"
        class="canvas__mat"
        :class="`canvas__mat--${mat.key}`"
        :data-testid="`mat-${mat.key}`"
      >
        <header class="canvas__mat-head">
          <span
            class="canvas__mat-name"
            :class="`canvas__mat-name--${mat.key}`"
          >{{ mat.heading }}</span>
          <span class="canvas__mat-hint">把零件拖進來</span>
        </header>

        <ul class="canvas__mat-pieces">
          <!--
            每一格前面都有一條放置線。它只在拿著東西的時候亮，
            因為一條永遠掛在那裡的線，多數時間只是噪音。
          -->
          <li
            v-for="(item, position) in mat.matrix().items"
            :key="item.key"
          >
            <div
              class="canvas__drop-line"
              :class="{
                'canvas__drop-line--armed':
                  hoveringAt?.side === mat.key && hoveringAt?.position === position,
              }"
              :data-testid="`drop-${mat.key}-${position}`"
              @dragover.prevent="hoverOver(mat.key, position)"
              @drop.prevent="dropOnMat(mat.key, position)"
            />

            <!--
              一組零件：扣在一起的那幾塊共用一個框，框上有它們之間怎麼合併。
              那個框就是「A 而且（B 或 C）」裡的那一對括號。
            -->
            <div
              class="canvas__item"
              :class="{ 'canvas__item--bundle': item.isBundle }"
              :data-testid="`item-${mat.key}-${item.key}`"
            >
              <header
                v-if="item.isBundle"
                class="canvas__bundle-head"
              >
                <span class="canvas__field-name">這一組裡面</span>
                <AppSelect
                  :model-value="item.operator ?? 'or'"
                  :data-testid="`bundle-operator-${mat.key}-${item.key}`"
                  @update:model-value="onBundleOperatorChange(mat.key, item.key, $event)"
                >
                  <option
                    v-for="option in operatorOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </AppSelect>
              </header>

              <div
                v-for="piece in item.pieces"
                :key="piece.sourceLabel"
                class="canvas__piece canvas__piece--placed"
                :draggable="true"
                :data-testid="`placed-${mat.key}-${piece.sourceLabel}`"
                @dragstart.stop="pickUp($event, piece.sourceLabel, mat.key)"
                @dragend.stop="letGo"
                @dragover.prevent.stop="hoverOver(mat.key, -1)"
                @drop.prevent.stop="dropOntoPiece(mat.key, piece.sourceLabel)"
              >
                <span
                  class="canvas__grip"
                  aria-hidden="true"
                >⠿</span>
                <span class="canvas__piece-name">{{ piece.sourceLabel }}</span>

                <AppButton
                  v-if="item.isBundle"
                  type="button"
                  variant="ghost"
                  size="small"
                  label="把這塊從這一組裡拆出來"
                  :data-testid="`unbundle-${mat.key}-${piece.sourceLabel}`"
                  @click="emit('unbundle', mat.key, piece.sourceLabel)"
                >
                  ⇱
                </AppButton>
                <AppButton
                  type="button"
                  variant="ghost"
                  size="small"
                  label="把這塊拿回架子上"
                  :data-testid="`take-off-${mat.key}-${piece.sourceLabel}`"
                  @click="emit('takeOff', mat.key, piece.sourceLabel)"
                >
                  ↩
                </AppButton>

                <!--
                  零件擺上墊子之後才長出它的開關：一塊還在架子上的零件沒有
                  「它要是什麼」這個問題——那是它**在這一邊**才有的性質。
                -->
                <span class="canvas__chips">
                  <!--
                    一支策略同一時間只吐一個信號，所以這三個開關之間是「其中之一」。
                    不寫出來的話，三塊並排的開關看起來像「而且」——而那是不可能的事。
                  -->
                  <span class="canvas__chips-label">只要是這幾個其中之一</span>
                  <button
                    v-for="chip in SIGNAL_CHIPS"
                    :key="chip.value"
                    type="button"
                    class="canvas__chip"
                    :class="[
                      `canvas__chip--${chip.value}`,
                      { 'canvas__chip--on': piece.acceptedSignals.includes(chip.value) },
                    ]"
                    :aria-pressed="piece.acceptedSignals.includes(chip.value)"
                    :data-testid="`chip-${mat.key}-${piece.sourceLabel}-${chip.value}`"
                    @click="emit('toggleSignal', mat.key, piece.sourceLabel, chip.value)"
                  >
                    {{ chip.label }}
                  </button>
                </span>

                <span
                  v-if="inPlainWords(piece.acceptedSignals) !== ''"
                  class="canvas__plain-words"
                  :data-testid="`plain-words-${mat.key}-${piece.sourceLabel}`"
                >↳ {{ inPlainWords(piece.acceptedSignals) }}</span>
              </div>
            </div>
          </li>

          <!-- 墊子最底下那一格，也是空墊子唯一的那一格。 -->
          <li>
            <div
              class="canvas__landing"
              :class="{
                'canvas__landing--armed':
                  hoveringAt?.side === mat.key
                  && hoveringAt?.position === mat.matrix().items.length,
              }"
              :data-testid="`drop-${mat.key}-end`"
              @dragover.prevent="hoverOver(mat.key, mat.matrix().items.length)"
              @drop.prevent="dropOnMat(mat.key, mat.matrix().items.length)"
            >
              {{ mat.matrix().items.length === 0 ? '這張墊子還是空的' : '疊在某一塊上就扣成一組' }}
            </div>
          </li>
        </ul>

        <footer class="canvas__mat-foot">
          <span class="canvas__field-name">墊子上這幾塊要</span>
          <AppSelect
            :model-value="mat.matrix().operator"
            :data-testid="`operator-${mat.key}`"
            @update:model-value="onOperatorChange(mat.key, $event)"
          >
            <option
              v-for="option in operatorOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </AppSelect>
        </footer>
      </section>
    </div>

    <!--
      一塊零件的設定。它在彈窗裡，因為原地展開會把架子撐長，
      而架子旁邊就是兩張墊子——調一次參數不該讓工作區被推走。
    -->
    <AppModal
      :open="tuningSource !== null"
      :title="`「${tuningSource?.label ?? ''}」這塊零件`"
      @close="tuningIndex = null"
    >
      <div
        v-if="tuningSource !== null && tuningIndex !== null"
        class="canvas__settings"
        :data-testid="`strategy-settings-panel-${tuningIndex}`"
      >
        <label class="canvas__field">
          <span class="canvas__field-name">這塊零件叫什麼</span>
          <AppInput
            :model-value="tuningSource.label"
            type="text"
            data-testid="strategy-label-input"
            @update:model-value="emit('changeLabel', tuningIndex!, String($event))"
          />
        </label>

        <label class="canvas__field">
          <span class="canvas__field-name">用哪一支策略</span>
          <AppSelect
            :model-value="String(tuningSource.strategyId)"
            data-testid="strategy-select"
            @update:model-value="emit('changeStrategy', tuningIndex!, Number($event))"
          >
            <option
              v-for="strategyOption in strategyOptions"
              :key="strategyOption.value"
              :value="String(strategyOption.value)"
            >
              {{ strategyOption.label }}
            </option>
          </AppSelect>
        </label>

        <label class="canvas__field">
          <span class="canvas__field-name">看多粗的 K 線</span>
          <AppSelect
            :model-value="tuningSource.aggregationInterval"
            data-testid="strategy-interval-select"
            @update:model-value="emit('changeInterval', tuningIndex!, String($event))"
          >
            <option
              v-for="intervalOption in intervalOptions"
              :key="intervalOption.value"
              :value="intervalOption.value"
            >
              {{ intervalOption.label }}
            </option>
          </AppSelect>
        </label>

        <label
          v-for="name in parameterNamesOf(tuningSource.strategyId)"
          :key="name"
          class="canvas__field"
        >
          <span class="canvas__field-name">{{ name }}</span>
          <AppInput
            :model-value="parameterValueOf(tuningSource, name)"
            type="number"
            inputmode="decimal"
            placeholder="用它的預設值"
            data-testid="strategy-parameter-input"
            @update:model-value="onParameterInput(tuningIndex!, name, $event)"
          />
        </label>
      </div>

      <template #actions>
        <AppButton
          type="button"
          data-testid="strategy-settings-done"
          @click="tuningIndex = null"
        >
          好了
        </AppButton>
      </template>
    </AppModal>
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

  /* 零件架。 */
  &__shelf {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 1px dashed color('border-strong');
    border-radius: radius('md');
    padding: spacing('xs');
  }

  &__shelf-heading {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-weight: font-weight('medium');
  }

  &__shelf-pieces,
  &__mat-pieces {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* 一塊零件。厚、圓、底下一條暗邊——它要看起來拿得起來。 */
  &__piece {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
    border-radius: radius('sm');
    box-shadow: shadow('piece-edge');
    cursor: grab;
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;

    &:active {
      cursor: grabbing;
    }
  }

  &__piece--shelf {
    background-color: color('surface-raised');
    color: color('text');
  }

  // 已經擺在某張墊子上的那幾塊，在架子上淡一階——架子是庫存，不是第二份清單。
  &__piece--in-use {
    opacity: 0.5;
  }

  // 擺上墊子的零件：底色只比墊子亮一階，顏色收在左邊那一條上。
  // 整塊填滿飽和色在深色底上會吵到蓋過它自己寫的字。
  &__piece--placed {
    flex-wrap: wrap;
    border-left: 2px solid color('info');
    background-color: color('surface-raised');
    color: color('text');
  }

  &__piece-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: font-size('2xs');
    font-weight: font-weight('semibold');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__piece-note {
    flex: none;
    opacity: 0.7;
    font-size: font-size('2xs');
  }

  &__grip {
    flex: none;
    opacity: 0.6;
    font-size: font-size('xs');
    line-height: 1;
  }

  /* 擺上墊子之後才長出來的那三個開關。 */
  &__chips {
    display: flex;
    flex-wrap: wrap;
    flex-basis: 100%;
    align-items: center;
    gap: spacing('3xs');
  }

  &__chips-label {
    flex-basis: 100%;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  // 那一句翻譯。它只在會被誤會的時候出現，所以不必搶戲。
  &__plain-words {
    flex-basis: 100%;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  // 開關按下去用**淡底加同色的字**，不是整塊填滿：一列三個開關並排時，
  // 三塊飽和色會讓人先看到顏色，才看到它們寫了什麼。
  &__chip {
    flex: 1;
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: transparent;
    cursor: pointer;
    padding: spacing('3xs');
    color: color('text-faint');
    font-size: font-size('2xs');
    font-family: inherit;

    &--on {
      font-weight: font-weight('semibold');
    }

    &--on#{&}--buy {
      border-color: color('success');
      background-color: color('success-soft');
      color: color('success');
    }

    &--on#{&}--sell {
      border-color: color('danger');
      background-color: color('danger-soft');
      color: color('danger');
    }

    &--on#{&}--hold {
      border-color: color('warning');
      background-color: color('warning-soft');
      color: color('warning');
    }
  }

  /* 墊子上的一格。 */
  &__item {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  // 扣在一起的那幾塊共用一個框——那個框就是「A 而且（B 或 C）」裡的那一對括號。
  &__item--bundle {
    border: 1px solid color('border-strong');
    border-left: 2px solid color('primary');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('3xs');
  }

  &__bundle-head {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
  }

  /* 墊子。 */
  &__mat {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 2px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('xs');
  }

  &__mat-head {
    display: flex;
    align-items: baseline;
    gap: spacing('2xs');
  }

  &__mat-name {
    border: 1px solid transparent;
    border-radius: radius('sm');
    padding: spacing('3xs') spacing('xs');
    font-size: font-size('2xs');
    font-weight: font-weight('semibold');

    &--buy {
      border-color: color('success-soft');
      background-color: color('success-soft');
      color: color('success');
    }

    &--sell {
      border-color: color('danger-soft');
      background-color: color('danger-soft');
      color: color('danger');
    }
  }

  &__mat-hint,
  &__note,
  &__field-name {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  /* 兩塊零件之間那條放置線。 */
  &__drop-line {
    border-radius: radius('sm');
    height: spacing('3xs');

    &--armed {
      background-color: color('primary-soft');
      box-shadow: inset 0 0 0 1px color('primary');
    }
  }

  /* 墊子最底下那一格，也是空墊子唯一的那一格。 */
  &__landing {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color duration('fast') ease;
    border: 1px dashed color('border');
    border-radius: radius('sm');
    box-shadow: shadow('socket-well');
    padding: spacing('xs');
    min-height: spacing('xl');
    color: color('text-faint');
    font-size: font-size('2xs');

    &--armed {
      border-style: solid;
      border-color: color('primary');
      background-color: color('primary-soft');
    }
  }

  // 手上拿著東西時，每一個放得下的地方都自己說一聲——
  // 拿著一塊零件卻看不出哪裡放得下，是最容易讓人放棄的一刻。
  &--carrying &__landing {
    border-color: color('border-strong');
    color: color('text-muted');
  }

  &__mat-foot {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    margin-top: auto;
    padding-top: spacing('2xs');
  }

  &__settings {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }
}
</style>
