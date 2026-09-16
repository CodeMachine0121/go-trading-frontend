<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 分子：一台機器人的信號來源這一整塊——每一個要跑哪一支、吃多粗、叫什麼、旋鈕調到多少。
//
// 它是**一個** UI 概念而不是「一列」加「一塊」：一列脫離了它所在的那一份就答不出
// 「代號有沒有重複」，而那正是這一塊要回答的事情之一。
const {
  sources, strategyOptions, intervalOptions, parameterNamesByStrategyId,
  canAdd, signalSourceLimit, usageWarnings,
} = defineProps<{
  sources: readonly StrategyBotSignalSourceDto[]
  strategyOptions: readonly { value: number, label: string }[]
  intervalOptions: readonly { value: string, label: string }[]
  /** 每一支策略宣告了哪幾個旋鈕。挑了策略才知道有哪幾格要填。 */
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  /** 還加不加得動——到了上限時新增鍵**不存在**，而不是按了才被拒。 */
  canAdd: boolean
  /**
     * 上限是多少，好在到了的時候說得出來。
     *
     * 由上面餵下來而不是元件自己去問 domain：元件只看得到 DTO 與上面給的東西，
     * 而這個數字與擋住新增的那一個必須是**同一份**——各拿各的，兩邊遲早會不一樣。
     */
  signalSourceLimit: number
  /**
     * 一支可用策略都沒有。
     *
     * 這時新增鍵按下去只會得到一個空的下拉選單——而畫面**明明知道原因**。
     * 一個知道原因卻保持沉默的畫面，是把使用者留在原地自己猜。
     */
  hasNoStrategies: boolean
  /**
     * 第幾個來源現在刪不掉，以及為什麼。
     *
     * 刪掉一個還被條件用著的來源，會讓條件指向一個不存在的代號。這裡選擇**擋住那次刪除**
     * 並說出是哪裡在用它——比默默把條件一起刪掉誠實得多。
     */
  /**
   * 哪幾個來源正被條件用著，以及被誰用著。
   *
   * 它**不擋刪除**，只在刪之前說一聲。擋住的話，一個只有一個來源、
   * 而兩棵樹都在用它的人，得先把兩棵樹拆光才換得掉那一支策略。
   * 刪掉之後那幾句會自己標成「找不到這個來源」，而且送不出去——看得見，就不必擋。
   */
  usageWarnings: Readonly<Record<number, string>>
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategy: [index: number, strategyId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
}>()

function parameterNamesOf(strategyId: number): readonly string[] {
  return parameterNamesByStrategyId[strategyId] ?? []
}

/** 沒填過的旋鈕顯示它自己的空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(source: StrategyBotSignalSourceDto, name: string): string {
  const parameterValue = source.parameterValues.find(candidate => candidate.name === name)

  return parameterValue === undefined ? '' : String(parameterValue.value)
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
  <div class="strategy-bot-signal-source-fields">
    <p
      v-if="sources.length === 0"
      class="strategy-bot-signal-source-fields__empty"
      data-testid="signal-sources-empty"
    >
      這台機器人還沒有任何信號來源。加一個之後，條件就挑得到它的代號。
    </p>

    <ul class="strategy-bot-signal-source-fields__rows">
      <li
        v-for="(source, index) in sources"
        :key="index"
        class="strategy-bot-signal-source-fields__row"
        data-testid="signal-source-row"
      >
        <div class="strategy-bot-signal-source-fields__line">
          <AppInput
            :model-value="source.label"
            type="text"
            placeholder="代號（A、B…）"
            data-testid="signal-source-label-input"
            @update:model-value="emit('changeLabel', index, String($event))"
          />

          <AppSelect
            :model-value="String(source.strategyId)"
            data-testid="signal-source-strategy-select"
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

          <AppSelect
            :model-value="source.aggregationInterval"
            data-testid="signal-source-interval-select"
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

          <AppButton
            type="button"
            variant="danger-ghost"
            :title="usageWarnings[index]"
            data-testid="signal-source-remove"
            @click="emit('remove', index)"
          >
            移除
          </AppButton>
        </div>

        <!-- 說一聲，不擋。刪掉之後那幾句自己會喊，而且送不出去。 -->
        <p
          v-if="usageWarnings[index] !== undefined"
          class="strategy-bot-signal-source-fields__blocked"
          data-testid="signal-source-usage-warning"
        >
          {{ usageWarnings[index] }}
        </p>

        <!-- 旋鈕由那支策略宣告什麼就出現什麼；沒宣告的話這一排整個不出現。 -->
        <div
          v-if="parameterNamesOf(source.strategyId).length > 0"
          class="strategy-bot-signal-source-fields__parameters"
        >
          <label
            v-for="name in parameterNamesOf(source.strategyId)"
            :key="name"
            class="strategy-bot-signal-source-fields__parameter"
          >
            <span>{{ name }}</span>
            <AppInput
              :model-value="parameterValueOf(source, name)"
              type="number"
              placeholder="用它的預設值"
              data-testid="signal-source-parameter-input"
              @update:model-value="onParameterInput(index, name, $event)"
            />
          </label>
        </div>
      </li>
    </ul>

    <!-- 一支都挑不到時說出真正的下一步，而不是給一顆通往空選單的按鈕。 -->
    <p
      v-if="hasNoStrategies"
      class="strategy-bot-signal-source-fields__empty"
      data-testid="signal-sources-no-strategies"
    >
      你還沒有任何訊號種類的策略——有別種的也挑不到，因為機器人只聽得懂
      買入、賣出、持有。先去策略庫寫一支訊號種類的，這裡就挑得到它了。
    </p>

    <!--
      到了上限時說出上限。少了這一句，那顆消失的按鈕與上面「一支訊號策略都沒有」
      那一種消失長得一模一樣——而兩者要做的事完全不同。
    -->
    <p
      v-else-if="!canAdd"
      class="strategy-bot-signal-source-fields__empty"
      data-testid="signal-sources-at-limit"
    >
      一台機器人的信號來源上限是 {{ signalSourceLimit }} 個。要再加一個，
      得先移除其中一個。
    </p>

    <AppButton
      v-else
      type="button"
      variant="secondary"
      class="strategy-bot-signal-source-fields__add"
      data-testid="signal-source-add"
      @click="emit('add')"
    >
      ＋ 加一個信號來源
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-signal-source-fields {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    padding: spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background: color('surface-muted');
  }

  &__line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: spacing('2xs');
  }

  &__blocked {
    margin: 0;
    color: color('warning');
    font-size: font-size('sm');
  }

  &__parameters {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
  }

  &__parameter {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    color: color('text-muted');
    font-size: font-size('sm');
  }

  // 加一個是偶爾才做一次的事，不必是一顆橫跨整個寬度的按鈕。
  &__add {
    align-self: start;
  }
}
</style>
