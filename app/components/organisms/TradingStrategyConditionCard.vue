<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import ConditionClauseSentence from '~/components/molecules/ConditionClauseSentence.vue'
import FormField from '~/components/molecules/FormField.vue'
import StepCard from '~/components/molecules/StepCard.vue'
import StepSettingsPanel from '~/components/molecules/StepSettingsPanel.vue'
import type { ConditionBoardDto } from '~/domain/models/dto/condition-board-dto'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'

// 有機體：步驟卡二／三——一邊的條件板：什麼算買入，或什麼算賣出。
//
// 兩張卡是同一個元件的兩份，因為它們要做的事一模一樣。寫兩份的話，
// 第二份就是那個忘記同步的地方。
//
// **一切都用點的，不用拖的**：加一條（挑一個來源、挑它要等於哪一種信號）、
// 拿掉一條、把兩條扣成一組、把一條加進某一組、改一組的且／或、把一組拆開、
// 換一條的位置。所以手機上也編得動——拖拉在一隻拇指底下是做不準的。
//
// 卡上把每一格讀成一句話；點一格，它的設定出現在卡旁邊（窄螢幕從下方拉出）。
// 搬動本身的規則（一組裡不再有一組、只剩一條的組自己散開）一條都不在這裡——
// 那是 ConditionBoardDomain 的事，這裡只把使用者點了什麼往上報。
const { side, heading, board, sourceLabels, signalOptions } = defineProps<{
  side: ConditionSideVo
  /** 這張卡的標題：「什麼算買入」或「什麼算賣出」。 */
  heading: string
  /** 這張卡的顏色：買入是上漲的綠，賣出是下跌的紅。由表單那一層說。 */
  tone: 'success' | 'danger'
  board: ConditionBoardDto
  /** 這一刻宣告了的來源代號——加一條時挑得到的就是這幾個。 */
  sourceLabels: readonly string[]
  /** 一條比對挑得到的三個信號。 */
  signalOptions: readonly { value: string, label: string }[]
  /** 這張卡現在被選著——它的設定正開著。 */
  selected: boolean
  /** 設定擺在卡旁邊，還是從下方拉出。 */
  settingsPlacement: 'beside' | 'sheet'
}>()

const emit = defineEmits<{
  select: []
  close: []
  changeOperator: [operator: ConditionOperatorVo]
  changeBundleOperator: [itemKey: string, operator: ConditionOperatorVo]
  addClause: [sourceLabel: string, signal: string]
  toggleSignal: [sourceLabel: string, signal: string]
  takeOff: [sourceLabel: string]
  bundleOnto: [sourceLabel: string, targetLabel: string]
  bundleWith: [sourceLabel: string, targetKey: string]
  unbundle: [sourceLabel: string]
  splitBundle: [itemKey: string]
  placeAt: [sourceLabel: string, position: number]
}>()

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/**
 * 正在調的那一格，用它裡面某一條的來源代號記。
 *
 * 不用格的 key 記：扣成一組、拆出來都會換掉 key，而使用者剛剛才對著那一格按下去——
 * 用代號記的話，扣成一組之後設定照樣開在那一組上。`null` 就是在加一條新的。
 */
const focusedLabel = ref<string | null>(null)

const focusedItem = computed(() => (focusedLabel.value === null
  ? null
  : board.items.find(item => item.holdsLabels.includes(focusedLabel.value ?? '')) ?? null))

const focusedPosition = computed(
  () => (focusedItem.value === null ? -1 : board.items.indexOf(focusedItem.value)))

/** 一個來源在一張卡上只出現一次，所以加一條時只挑得到還沒擺上來的。 */
const unplacedLabels = computed(
  () => sourceLabels.filter(label => !board.placedLabels.includes(label)))

const chosenSource = ref('')
const chosenSignal = ref(signalOptions[0]?.value ?? 'buy')

/** 挑著的那一個被用掉或被刪掉時，退回第一個還挑得到的，而不是停在一個選單裡沒有的值上。 */
const addingSource = computed(() => (unplacedLabels.value.includes(chosenSource.value)
  ? chosenSource.value
  : unplacedLabels.value[0] ?? ''))

/** 除了正在調的那一格以外的每一格——扣成一組時挑得到的對象。 */
const otherItems = computed(() => board.items.filter(item => item !== focusedItem.value))

function operatorOf(chosen: string): ConditionOperatorVo | undefined {
  return CONDITION_OPERATORS.find(candidate => candidate === chosen)
}

function onOperatorChange(chosen: string) {
  const operator = operatorOf(chosen)
  if (operator !== undefined) {
    emit('changeOperator', operator)
  }
}

function onBundleOperatorChange(itemKey: string, chosen: string) {
  const operator = operatorOf(chosen)
  if (operator !== undefined) {
    emit('changeBundleOperator', itemKey, operator)
  }
}

function focus(sourceLabel: string | null) {
  focusedLabel.value = sourceLabel
  emit('select')
}

function addClause() {
  if (addingSource.value === '') {
    return
  }

  emit('addClause', addingSource.value, chosenSignal.value)
  focusedLabel.value = addingSource.value
}

/** 拿掉一條之後，設定留在同一組剩下的那幾條上；整格都沒了就回到「加一條」。 */
function takeOff(sourceLabel: string) {
  const remaining = focusedItem.value?.holdsLabels.filter(label => label !== sourceLabel) ?? []
  emit('takeOff', sourceLabel)
  if (focusedLabel.value === sourceLabel) {
    focusedLabel.value = remaining[0] ?? null
  }
}

function onBundleInto(targetLabel: string, joiningLabel: string) {
  if (joiningLabel !== '') {
    emit('bundleOnto', joiningLabel, targetLabel)
  }
}

function close() {
  focusedLabel.value = null
  emit('close')
}
</script>

<template>
  <StepCard
    class="condition-card"
    kicker="條件"
    :title="heading"
    :tone="tone"
    :selected="selected"
    :beside="settingsPlacement === 'beside'"
    :data-testid="`step-${side}`"
  >
    <template #badge>
      <AppIcon
        name="flow"
        size="small"
      />
    </template>

    <template #aside>
      <AppTabs
        :model-value="board.operator"
        :options="operatorOptions"
        variant="segmented"
        :data-testid="`operator-${side}`"
        @update:model-value="onOperatorChange"
      />
    </template>

    <AppAlert
      v-if="!board.representable"
      tone="warning"
      :data-testid="`board-unrepresentable-${side}`"
    >
      「{{ heading }}」存的是一個且與或交錯的條件，這張卡排不出它。
      在這裡重排一次會換掉原本那一個。
    </AppAlert>

    <p
      v-if="board.isEmpty"
      class="condition-card__note"
      :data-testid="`board-empty-${side}`"
    >
      這張卡還是空的，加一條條件吧。
    </p>

    <ol
      v-else
      class="condition-card__items"
    >
      <li
        v-for="(item, position) in board.items"
        :key="item.key"
        class="condition-card__entry"
      >
        <span
          v-if="position > 0"
          class="condition-card__joiner"
        >{{ board.joinerWord }}</span>

        <button
          type="button"
          class="condition-card__item"
          :class="{
            'condition-card__item--bundle': item.isBundle,
            'condition-card__item--focused': selected && focusedItem === item,
          }"
          :data-testid="`item-${side}-${item.key}`"
          @click="focus(item.holdsLabels[0] ?? null)"
        >
          <span
            v-if="item.isBundle"
            class="condition-card__bundle-tag"
          >一組</span>
          <ConditionClauseSentence :item="item" />
        </button>
      </li>
    </ol>

    <AppButton
      type="button"
      variant="ghost"
      size="small"
      class="condition-card__add"
      :data-testid="`clause-add-${side}`"
      @click="focus(null)"
    >
      <AppIcon
        name="plus"
        size="small"
      />
      加一條條件
    </AppButton>

    <template #settings>
      <StepSettingsPanel
        :open="selected"
        :title="heading"
        :placement="settingsPlacement"
        @close="close"
      >
        <p
          class="condition-card__read-out"
          :data-testid="`board-sentence-${side}`"
        >
          {{ board.readOut }}
        </p>

        <!-- 正在調的那一格：一條，或扣在一起的一組。 -->
        <section
          v-if="focusedItem !== null"
          class="condition-card__editor"
          :data-testid="`item-settings-${side}`"
        >
          <header
            v-if="focusedItem.isBundle"
            class="condition-card__bundle-head"
          >
            <FormField
              label="這一組裡面"
              grouped
            >
              <AppTabs
                :model-value="focusedItem.operator ?? 'or'"
                :options="operatorOptions"
                variant="segmented"
                block
                :data-testid="`bundle-operator-${side}-${focusedItem.key}`"
                @update:model-value="chosen => onBundleOperatorChange(focusedItem?.key ?? '', chosen)"
              />
            </FormField>
          </header>

          <div
            v-for="piece in focusedItem.pieces"
            :key="piece.sourceLabel"
            class="condition-card__piece"
            :data-testid="`placed-${side}-${piece.sourceLabel}`"
          >
            <div class="condition-card__piece-head">
              <span class="condition-card__piece-name">{{ piece.sourceLabel }}</span>
              <span class="condition-card__piece-relation">{{ piece.relationWord }}</span>
              <AppButton
                v-if="focusedItem.isBundle"
                type="button"
                variant="ghost"
                size="small"
                :data-testid="`unbundle-${side}-${piece.sourceLabel}`"
                @click="emit('unbundle', piece.sourceLabel)"
              >
                拆出來
              </AppButton>
              <AppButton
                type="button"
                variant="danger-ghost"
                size="small"
                :data-testid="`take-off-${side}-${piece.sourceLabel}`"
                @click="takeOff(piece.sourceLabel)"
              >
                拿掉
              </AppButton>
            </div>

            <!--
              一支策略腳本同一時間只吐一個信號，所以這幾個開關之間是「其中之一」。
              選了兩個以上時底下那一句把它翻成人話。
            -->
            <div
              class="condition-card__chips"
              role="group"
              :aria-label="`${piece.sourceLabel} 只要是這幾個其中之一`"
            >
              <button
                v-for="signalOption in signalOptions"
                :key="signalOption.value"
                type="button"
                class="condition-card__chip"
                :class="{ 'condition-card__chip--on': piece.acceptedSignals.includes(signalOption.value) }"
                :aria-pressed="piece.acceptedSignals.includes(signalOption.value)"
                :data-testid="`chip-${side}-${piece.sourceLabel}-${signalOption.value}`"
                @click="emit('toggleSignal', piece.sourceLabel, signalOption.value)"
              >
                {{ signalOption.label }}
              </button>
            </div>

            <span
              v-if="piece.plainWords !== ''"
              class="condition-card__plain-words"
              :data-testid="`plain-words-${side}-${piece.sourceLabel}`"
            >↳ {{ piece.plainWords }}</span>
          </div>

          <!-- 單獨一條：可以換位置，也可以跟另一格扣成一組。 -->
          <template v-if="!focusedItem.isBundle">
            <div
              v-if="board.items.length > 1"
              class="condition-card__moves"
            >
              <AppButton
                type="button"
                variant="secondary"
                size="small"
                :disabled="focusedPosition <= 0"
                :data-testid="`move-earlier-${side}-${focusedItem.key}`"
                @click="emit('placeAt', focusedItem.holdsLabels[0] ?? '', focusedPosition - 1)"
              >
                往前一格
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                size="small"
                :disabled="focusedPosition >= board.items.length - 1"
                :data-testid="`move-later-${side}-${focusedItem.key}`"
                @click="emit('placeAt', focusedItem.holdsLabels[0] ?? '', focusedPosition + 1)"
              >
                往後一格
              </AppButton>
            </div>

            <FormField
              v-if="otherItems.length > 0"
              label="和另一格扣成一組"
            >
              <AppSelect
                model-value=""
                :data-testid="`bundle-with-${side}-${focusedItem.key}`"
                @update:model-value="targetKey => emit('bundleWith', focusedItem?.holdsLabels[0] ?? '', targetKey)"
              >
                <option value="">
                  挑一格…
                </option>
                <option
                  v-for="other in otherItems"
                  :key="other.key"
                  :value="other.key"
                >
                  {{ other.sentence }}
                </option>
              </AppSelect>
            </FormField>
          </template>

          <!-- 一組：可以再加一條進來，也可以整組拆開。 -->
          <template v-else>
            <FormField
              v-if="otherItems.some(other => !other.isBundle)"
              label="把另一條加進這一組"
            >
              <AppSelect
                model-value=""
                :data-testid="`bundle-into-${side}-${focusedItem.key}`"
                @update:model-value="joining => onBundleInto(focusedItem?.holdsLabels[0] ?? '', joining)"
              >
                <option value="">
                  挑一條…
                </option>
                <option
                  v-for="other in otherItems.filter(candidate => !candidate.isBundle)"
                  :key="other.key"
                  :value="other.holdsLabels[0]"
                >
                  {{ other.sentence }}
                </option>
              </AppSelect>
            </FormField>

            <AppButton
              type="button"
              variant="secondary"
              size="small"
              :data-testid="`split-${side}-${focusedItem.key}`"
              @click="emit('splitBundle', focusedItem.key)"
            >
              拆開這一組
            </AppButton>
          </template>
        </section>

        <!-- 加一條：挑一個來源、挑它要等於哪一種信號。 -->
        <section
          class="condition-card__adder"
          :data-testid="`clause-adder-${side}`"
        >
          <h4 class="condition-card__adder-title">
            加一條條件
          </h4>

          <p
            v-if="sourceLabels.length === 0"
            class="condition-card__note"
          >
            先在訊號來源那張卡加一個，這裡才挑得到。
          </p>
          <p
            v-else-if="unplacedLabels.length === 0"
            class="condition-card__note"
          >
            每個訊號來源都已經在這張卡上了——一個來源在同一張卡上只出現一次。
          </p>

          <div
            v-else
            class="condition-card__adder-fields"
          >
            <FormField label="來源">
              <AppSelect
                :model-value="addingSource"
                :data-testid="`clause-source-${side}`"
                @update:model-value="label => chosenSource = label"
              >
                <option
                  v-for="label in unplacedLabels"
                  :key="label"
                  :value="label"
                >
                  {{ label }}
                </option>
              </AppSelect>
            </FormField>

            <span class="condition-card__adder-relation">{{ board.relationWord }}</span>

            <FormField label="信號">
              <AppSelect
                v-model="chosenSignal"
                :data-testid="`clause-signal-${side}`"
              >
                <option
                  v-for="signalOption in signalOptions"
                  :key="signalOption.value"
                  :value="signalOption.value"
                >
                  {{ signalOption.label }}
                </option>
              </AppSelect>
            </FormField>

            <AppButton
              type="button"
              variant="secondary"
              class="condition-card__adder-confirm"
              :data-testid="`clause-confirm-${side}`"
              @click="addClause"
            >
              加上去
            </AppButton>
          </div>
        </section>

        <template #actions>
          <AppButton
            type="button"
            :data-testid="`condition-settings-done-${side}`"
            @click="close"
          >
            好了
          </AppButton>
        </template>
      </StepSettingsPanel>
    </template>
  </StepCard>
</template>

<style scoped lang="scss">
.condition-card {
  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__entry {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  // 格與格之間的那個且／或。它小、靠左、用資訊色——讀得到，但不搶條件本身。
  &__joiner {
    align-self: flex-start;
    margin-left: spacing('sm');
    color: color('info');
    font-weight: font-weight('semibold');
    font-size: font-size('xs');
  }

  // 一格就是一顆鍵：整格都按得到，按下去它的設定就打開。
  &__item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
    transition: border-color duration('fast') ease;
    cursor: pointer;
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface-raised');
    padding: spacing('xs') spacing('sm');
    width: 100%;
    color: inherit;
    font: inherit;
    text-align: left;

    @include tap-target;
    @include focus-ring;

    &:hover {
      border-color: color('border-strong');
    }
  }

  // 扣在一起的那幾條左邊多一道強調色——那一道就是「A 而且（B 或 C）」裡的那一對括號。
  &__item--bundle {
    border-left: 2px solid color('primary');
  }

  &__item--focused {
    border-color: color('primary');
  }

  &__bundle-tag {
    @include dense-label;
  }

  &__add {
    align-self: flex-start;
  }

  // 整張讀成一句話——設定打開時先看到的就是它現在在說什麼。
  &__read-out {
    margin: 0;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('xs') spacing('sm');
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__editor,
  &__adder {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
  }

  &__piece {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    padding: spacing('xs');
  }

  &__piece-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__piece-name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
  }

  &__piece-relation {
    flex: 1;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__chips {
    display: flex;
    gap: spacing('2xs');
  }

  // 按下去用**淡底加強調色的字**，不是整塊填滿：一列三個開關並排時，
  // 三塊飽和色會讓人先看到顏色，才看到它們寫了什麼。
  &__chip {
    flex: 1;
    transition: border-color duration('fast') ease, background-color duration('fast') ease;
    cursor: pointer;
    border: 1px solid color('border-strong');
    border-radius: radius('sm');
    background-color: transparent;
    padding: spacing('2xs');
    color: color('text-muted');
    font: inherit;
    font-size: font-size('sm');

    @include tap-target;
    @include focus-ring;
  }

  &__chip--on {
    border-color: color('primary');
    background-color: color('primary-soft');
    color: color('text-strong');
    font-weight: font-weight('semibold');
  }

  &__plain-words {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__moves {
    display: flex;
    gap: spacing('2xs');
  }

  &__adder {
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }

  &__adder-title {
    margin: 0;

    @include dense-label;
  }

  &__adder-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: spacing('xs');
    align-items: end;
  }

  &__adder-relation {
    padding-bottom: spacing('xs');
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__adder-confirm {
    grid-column: 1 / -1;
  }
}
</style>
