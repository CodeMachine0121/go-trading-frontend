<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ConditionBoardDto } from '~/domain/models/dto/condition-board-dto'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

// 有機體：工作檯右邊的一張墊子——買入或賣出其中一邊，以及它上面擺了哪幾塊零件。
//
// 兩張墊子是同一個元件的兩份，因為它們要做的事一模一樣。寫兩份的話，
// 第二份就是那個忘記同步的地方。
const { board, heading, tone, hoveringAt } = defineProps<{
  board: ConditionBoardDto
  heading: string
  /** 這一邊是買還是賣。只決定顏色，不決定行為。 */
  tone: 'buy' | 'sell'
  /** 這張墊子上的哪一格正被游標懸著。不是這一張時為 `null`。 */
  hoveringAt: number | null
  /** 這一邊在畫面上的識別字，用來組出 data-testid。 */
  side: string
}>()

const emit = defineEmits<{
  hoverOver: [position: number]
  dropAt: [position: number]
  dropOntoPiece: [targetLabel: string]
  pickUpPiece: [event: DragEvent, sourceLabel: string]
  letGo: []
  toggleSignal: [sourceLabel: string, signal: string]
  takeOff: [sourceLabel: string]
  unbundle: [sourceLabel: string]
  changeOperator: [operator: ConditionOperatorVo]
  changeBundleOperator: [itemKey: string, operator: ConditionOperatorVo]
}>()

const SIGNAL_CHIPS = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
] as const

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/**
 * 一塊零件收著的那幾個信號，翻成人話。
 *
 * **一支策略腳本同一時間只吐一個信號**，所以三個開關之間是「其中之一」，不是「而且」——
 * 而畫面上三塊並排的開關看起來就像「而且」。那句誤會很難自己發現：
 * 使用者會盯著一塊寫著「賣出、持有」的零件，想不通一支策略腳本怎麼可能同時是兩者。
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

function onOperatorChange(chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeOperator', operator)
  }
}

function onBundleOperatorChange(itemKey: string, chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeBundleOperator', itemKey, operator)
  }
}
</script>

<template>
  <section
    class="mat"
    :data-testid="`mat-${side}`"
  >
    <header class="mat__head">
      <span
        class="mat__name"
        :class="`mat__name--${tone}`"
      >{{ heading }}</span>
      <span class="mat__note">把零件拖進來</span>
    </header>

    <ul class="mat__items">
      <!--
        每一格前面都有一條放置線。它只在拿著東西的時候亮，
        因為一條永遠掛在那裡的線，多數時間只是噪音。
      -->
      <li
        v-for="(item, position) in board.items"
        :key="item.key"
      >
        <div
          class="mat__drop-line"
          :class="{ 'mat__drop-line--armed': hoveringAt === position }"
          :data-testid="`drop-${side}-${position}`"
          @dragover.prevent="emit('hoverOver', position)"
          @drop.prevent="emit('dropAt', position)"
        />

        <!--
          一組零件：扣在一起的那幾塊共用一個框，框上有它們之間怎麼合併。
          那個框就是「A 而且（B 或 C）」裡的那一對括號。
        -->
        <div
          class="mat__item"
          :class="{ 'mat__item--bundle': item.isBundle }"
          :data-testid="`item-${side}-${item.key}`"
        >
          <header
            v-if="item.isBundle"
            class="mat__bundle-head"
          >
            <span class="mat__note">這一組裡面</span>
            <AppSelect
              :model-value="item.operator ?? 'or'"
              :data-testid="`bundle-operator-${side}-${item.key}`"
              @update:model-value="onBundleOperatorChange(item.key, $event)"
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
            class="mat__piece"
            :draggable="true"
            :data-testid="`placed-${side}-${piece.sourceLabel}`"
            @dragstart.stop="emit('pickUpPiece', $event, piece.sourceLabel)"
            @dragend.stop="emit('letGo')"
            @dragover.prevent.stop="emit('hoverOver', -1)"
            @drop.prevent.stop="emit('dropOntoPiece', piece.sourceLabel)"
          >
            <span
              class="mat__grip"
              aria-hidden="true"
            >⠿</span>
            <span class="mat__piece-name">{{ piece.sourceLabel }}</span>

            <AppButton
              v-if="item.isBundle"
              type="button"
              variant="ghost"
              size="small"
              label="把這塊從這一組裡拆出來"
              :data-testid="`unbundle-${side}-${piece.sourceLabel}`"
              @click="emit('unbundle', piece.sourceLabel)"
            >
              ⇱
            </AppButton>
            <AppButton
              type="button"
              variant="ghost"
              size="small"
              label="把這塊拿回架子上"
              :data-testid="`take-off-${side}-${piece.sourceLabel}`"
              @click="emit('takeOff', piece.sourceLabel)"
            >
              ↩
            </AppButton>

            <!--
              零件擺上墊子之後才長出它的開關：一塊還在架子上的零件沒有
              「它要是什麼」這個問題——那是它**在這一邊**才有的性質。
            -->
            <span class="mat__chips">
              <span class="mat__chips-label">只要是這幾個其中之一</span>
              <button
                v-for="chip in SIGNAL_CHIPS"
                :key="chip.value"
                type="button"
                class="mat__chip"
                :class="[
                  `mat__chip--${chip.value}`,
                  { 'mat__chip--on': piece.acceptedSignals.includes(chip.value) },
                ]"
                :aria-pressed="piece.acceptedSignals.includes(chip.value)"
                :data-testid="`chip-${side}-${piece.sourceLabel}-${chip.value}`"
                @click="emit('toggleSignal', piece.sourceLabel, chip.value)"
              >
                {{ chip.label }}
              </button>
            </span>

            <span
              v-if="inPlainWords(piece.acceptedSignals) !== ''"
              class="mat__plain-words"
              :data-testid="`plain-words-${side}-${piece.sourceLabel}`"
            >↳ {{ inPlainWords(piece.acceptedSignals) }}</span>
          </div>
        </div>
      </li>

      <!-- 墊子最底下那一格，也是空墊子唯一的那一格。 -->
      <li>
        <div
          class="mat__landing"
          :class="{ 'mat__landing--armed': hoveringAt === board.items.length }"
          :data-testid="`drop-${side}-end`"
          @dragover.prevent="emit('hoverOver', board.items.length)"
          @drop.prevent="emit('dropAt', board.items.length)"
        >
          {{ board.items.length === 0 ? '這張墊子還是空的' : '疊在某一塊上就扣成一組' }}
        </div>
      </li>
    </ul>

    <footer class="mat__foot">
      <span class="mat__note">墊子上這幾塊要</span>
      <AppSelect
        :model-value="board.operator"
        :data-testid="`operator-${side}`"
        @update:model-value="onOperatorChange($event)"
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
</template>

<style scoped lang="scss">
.mat {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');
  border: 2px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('xs');

  &__head {
    display: flex;
    align-items: baseline;
    gap: spacing('2xs');
  }

  &__name {
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

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

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

  &__piece {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('3xs');
    border-left: 2px solid color('info');
    border-radius: radius('sm');
    box-shadow: shadow('piece-edge');
    background-color: color('surface-raised');
    cursor: grab;
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;
    color: color('text');

    &:active {
      cursor: grabbing;
    }
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

  &__grip {
    flex: none;
    color: color('text-faint');
    font-size: font-size('xs');
    line-height: 1;
  }

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

  // 按下去用**淡底加同色的字**，不是整塊填滿：一列三個開關並排時，
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

  // 那一句翻譯。它只在會被誤會的時候出現，所以不必搶戲。
  &__plain-words {
    flex-basis: 100%;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  &__drop-line {
    border-radius: radius('sm');
    height: spacing('3xs');

    &--armed {
      box-shadow: inset 0 0 0 1px color('primary');
      background-color: color('primary-soft');
    }
  }

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

  &__foot {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    margin-top: auto;
    padding-top: spacing('2xs');
  }
}
</style>
