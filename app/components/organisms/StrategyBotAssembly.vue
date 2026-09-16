<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ConditionMatrixDto } from '~/domain/models/dto/condition-matrix-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：把一句一句的判斷**拼**出來。
//
// 一句判斷是三個零件扣起來的：⬢策略⬢ ⟩是⟨ ⬢信號⬢。
// 拼的方式是從底下的零件盤點一塊，它就落進上面那個空著的槽；兩個槽都滿了，
// 這一句就接進堆疊裡，下面再冒一個新的空槽。
//
// 條件這一區裡**一個下拉選單都沒有**，而那是重點：一個下拉選單是在「填表」，
// 一塊掉進槽裡的零件是在「組裝」。同一份資料，兩種完全不同的事。
//
// 形狀本身就是規則：策略的槽只吃策略零件，信號的槽只吃信號零件——
// 使用者不必讀任何說明，就拼不出一句沒有意義的話。
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
  toggleSignal: [side: 'buy' | 'sell', sourceLabel: string, signal: string]
  changeOperator: [side: 'buy' | 'sell', operator: ConditionOperatorVo]
}>()

type Side = 'buy' | 'sell'

const SIGNAL_PIECES = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
] as const

const SIDES = [
  { key: 'buy' as Side, heading: '什麼算買入', matrix: () => buyMatrix },
  { key: 'sell' as Side, heading: '什麼算賣出', matrix: () => sellMatrix },
]

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/**
 * 正在拼的那一句，每一邊各一句。
 *
 * 它是**半成品**，而半成品有自己的位置：那個還空著的槽。拼完就接進堆疊，
 * 這裡跟著清空——半成品留在原地的話，使用者會看到自己剛拼好的那一句出現兩次。
 */
const inProgress = ref<Record<Side, { sourceLabel: string, signal: string }>>({
  buy: { sourceLabel: '', signal: '' },
  sell: { sourceLabel: '', signal: '' },
})

/** 使用者正在拼哪一邊。零件盤只有一個，所以「現在要放進哪裡」全畫面只能有一個答案。 */
const activeSide = ref<Side>('buy')

/** 剛剛接上去的那一句，用來放那一下「咔」的動畫。 */
const justSnapped = ref('')

/** 一邊已經拼好的每一句。矩陣裡亮著的每一格，就是一句。 */
function sentencesOf(matrix: ConditionMatrixDto) {
  return matrix.rows.flatMap(row => row.acceptedSignals.map(signal => ({
    key: `${row.sourceLabel}-${signal}`,
    sourceLabel: row.sourceLabel,
    signal,
    signalLabel: SIGNAL_PIECES.find(piece => piece.value === signal)?.label ?? signal,
  })))
}

/** 這一塊零件是不是已經用在正在拼的那一句上了。 */
function isHeld(side: Side, kind: 'source' | 'signal', value: string): boolean {
  const slot = inProgress.value[side]

  return kind === 'source' ? slot.sourceLabel === value : slot.signal === value
}

/**
 * 點一塊零件：它落進它自己那一個槽。
 *
 * 兩個槽都滿了就自動接上去——還要再按一次「確定」的話，那一下就是在填表，
 * 而不是在拼。點同一塊已經在槽裡的零件會把它拿回來，因為拿錯了總要放得回去。
 */
function place(kind: 'source' | 'signal', value: string) {
  const side = activeSide.value
  const slot = inProgress.value[side]
  const next = kind === 'source'
    ? { sourceLabel: slot.sourceLabel === value ? '' : value, signal: slot.signal }
    : { sourceLabel: slot.sourceLabel, signal: slot.signal === value ? '' : value }

  inProgress.value = { ...inProgress.value, [side]: next }

  if (next.sourceLabel !== '' && next.signal !== '') {
    emit('toggleSignal', side, next.sourceLabel, next.signal)
    justSnapped.value = `${side}-${next.sourceLabel}-${next.signal}`
    inProgress.value = { ...inProgress.value, [side]: { sourceLabel: '', signal: '' } }
  }
}

/** 一整句拿掉。 */
function takeApart(side: Side, sourceLabel: string, signal: string) {
  emit('toggleSignal', side, sourceLabel, signal)
}

function onOperatorChange(side: Side, chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeOperator', side, operator)
  }
}

/** 哪幾支策略正打開著它的設定。用**代號**記而不是位置——刪掉中間一支之後位置會挪。 */
const expandedLabels = ref<string[]>([])

function toggleSettings(label: string) {
  expandedLabels.value = expandedLabels.value.includes(label)
    ? expandedLabels.value.filter(expanded => expanded !== label)
    : [...expandedLabels.value, label]
}

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
  <div class="assembly">
    <AppAlert
      v-for="side in SIDES.filter(candidate => !candidate.matrix().representable)"
      :key="`unrepresentable-${side.key}`"
      tone="warning"
      :data-testid="`matrix-unrepresentable-${side.key}`"
    >
      「{{ side.heading }}」存的是一個且與或交錯的條件，這裡拼不出它。
      在這裡重拼一次會換掉原本那一個。
    </AppAlert>

    <p
      v-if="hasNoStrategies"
      class="assembly__note"
      data-testid="no-strategies"
    >
      還沒有任何會吐訊號的策略。先去策略庫建一支，這裡才有零件可以拼。
    </p>

    <!-- 上半：兩座拼好的堆疊。 -->
    <div class="assembly__boards">
      <section
        v-for="side in SIDES"
        :key="side.key"
        class="assembly__board"
        :class="{ 'assembly__board--active': activeSide === side.key }"
        :data-testid="`board-${side.key}`"
        @click="activeSide = side.key"
      >
        <header class="assembly__board-head">
          <span
            class="assembly__verdict"
            :class="`assembly__verdict--${side.key}`"
          >{{ side.heading }}</span>
        </header>

        <ul class="assembly__stack">
          <li
            v-for="sentence in sentencesOf(side.matrix())"
            :key="sentence.key"
            class="assembly__sentence"
            :class="{
              'assembly__sentence--snapped':
                justSnapped === `${side.key}-${sentence.sourceLabel}-${sentence.signal}`,
            }"
            :data-testid="`sentence-${side.key}-${sentence.sourceLabel}-${sentence.signal}`"
          >
            <span class="assembly__piece assembly__piece--source">{{ sentence.sourceLabel }}</span>
            <span class="assembly__joint">是</span>
            <span
              class="assembly__piece assembly__piece--signal"
              :class="`assembly__piece--signal-${sentence.signal}`"
            >{{ sentence.signalLabel }}</span>
            <button
              type="button"
              class="assembly__take-apart"
              :aria-label="`拆掉「${sentence.sourceLabel} 是 ${sentence.signalLabel}」`"
              :data-testid="`take-apart-${side.key}-${sentence.sourceLabel}-${sentence.signal}`"
              @click.stop="takeApart(side.key, sentence.sourceLabel, sentence.signal)"
            >
              ✕
            </button>
          </li>

          <!--
            還空著的那一句。它**永遠在最下面**，所以使用者永遠看得到下一步在哪裡——
            一個要先按「新增」才出現的槽，等於把最常做的那件事藏起來。
          -->
          <li
            class="assembly__sentence assembly__sentence--socket"
            :data-testid="`socket-${side.key}`"
          >
            <span
              class="assembly__slot"
              :class="{ 'assembly__slot--filled': inProgress[side.key].sourceLabel !== '' }"
              :data-testid="`slot-source-${side.key}`"
            >{{ inProgress[side.key].sourceLabel || '挑一支策略' }}</span>
            <span class="assembly__joint">是</span>
            <span
              class="assembly__slot"
              :class="{ 'assembly__slot--filled': inProgress[side.key].signal !== '' }"
              :data-testid="`slot-signal-${side.key}`"
            >{{
              SIGNAL_PIECES.find(piece => piece.value === inProgress[side.key].signal)?.label
                || '挑一個信號'
            }}</span>
          </li>
        </ul>

        <footer class="assembly__board-foot">
          <span class="assembly__foot-label">上面這幾句要</span>
          <AppSelect
            :model-value="side.matrix().operator"
            :data-testid="`operator-${side.key}`"
            @update:model-value="onOperatorChange(side.key, $event)"
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

    <!-- 下半：零件盤。點一塊，它就落進上面那個空著的槽。 -->
    <section class="assembly__tray">
      <div class="assembly__tray-row">
        <span class="assembly__tray-label">策略</span>

        <p
          v-if="sources.length === 0"
          class="assembly__note"
          data-testid="no-sources"
        >
          還沒有零件。加一支策略，它就會變成一塊可以拼的零件。
        </p>

        <ul class="assembly__pieces">
          <li
            v-for="(source, index) in sources"
            :key="source.label + index"
            class="assembly__piece-slot"
            data-testid="strategy-row"
          >
            <button
              type="button"
              class="assembly__piece assembly__piece--source assembly__piece--pickable"
              :class="{ 'assembly__piece--held': isHeld(activeSide, 'source', source.label) }"
              :aria-pressed="isHeld(activeSide, 'source', source.label)"
              :data-testid="`piece-source-${source.label}`"
              @click="place('source', source.label)"
            >
              {{ source.label }}
              <span class="assembly__piece-note">{{
                intervalOptions.find(option => option.value === source.aggregationInterval)?.label
                  ?? source.aggregationInterval
              }}</span>
            </button>

            <AppButton
              type="button"
              variant="ghost"
              size="small"
              label="這一支的設定"
              :data-testid="`strategy-settings-${index}`"
              @click="toggleSettings(source.label)"
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

            <div
              v-if="expandedLabels.includes(source.label)"
              class="assembly__settings"
              :data-testid="`strategy-settings-panel-${index}`"
            >
              <label class="assembly__field">
                <span class="assembly__field-name">這塊零件叫什麼</span>
                <AppInput
                  :model-value="source.label"
                  type="text"
                  data-testid="strategy-label-input"
                  @update:model-value="emit('changeLabel', index, String($event))"
                />
              </label>

              <label class="assembly__field">
                <span class="assembly__field-name">用哪一支策略</span>
                <AppSelect
                  :model-value="String(source.strategyId)"
                  data-testid="strategy-select"
                  @update:model-value="emit('changeStrategy', index, Number($event))"
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

              <label class="assembly__field">
                <span class="assembly__field-name">看多粗的 K 線</span>
                <AppSelect
                  :model-value="source.aggregationInterval"
                  data-testid="strategy-interval-select"
                  @update:model-value="emit('changeInterval', index, String($event))"
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
                v-for="name in parameterNamesOf(source.strategyId)"
                :key="name"
                class="assembly__field"
              >
                <span class="assembly__field-name">{{ name }}</span>
                <AppInput
                  :model-value="parameterValueOf(source, name)"
                  type="number"
                  inputmode="decimal"
                  placeholder="用它的預設值"
                  data-testid="strategy-parameter-input"
                  @update:model-value="onParameterInput(index, name, $event)"
                />
              </label>
            </div>
          </li>

          <li v-if="canAdd && !hasNoStrategies">
            <AppButton
              type="button"
              variant="secondary"
              size="small"
              data-testid="strategy-add"
              @click="emit('add')"
            >
              ＋ 加一塊
            </AppButton>
          </li>
          <li v-else-if="!hasNoStrategies">
            <span class="assembly__note">最多 {{ signalSourceLimit }} 塊</span>
          </li>
        </ul>
      </div>

      <div class="assembly__tray-row">
        <span class="assembly__tray-label">信號</span>
        <ul class="assembly__pieces">
          <li
            v-for="piece in SIGNAL_PIECES"
            :key="piece.value"
          >
            <button
              type="button"
              class="assembly__piece assembly__piece--signal assembly__piece--pickable"
              :class="[
                `assembly__piece--signal-${piece.value}`,
                { 'assembly__piece--held': isHeld(activeSide, 'signal', piece.value) },
              ]"
              :aria-pressed="isHeld(activeSide, 'signal', piece.value)"
              :data-testid="`piece-signal-${piece.value}`"
              @click="place('signal', piece.value)"
            >
              {{ piece.label }}
            </button>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.assembly {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__boards {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('lg') {
      // 兩座並排：兩邊同時成立時這台機器人什麼都不會說，
      // 而那件事只有並排時才看得出來。
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  /* 一座拼板：零件疊在上面的那塊底板。 */
  &__board {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    transition: border-color duration('fast') ease;
    border: 2px solid color('border');
    border-radius: radius('lg');

    // 底板比頁面暗一階，零件才浮得起來——同色的話它們看起來是畫上去的。
    background-color: color('background');
    padding: spacing('sm');
  }

  // 現在拼的是這一座。零件盤只有一個，所以它得說得出零件會落到哪裡。
  &__board--active {
    border-color: color('primary');
  }

  &__board-head {
    display: flex;
    align-items: center;
  }

  /* 結論塊：整座拼板的帽子，顏色就是它的意思。 */
  &__verdict {
    border-radius: radius('sm') radius('sm') radius('md') radius('md');
    padding: spacing('3xs') spacing('sm');
    color: color('text-inverse');
    font-size: font-size('xs');
    font-weight: font-weight('semibold');

    &--buy {
      background-color: color('success');
    }

    &--sell {
      background-color: color('danger');
    }
  }

  &__stack {
    display: flex;
    flex-direction: column;

    // 零件是疊起來的，所以它們之間**沒有縫**——有縫就是兩堆，不是一堆。
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* 一句拼好的話。 */
  &__sentence {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
    border: 1px solid color('border-strong');

    // 上下相接的兩句共用一條邊，看起來就是扣在一起的。
    border-top-width: 0;
    background-color: color('surface-raised');
    padding: spacing('2xs');

    &:first-child {
      border-top-width: 1px;
      border-radius: radius('sm') radius('sm') 0 0;
    }

    &:last-child {
      border-radius: 0 0 radius('sm') radius('sm');
    }

    &:only-child {
      border-top-width: 1px;
      border-radius: radius('sm');
    }
  }

  /* 剛接上去的那一下。 */
  &__sentence--snapped {
    animation: snap-in duration('normal') ease;
  }

  /* 還空著的那一句：挖空的槽，不是一塊零件。 */
  &__sentence--socket {
    border-style: dashed;
    border-top-width: 1px;
    background-color: transparent;
  }

  /* 一塊零件。厚、圓、有一條底邊——它要看起來拿得起來。 */
  &__piece {
    display: inline-flex;
    align-items: baseline;
    gap: spacing('3xs');
    border: none;
    border-radius: radius('sm');
    box-shadow: shadow('piece-edge');
    padding: spacing('3xs') spacing('2xs');
    color: color('text-inverse');
    font-size: font-size('2xs');
    font-weight: font-weight('semibold');
    font-family: inherit;

    &--source {
      background-color: color('info');
    }

    &--signal-buy {
      background-color: color('success');
    }

    &--signal-sell {
      background-color: color('danger');
    }

    &--signal-hold {
      background-color: color('warning');
    }

    &--pickable {
      cursor: pointer;
    }

    // 拿在手上的那一塊：它此刻在上面的槽裡，所以這裡只留一個影子——
    // 兩個地方同時出現同一塊，使用者會以為自己拿到的是第二塊。
    &--held {
      opacity: 0.35;
      box-shadow: inset 0 0 0 2px color('primary');
    }
  }

  &__piece-note {
    opacity: 0.75;
    font-size: font-size('2xs');
    font-weight: font-weight('regular');
  }

  /* 槽：挖進底板裡的一個凹洞。 */
  &__slot {
    flex: 1;
    border: 1px dashed color('border-strong');
    border-radius: radius('sm');

    // 內陰影讓它看起來是凹的，而不是另一塊貼上去的東西。
    box-shadow: shadow('socket-well');
    background-color: color('background');
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    text-align: center;

    &--filled {
      border-style: solid;
      border-color: color('primary');
      color: color('text-strong');
    }
  }

  &__joint {
    flex: none;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__take-apart {
    flex: none;
    margin-left: auto;
    border: none;
    background: none;
    cursor: pointer;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-family: inherit;

    &:hover {
      color: color('danger');
    }
  }

  &__board-foot {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    margin-top: spacing('2xs');
  }

  &__foot-label {
    flex: none;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  /* 零件盤。 */
  &__tray {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('sm');
  }

  &__tray-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__tray-label {
    flex: none;
    width: 3em;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__pieces {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__piece-slot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('3xs');
  }

  &__settings {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('sm');
    flex-basis: 100%;
    margin-left: spacing('sm');
    border-left: 2px solid color('border');
    padding-left: spacing('2xs');
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 9rem;
  }

  &__field-name,
  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}

// 咔的那一下：從上面一點掉下來，壓一下再回彈。看得見它接上去，才叫組裝。
@keyframes snap-in {
  0% {
    transform: translateY(-6px) scaleY(1.06);
  }

  60% {
    transform: translateY(0) scaleY(0.96);
  }

  100% {
    transform: translateY(0) scaleY(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .assembly__sentence--snapped {
    animation: none;
  }
}
</style>
