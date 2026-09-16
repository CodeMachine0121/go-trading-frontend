<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import StrategyBotSignalSourceFields from '~/components/molecules/StrategyBotSignalSourceFields.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import StrategyBotBlockDock from '~/components/organisms/StrategyBotBlockDock.vue'
import StrategyBotConditionTree from '~/components/organisms/StrategyBotConditionTree.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的整個工作台。
//
// 它**不知道自己是在新增還是在改**——收到一台機器人（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 版面是兩欄：左邊是準備材料（這台是什麼、它聽哪幾支策略），右邊是拼。
// 兩棵樹上下排在同一欄裡，**同時看得見**——一台機器人的買入與賣出同時成立時它什麼都不會說，
// 而那件事只有在兩棵並排時才看得出來。
const { editing, strategyOptions, saving, failureMessage } = defineProps<{
  /** 有值就是改那一台，沒有就是新的一台。 */
  editing: StrategyBotDto | null
  tradingSymbolApplication: TradingSymbolApplication
  strategyOptions: readonly { value: number, label: string }[]
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  saving: boolean
  /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
  failureMessage: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [writeDto: StrategyBotWriteDto]
  /** 這一頁被改過了沒有——離開前要不要問，由上面那一層決定。 */
  dirtyChange: [dirty: boolean]
}>()

const form = useStrategyBotForm(
  () => editing,
  () => strategyOptions,
)

form.reset()

/**
 * 這一頁被改過了沒有。
 *
 * 比的是**現在要送出去的那一份**與**剛打開時的那一份**，而不是「有沒有碰過鍵盤」：
 * 打了一個字再刪掉，什麼都沒改，不該為此攔人一次。
 */
const pristine = JSON.stringify(form.toWriteDto() ?? form.rejection.value)
watchEffect(() => {
  emit('dirtyChange', JSON.stringify(form.toWriteDto() ?? form.rejection.value) !== pristine)
})

function onSave() {
  const writeDto = form.toWriteDto()
  if (writeDto !== null) {
    emit('save', writeDto)
  }
}
</script>

<template>
  <div class="workbench">
    <div class="workbench__columns">
      <!-- 左欄：準備材料。 -->
      <div class="workbench__materials">
        <AppPanel title="這台機器人是什麼">
          <div class="workbench__identity">
            <AppInput
              v-model="form.name.value"
              type="text"
              placeholder="機器人名稱"
              data-testid="bot-name-input"
            />
            <AppInput
              v-model="form.triggerIntervalText.value"
              type="number"
              inputmode="numeric"
              placeholder="每隔幾分鐘"
              data-testid="bot-interval-input"
            />
            <SymbolField
              v-model="form.symbol.value"
              :trading-symbol-application="tradingSymbolApplication"
            />
          </div>
        </AppPanel>

        <AppPanel title="它要聽哪幾支策略">
          <StrategyBotSignalSourceFields
            :sources="form.signalSources.value"
            :strategy-options="strategyOptions"
            :interval-options="form.intervalOptions"
            :parameter-names-by-strategy-id="parameterNamesByStrategyId"
            :can-add="form.canAddSignalSource.value"
            :signal-source-limit="form.signalSourceLimit"
            :has-no-strategies="strategyOptions.length === 0"
            :usage-warnings="form.signalSourceUsageWarnings.value"
            @add="form.addSignalSource"
            @remove="form.removeSignalSource"
            @change-label="form.changeSignalSourceLabel"
            @change-strategy="form.changeSignalSourceStrategy"
            @change-interval="form.changeSignalSourceInterval"
            @change-parameter-value="form.changeSignalSourceParameterValue"
          />
        </AppPanel>
      </div>

      <!-- 右欄：拼。兩棵樹上下排，同時看得見。 -->
      <div class="workbench__trees">
        <AppPanel
          v-for="side in form.conditionSides"
          :key="side.key"
          :title="side.heading"
        >
          <!--
            拖著樹上的一塊時才出現的那一格。它只在有東西可以丟的時候在，
            因為一個永遠掛在那裡的垃圾桶，多數時間只是一塊佔著位子的紅色。
          -->
          <div
            v-if="side.isDraggingOwnNode.value"
            class="workbench__bin"
            :data-testid="`${side.key}-bin`"
            @dragover.prevent="undefined"
            @drop.prevent="side.dropAwayDragged"
          >
            拖到這裡丟掉
          </div>

          <StrategyBotConditionTree
            :node="side.view.value"
            :source-labels="form.sourceLabels.value"
            :signal-options="form.signalOptions"
            :selected-hole-key="side.selectedHoleKey.value"
            :drag-active="form.dragging.value !== null"
            :accepts-dragged="side.acceptsDragged"
            @select-hole="side.selectHole"
            @drop-at="side.dropDragged"
            @change-operator="side.changeOperator"
            @change-comparison="side.changeComparison"
            @remove="side.remove"
            @drag-node="nodeId => form.startDraggingNode(side.key, nodeId)"
            @drag-end="form.stopDragging"
          />
        </AppPanel>
      </div>
    </div>

    <!--
      抽屜貼在畫面右緣，不在版面裡：待在版面裡的話它會被樹推走——
      條件愈拼愈長，它就愈往下掉，偏偏它是每一步都要用到的東西。
      兩棵樹共用同一個，所以它也不能長在任何一棵裡面。
    -->
    <StrategyBotBlockDock
      :drawer="form.blockDrawer.value"
      :drag-active="form.dragging.value !== null"
      :hole-selected="form.selectedHole.value !== null"
      @pick="option => form.conditionSides.find(
        side => side.key === form.selectedHole.value?.side)?.fill(
        form.selectedHole.value!.hole, option.block)"
      @drag-start="option => form.startDraggingBlock(option.block)"
      @drag-end="form.stopDragging"
    />

    <AppAlert
      v-if="form.rejection.value !== null"
      tone="warning"
      data-testid="bot-form-rejection"
    >
      {{ form.rejection.value }}
    </AppAlert>

    <AppAlert
      v-else-if="failureMessage !== ''"
      tone="danger"
      data-testid="bot-form-failure"
    >
      {{ failureMessage }}
    </AppAlert>

    <div class="workbench__actions">
      <AppButton
        type="button"
        variant="ghost"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <AppButton
        type="button"
        :disabled="saving || form.rejection.value !== null"
        data-testid="bot-form-save"
        @click="onSave"
      >
        {{ saving ? '儲存中…' : '儲存' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workbench {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  // 右緣留一條給那個把手。它是 fixed 的，所以不會自己把版面推開——
  // 不留的話它會正好蓋在最右邊那一欄的控制項上。
  padding-right: spacing('lg');

  &__columns {
    display: grid;

    // 窄畫面一欄：兩欄擠在手機上，拼的那一欄會窄到第三層縮排就沒地方了。
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('lg') {
      // 拼的那一欄寬一些：巢狀三層之後，縮排本身就吃掉不少寬度。
      grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    }
  }

  &__materials,
  &__trees {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    min-width: 0;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__bin {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: spacing('2xs');
    border: 1px dashed color('danger');
    border-radius: radius('sm');
    background-color: color('danger-soft');
    padding: spacing('2xs');
    color: color('danger');
    font-size: font-size('2xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
