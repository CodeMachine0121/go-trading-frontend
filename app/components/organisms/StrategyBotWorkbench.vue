<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import StrategyBotAssembly from '~/components/organisms/StrategyBotAssembly.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的整個工作台。
//
// 它**不知道自己是在新增還是在改**——收到一台機器人（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 整頁只有兩塊：一列「這台機器人是什麼」，和底下那個**拼零件的地方**。
//
// 這裡試過表單、試過樹、試過抽屜、試過矩陣，每一版都被同一句話擋回來：
// 「這就是區塊換位置而已」。那句話是對的——那幾版都是把下拉選單重新排列。
//
// 現在它是**零件與槽**：一句判斷由三塊扣起來（⬢策略⬢ 是 ⬢信號⬢），
// 從下面的零件盤點一塊，它落進上面空著的槽，兩個槽滿了就咔一下接進堆疊。
// 條件這一區裡一個下拉選單都沒有，因為**下拉選單是在填表，掉進槽裡的零件是在組裝**。
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

    <StrategyBotAssembly
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
