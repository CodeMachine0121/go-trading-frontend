<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import StrategyBotConditionHole from '~/components/molecules/StrategyBotConditionHole.vue'
import type { ConditionNodeViewDto } from '~/domain/models/dto/condition-node-view-dto'
import type { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'

// 有機體：一棵條件樹的一格，會呼叫自己來畫底下那幾格。
//
// **自己呼叫自己**是這個元件唯一合理的形狀：條件是遞迴的，
// 而一個用迴圈攤平的畫法得先知道最多幾層，那個數字遲早會跟規則對不上。
//
// 它**一個判斷都不做**。哪一格是洞、哪一塊有問題、哪一塊拿不拿得掉，
// 收到的形狀裡都寫好了——上一版的編輯器自己在算加不加得動，
// 而那幾個判斷跟 domain 裡的規則是同一件事寫了兩次。
const { node, sourceLabels, signalOptions, selectedHoleKey, dragActive } = defineProps<{
  node: ConditionNodeViewDto
  /** 一句比對挑得到的來源。它由第二段填出來，所以由上面傳下來。 */
  sourceLabels: readonly string[]
  signalOptions: readonly { value: string, label: string }[]
  /** 使用者現在選著的空位。不在這一棵上時是 null。 */
  selectedHoleKey: string | null
  dragActive: boolean
  /** 這個空位收不收現在拖著的東西。問的是 domain，這裡只是把答案帶下去。 */
  acceptsDragged: (hole: ConditionHoleVo) => boolean
}>()

const emit = defineEmits<{
  selectHole: [hole: ConditionHoleVo]
  dropAt: [hole: ConditionHoleVo]
  changeOperator: [nodeId: string, operator: ConditionOperatorVo]
  changeComparison: [nodeId: string, sourceLabel: string, signal: string]
  remove: [nodeId: string]
  dragNode: [nodeId: string]
  dragEnd: []
}>()

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/**
 * 一句比對指到的來源不在清單上時，仍然要**看得見它是誰**。
 *
 * 選單裡沒有它的話，那一格會顯示成另一個來源的名字，而使用者以為自己讀到的是真的。
 */
const sourceOptions = computed(() => (
  node.sourceLabel !== '' && !sourceLabels.includes(node.sourceLabel)
    ? [node.sourceLabel, ...sourceLabels]
    : sourceLabels
))

/**
 * 選單交出來的是一串字，而運算子只有兩個值。
 *
 * 在這裡收窄而不是讓它一路往上，是因為這個元件擁有那個選單——它知道裡面放了哪幾個選項。
 * 往上傳一串字的話，收的那一端得再認一次那兩個值是哪兩個，而它並沒有看過那份選單。
 */
function onOperatorChange(nodeId: string, chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeOperator', nodeId, operator)
  }
}

function onDragStart(event: DragEvent, nodeId: string) {
  event.dataTransfer?.setData('text/plain', nodeId)
  emit('dragNode', nodeId)
}
</script>

<template>
  <StrategyBotConditionHole
    v-if="node.kind === 'hole' && node.hole !== null"
    :selected="selectedHoleKey === node.hole.key"
    :accepts-dragged="dragActive && acceptsDragged(node.hole)"
    :drag-active="dragActive"
    @select="emit('selectHole', node.hole!)"
    @drop="emit('dropAt', node.hole!)"
  />

  <div
    v-else
    class="condition-node"
    :class="[
      `condition-node--${node.kind}`,
      node.status !== 'ok' ? `condition-node--${node.status}` : '',
    ]"
    :draggable="true"
    :data-testid="`condition-${node.kind}`"
    @dragstart.stop="onDragStart($event, node.nodeId)"
    @dragend.stop="emit('dragEnd')"
  >
    <div class="condition-node__line">
      <!--
        拖曳握把是一個看得見的東西，因為「這一塊搬得動」不寫出來就沒有人會去試。
        它不是按鈕：按下去什麼都不會發生，它只是抓的地方。
      -->
      <span
        class="condition-node__grip"
        aria-hidden="true"
      >⠿</span>

      <AppSelect
        v-if="node.kind === 'group'"
        :model-value="node.operator ?? 'and'"
        :data-testid="`operator-${node.nodeId}`"
        @update:model-value="onOperatorChange(node.nodeId, $event)"
      >
        <option
          v-for="option in operatorOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </AppSelect>

      <template v-else>
        <AppSelect
          :model-value="node.sourceLabel"
          :invalid="node.status !== 'ok'"
          :data-testid="`source-${node.nodeId}`"
          @update:model-value="emit('changeComparison', node.nodeId, $event, node.signal)"
        >
          <option
            v-if="node.sourceLabel === ''"
            value=""
          >
            挑一個來源
          </option>
          <option
            v-for="label in sourceOptions"
            :key="label"
            :value="label"
          >
            {{ label }}
          </option>
        </AppSelect>

        <span class="condition-node__equals">等於</span>

        <AppSelect
          :model-value="node.signal"
          :invalid="node.status !== 'ok'"
          :data-testid="`signal-${node.nodeId}`"
          @update:model-value="emit('changeComparison', node.nodeId, node.sourceLabel, $event)"
        >
          <option
            v-if="node.signal === ''"
            value=""
          >
            挑一個信號
          </option>
          <option
            v-for="option in signalOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </AppSelect>
      </template>

      <AppButton
        v-if="node.removable"
        variant="danger-ghost"
        size="small"
        type="button"
        :data-testid="`remove-${node.nodeId}`"
        @click="emit('remove', node.nodeId)"
      >
        移除
      </AppButton>
    </div>

    <!--
      兩種壞法各自的說法都在收到的形狀裡了，這裡只負責把它畫在它說的那一塊旁邊——
      集中在頁面頂端列出來的話，使用者還得自己找是哪一塊。
    -->
    <p
      v-if="node.statusText !== ''"
      class="condition-node__status"
      :data-testid="`status-${node.nodeId}`"
    >
      {{ node.statusText }}
    </p>

    <ul
      v-if="node.children.length > 0"
      class="condition-node__children"
    >
      <li
        v-for="child in node.children"
        :key="child.key"
      >
        <StrategyBotConditionTree
          :node="child"
          :source-labels="sourceLabels"
          :signal-options="signalOptions"
          :selected-hole-key="selectedHoleKey"
          :drag-active="dragActive"
          :accepts-dragged="acceptsDragged"
          @select-hole="emit('selectHole', $event)"
          @drop-at="emit('dropAt', $event)"
          @change-operator="(nodeId, operator) => emit('changeOperator', nodeId, operator)"
          @change-comparison="(nodeId, label, signal) =>
            emit('changeComparison', nodeId, label, signal)"
          @remove="emit('remove', $event)"
          @drag-node="emit('dragNode', $event)"
          @drag-end="emit('dragEnd')"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.condition-node {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  border: 1px solid color('border');
  border-radius: radius('sm');
  background-color: color('surface-raised');
  padding: spacing('2xs');

  &__line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__grip {
    cursor: grab;
    color: color('text-muted');
    font-size: font-size('xs');
    line-height: 1;
  }

  &__equals {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__status {
    margin: 0;
    color: color('warning');
    font-size: font-size('2xs');
  }

  &__children {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');

    // 左邊那條線就是巢狀的深度。縮排靠它而不是靠空白，
    // 因為空白在三層之後就數不出來了。
    margin: 0;
    border-left: 2px solid color('border');
    padding: 0 0 0 spacing('xs');
    list-style: none;
  }

  // 兩類邊色沿用抽屜：拖著的那一塊與它落下去之後的樣子要看得出是同一種東西。
  &--group {
    border-left: 2px solid color('accent');
  }

  &--comparison {
    border-left: 2px solid color('info');
  }

  &--incomplete {
    border-color: color('warning');
  }

  // 有東西壞了，跟還沒做完不是同一種——使用者的下一步不一樣。
  &--unknownSource {
    border-color: color('danger');

    .condition-node__status {
      color: color('danger');
    }
  }
}
</style>
