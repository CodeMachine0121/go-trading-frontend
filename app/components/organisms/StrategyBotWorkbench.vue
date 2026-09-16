<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import StrategyBotConditionTree from '~/components/organisms/StrategyBotConditionTree.vue'
import StrategyBotPalette from '~/components/organisms/StrategyBotPalette.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的整個工作台。
//
// 它**不知道自己是在新增還是在改**——收到一台機器人（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 版面分成兩段：上面準備材料（這台是什麼、它聽哪幾支策略），下面是拼。
//
// 拼的那一段是**積木抽屜 ＋ 工作區**並排，而抽屜**一直在那裡、不會自己收起來**。
// 這是積木式編輯器的既有做法：Scratch 的積木面板固定在左側，Blockly 的 toolbox
// 也是「always displayed」。中間試過讓它滑過去才出現，那是錯的——
// 那個模式在選單設計上早有定論：使用者失去控制權（他沒打算打開，它自己開了），
// 而且用鍵盤與觸控的人根本碰不到。
//
// 抽屜是**黏住的**：它不隨著樹愈拼愈長而被推走，但它也沒有離開版面——
// 它就在那裡，只是不會被捲出畫面。
//
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
    <!--
      這台機器人是什麼：一列就夠。它填一次就不會再動，所以不該佔著畫面——
      而**拼**這件事會做上半小時。
    -->
    <div class="workbench__identity">
      <AppInput
        v-model="form.name.value"
        type="text"
        placeholder="機器人名稱"
        data-testid="bot-name-input"
      />
      <SymbolField
        v-model="form.symbol.value"
        :trading-symbol-application="tradingSymbolApplication"
      />
      <label class="workbench__interval">
        <span class="workbench__interval-name">每隔幾分鐘</span>
        <AppInput
          v-model="form.triggerIntervalText.value"
          type="number"
          inputmode="numeric"
          placeholder="5"
          data-testid="bot-interval-input"
        />
      </label>
    </div>

    <div class="workbench__building">
      <!--
        左邊是手上有哪些積木——**信號來源就是積木**，不是另外一份清單。
      -->
      <div class="workbench__palette">
        <StrategyBotPalette
          :sources="form.signalSources.value"
          :block-drawer="form.blockDrawer.value"
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
          @pick="option => form.conditionSides.find(
            side => side.key === form.selectedHole.value?.side)?.fill(
            form.selectedHole.value!.hole, option.block)"
          @drag-start="option => form.startDraggingBlock(option.block)"
          @drag-end="form.stopDragging"
        />
      </div>

      <!-- 右邊是拼的地方。兩棵樹上下排，同時看得見。 -->
      <div class="workbench__trees">
        <AppPanel
          v-for="side in form.conditionSides"
          :key="side.key"
          :title="side.heading"
        >
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

  &__identity {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('sm');

    @include respond-to('md') {
      // 一列：名稱、標的、間隔。填一次就不會再動的東西不該佔著高度。
      grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr);
      align-items: end;
    }
  }

  &__interval {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__interval-name {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__building {
    display: grid;

    // 窄畫面時積木排在拼的地方上面：積木在手邊，不是要捲到底才拿得到。
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('lg') {
      // 積木式編輯器一向如此：積木在左，拼的地方在右。
      grid-template-columns: 280px minmax(0, 1fr);
    }
  }

  &__palette {
    min-width: 0;

    @include respond-to('lg') {
      // **黏住**：這就是「被愈拼愈長的樹推走」真正的答案——不是把它藏起來，
      // 是讓它不隨著樹愈長而捲出畫面。
      position: sticky;
      top: spacing('sm');
      max-height: calc(100vh - #{spacing('lg')});
      overflow-y: auto;
    }
  }

  &__trees {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    min-width: 0;
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
