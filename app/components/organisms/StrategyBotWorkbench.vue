<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import StrategyBotCanvas from '~/components/organisms/StrategyBotCanvas.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的整個工作台。
//
// 它**不知道自己是在新增還是在改**——收到一台機器人（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 整頁只有兩塊：一列「這台機器人是什麼」，和底下那張**工作檯**。
//
// 這裡試過表單、樹、抽屜、矩陣、以及一個點兩下就拼好的零件盤，
// 每一版得到的評語都一樣：「區塊換位置而已」。那是對的——那幾版真正在做的事
// 都是「填欄位」，只是欄位排得不同。
//
// 工作檯做的是**搬東西**：左邊一個零件架，右邊兩張墊子（買入、賣出）。
// 把零件拖上墊子、在墊子之間搬、拖回架子就收走。墊子上的順序是使用者自己排的，
// 而且會被存下來——樹的子節點本來就有順序，所以那不是一個假的自由度。
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

    <StrategyBotCanvas
      :sources="form.signalSources.value"
      :buy-matrix="form.conditionSides[0].matrix.value"
      :sell-matrix="form.conditionSides[1].matrix.value"
      :strategy-options="strategyOptions"
      :interval-options="form.intervalOptions"
      :parameter-names-by-strategy-id="parameterNamesByStrategyId"
      :can-add="form.canAddSignalSource.value"
      :signal-source-limit="form.signalSourceLimit"
      :has-no-strategies="strategyOptions.length === 0"
      @add="form.addSignalSource"
      @remove="form.removeSignalSource"
      @change-label="form.changeSignalSourceLabel"
      @change-strategy="form.changeSignalSourceStrategy"
      @change-interval="form.changeSignalSourceInterval"
      @change-parameter-value="form.changeSignalSourceParameterValue"
      @toggle-signal="(side, sourceLabel, signal) => form.conditionSides.find(
        candidate => candidate.key === side)?.toggleSignal(sourceLabel, signal)"
      @place="(side, sourceLabel, position) => form.conditionSides.find(
        candidate => candidate.key === side)?.placeAt(sourceLabel, position)"
      @take-off="(side, sourceLabel) => form.conditionSides.find(
        candidate => candidate.key === side)?.takeOff(sourceLabel)"
      @bundle-onto="(side, sourceLabel, targetLabel) => form.conditionSides.find(
        candidate => candidate.key === side)?.bundleOnto(sourceLabel, targetLabel)"
      @unbundle="(side, sourceLabel) => form.conditionSides.find(
        candidate => candidate.key === side)?.unbundle(sourceLabel)"
      @change-bundle-operator="(side, itemKey, operator) => form.conditionSides.find(
        candidate => candidate.key === side)?.changeBundleOperator(itemKey, operator)"
      @change-operator="(side, operator) => form.conditionSides.find(
        candidate => candidate.key === side)?.changeOperator(operator)"
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

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
