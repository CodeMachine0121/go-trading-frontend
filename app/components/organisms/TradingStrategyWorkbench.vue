<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import TradingStrategyCanvas from '~/components/organisms/TradingStrategyCanvas.vue'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { useTradingStrategyForm } from '~/composables/use-trading-strategy-form'

// 有機體：拼一份交易策略的整個工作台。
//
// 它**不知道自己是在新增還是在改**——收到一份交易策略（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 整頁只有兩塊：一格名稱，和底下那張**工作檯**。
//
// 交易標的與觸發間隔不在這裡：那兩樣說的是「哪一台機器、盯哪裡、多久看一次」，
// 是機器的事。分開之後，同一份規則才能被好幾台機器人同時用。
//
// 這裡試過表單、樹、抽屜、矩陣、以及一個點兩下就拼好的零件盤，
// 每一版得到的評語都一樣：「區塊換位置而已」。那是對的——那幾版真正在做的事
// 都是「填欄位」，只是欄位排得不同。
//
// 工作檯做的是**搬東西**：左邊一個零件架，右邊兩張墊子（買入、賣出）。
// 把零件拖上墊子、在墊子之間搬、拖回架子就收走。墊子上的順序是使用者自己排的，
// 而且會被存下來——樹的子節點本來就有順序，所以那不是一個假的自由度。
const { editing, strategyScriptOptions, saving, failureMessage } = defineProps<{
  /** 有值就是改那一份，沒有就是新的一份。 */
  editing: TradingStrategyDto | null
  strategyScriptOptions: readonly { value: number, label: string }[]
  parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
  saving: boolean
  /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
  failureMessage: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [writeDto: TradingStrategyWriteDto]
  /** 這一頁被改過了沒有——離開前要不要問，由上面那一層決定。 */
  dirtyChange: [dirty: boolean]
}>()

const form = useTradingStrategyForm(
  () => editing,
  () => strategyScriptOptions,
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

/**
 * 這一份讀進來時原本用了不只一種刻度。
 *
 * 只在這種時候說話。原本就一致的那一份什麼都不必提——
 * 一句永遠都在的提醒，讀久了就等於不在。
 */
const loadedMixedIntervals = computed(
  () => (form.loadedAggregationIntervals.value.length > 1
    ? form.loadedAggregationIntervals.value.join('、')
    : ''))

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
      這份交易策略叫什麼：一格就夠。它填一次就不會再動，所以不該佔著畫面——
      而**拼**這件事會做上半小時。
    -->
    <div class="workbench__identity">
      <AppInput
        v-model="form.name.value"
        type="text"
        placeholder="交易策略名稱"
        data-testid="trading-strategy-name-input"
      />

      <!--
        刻度是**一份交易策略的一格**，不是一塊零件一個。
        「一小時的那一棒」與「五分鐘的那一棒」不是同一根，所以幾個來源看不同粗細時，
        條件樹會把兩個時間軸上的意見當成同一棒的兩句話來讀。
        挑在這裡，那種組合就拼不出來——不必再有一句紅字去攔它。
      -->
      <label class="workbench__coarseness">
        <span class="workbench__coarseness-name">看多粗的 K 線</span>
        <AppSelect
          v-model="form.aggregationInterval.value"
          data-testid="trading-strategy-interval-select"
        >
          <option
            v-for="intervalOption in form.intervalOptions"
            :key="intervalOption.value"
            :value="intervalOption.value"
          >
            {{ intervalOption.label }}
          </option>
        </AppSelect>
      </label>
    </div>

    <!--
      存在這條規則之前存下來的那些沒有正確答案可以挑，所以取第一個——
      而讓那個任意的選擇可以被接受的不是選法，是說出來。悄悄統一才是糟糕的做法：
      他按下儲存，另外幾個零件被改掉，而他不會發現。
    -->
    <AppAlert
      v-if="loadedMixedIntervals !== ''"
      tone="info"
      data-testid="trading-strategy-mixed-interval-note"
    >
      這一份原本的幾個零件看的是 {{ loadedMixedIntervals }}，粗細不一樣。
      一份交易策略只看一種——存下去之後，每一個零件都會變成上面選的那一個。
    </AppAlert>

    <TradingStrategyCanvas
      :sources="form.signalSources.value"
      :buy-board="form.conditionSides[0].board.value"
      :sell-board="form.conditionSides[1].board.value"
      :strategy-script-options="strategyScriptOptions"
      :parameter-names-by-strategy-script-id="parameterNamesByStrategyScriptId"
      :can-add="form.canAddSignalSource.value"
      :signal-source-limit="form.signalSourceLimit"
      :has-no-strategy-scripts="strategyScriptOptions.length === 0"
      @add="form.addSignalSource"
      @remove="form.removeSignalSource"
      @change-label="form.changeSignalSourceLabel"
      @change-strategy-script="form.changeSignalSourceStrategyScript"
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
      data-testid="trading-strategy-form-rejection"
    >
      {{ form.rejection.value }}
    </AppAlert>

    <AppAlert
      v-else-if="failureMessage !== ''"
      tone="danger"
      data-testid="trading-strategy-form-failure"
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
        data-testid="trading-strategy-form-save"
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

    // 名稱吃剩下的寬度，刻度那一格只佔它需要的——它是一個六選一的選單，
    // 拉滿一整行只會讓人以為那裡還有別的東西要填。
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('sm');
  }

  &__coarseness {
    display: grid;
    gap: spacing('3xs');
  }

  &__coarseness-name {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
