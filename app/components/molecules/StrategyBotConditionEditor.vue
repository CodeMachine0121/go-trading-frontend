<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'

// 分子：**一個**條件節點——一句比對，或一個裝著別的條件的群組。
//
// 它會自己畫自己的子條件，因為巢狀在畫面上是縮排、在程式裡就是遞迴。
// 用任何非遞迴的方式寫它，都會在「第三層」那一刀崩掉。
//
// 終止條件在資料上而不是在深度計數上：一句比對沒有子條件，所以遞迴自然停住。
//
// 它不判斷任何事——加不加得動、刪不刪得掉都由上面算好傳下來。一個自己判斷規則的
// 節點，會讓同一條規則在每一層各有一份看法。
const { condition, sourceLabels, signalOptions, canAddComparison, canAddGroup, canWrapInGroup, removableNodeIds }
  = defineProps<{
    condition: StrategyBotConditionDto
    /** 這台機器人宣告過的每一個代號。選單裡只有它們——指到沒宣告的代號因此打不出來。 */
    sourceLabels: readonly string[]
    signalOptions: readonly { value: string, label: string }[]
    /**
   * 三個動作各自加不加得動。
   *
   * 三個而不是一個，是因為它們長出來的東西不一樣大：一句比對是一層一個節點，
   * 一個群組一出生就帶兩句（兩層三個節點），包成群組是一層兩個節點。
   */
    canAddComparison: (nodeId: string) => boolean
    canAddGroup: (nodeId: string) => boolean
    canWrapInGroup: (nodeId: string) => boolean
    /** 拿得掉的那幾個節點。剩兩句的群組裡那幾句不在裡面，所以它們的刪除鍵不存在。 */
    removableNodeIds: readonly string[]
  }>()

const emit = defineEmits<{
  addComparison: [parentNodeId: string]
  addGroup: [parentNodeId: string]
  changeOperator: [nodeId: string, operator: ConditionOperatorVo]
  changeComparison: [nodeId: string, sourceLabel: string, signal: string]
  wrapInGroup: [nodeId: string]
  remove: [nodeId: string]
}>()

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

function isRemovable(nodeId: string): boolean {
  return removableNodeIds.includes(nodeId)
}
</script>

<template>
  <!-- 群組：左上角一個運算子，底下縮排一格裝著它管的那幾句。 -->
  <div
    v-if="condition.isGroup"
    class="strategy-bot-condition strategy-bot-condition--group"
    data-testid="condition-group"
  >
    <div class="strategy-bot-condition__head">
      <AppSelect
        :model-value="condition.operator ?? 'and'"
        data-testid="condition-operator-select"
        @update:model-value="emit('changeOperator', condition.nodeId, $event as ConditionOperatorVo)"
      >
        <option
          v-for="operatorOption in operatorOptions"
          :key="operatorOption.value"
          :value="operatorOption.value"
        >
          {{ operatorOption.label }}
        </option>
      </AppSelect>

      <div class="strategy-bot-condition__actions">
        <AppButton
          v-if="canAddComparison(condition.nodeId)"
          type="button"
          data-testid="condition-add-comparison"
          @click="emit('addComparison', condition.nodeId)"
        >
          ＋ 一句比對
        </AppButton>
        <AppButton
          v-if="canAddGroup(condition.nodeId)"
          type="button"
          data-testid="condition-add-group"
          @click="emit('addGroup', condition.nodeId)"
        >
          ＋ 一個群組
        </AppButton>
        <AppButton
          v-if="isRemovable(condition.nodeId)"
          type="button"
          data-testid="condition-remove"
          @click="emit('remove', condition.nodeId)"
        >
          移除
        </AppButton>
      </div>
    </div>

    <!--
      子條件用這個元件自己畫。縮排靠的是巢狀本身的邊線與左邊距，
      不是一個算出來的深度——算出來的話，搬動一整支子樹就得重算每一層。
    -->
    <ul class="strategy-bot-condition__children">
      <li
        v-for="child in condition.conditions"
        :key="child.nodeId"
      >
        <StrategyBotConditionEditor
          :condition="child"
          :source-labels="sourceLabels"
          :signal-options="signalOptions"
          :can-add-comparison="canAddComparison"
          :can-add-group="canAddGroup"
          :can-wrap-in-group="canWrapInGroup"
          :removable-node-ids="removableNodeIds"
          @add-comparison="emit('addComparison', $event)"
          @add-group="emit('addGroup', $event)"
          @change-operator="(nodeId, operator) => emit('changeOperator', nodeId, operator)"
          @change-comparison="(nodeId, label, signal) => emit('changeComparison', nodeId, label, signal)"
          @wrap-in-group="emit('wrapInGroup', $event)"
          @remove="emit('remove', $event)"
        />
      </li>
    </ul>
  </div>

  <!--
    一句比對：兩個下拉選單加一個固定的「等於」。
    「等於」是文字不是選單——沒有第二種比對方式，做成選單只會讓人以為有。
  -->
  <div
    v-else
    class="strategy-bot-condition strategy-bot-condition--comparison"
    data-testid="condition-comparison"
  >
    <AppSelect
      :model-value="condition.sourceLabel"
      data-testid="condition-source-select"
      @update:model-value="emit('changeComparison', condition.nodeId, String($event), condition.signal)"
    >
      <option
        v-for="sourceLabel in sourceLabels"
        :key="sourceLabel"
        :value="sourceLabel"
      >
        {{ sourceLabel }}
      </option>
    </AppSelect>

    <span class="strategy-bot-condition__equals">等於</span>

    <AppSelect
      :model-value="condition.signal"
      data-testid="condition-signal-select"
      @update:model-value="emit('changeComparison', condition.nodeId, condition.sourceLabel, String($event))"
    >
      <option
        v-for="signalOption in signalOptions"
        :key="signalOption.value"
        :value="signalOption.value"
      >
        {{ signalOption.label }}
      </option>
    </AppSelect>

    <div class="strategy-bot-condition__actions">
      <!--
        把這一句包成群組。原來那一句**留在新群組裡**——
        使用者要的是「再加一個條件」，不是「把剛剛填的丟掉重來」。
      -->
      <AppButton
        v-if="canWrapInGroup(condition.nodeId)"
        type="button"
        data-testid="condition-wrap-in-group"
        @click="emit('wrapInGroup', condition.nodeId)"
      >
        ＋ 再加一個條件
      </AppButton>
      <AppButton
        v-if="isRemovable(condition.nodeId)"
        type="button"
        data-testid="condition-remove"
        @click="emit('remove', condition.nodeId)"
      >
        移除
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-condition {
  display: flex;
  gap: spacing('xs');

  &--group {
    flex-direction: column;
    padding: spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background: color('surface-muted');
  }

  &--comparison {
    align-items: center;
    flex-wrap: wrap;
    padding: spacing('2xs') spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background: color('surface');
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: spacing('xs');
    flex-wrap: wrap;
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
    margin-left: auto;
  }

  &__equals {
    color: color('text-muted');
    font-size: font-size('sm');
  }

  // 縮排就是巢狀。左邊那條線把同一層框起來，讓「這幾句是這個運算子管的」看得出來——
  // 沒有它的話，深兩層以上就只剩一堆對不齊的框。
  &__children {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: spacing('2xs') 0 0;
    padding: 0 0 0 spacing('md');
    border-left: 2px solid color('border-strong');
    list-style: none;
  }
}
</style>
