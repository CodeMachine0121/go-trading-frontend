<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppRadio from '~/components/atoms/AppRadio.vue'
import TradingStrategyCanvas from '~/components/organisms/TradingStrategyCanvas.vue'
import type { TradingModeOptionDto } from '~/domain/models/dto/trading-mode-option-dto'
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
// **交易模式在這裡**，而且與名稱同一列：它變的是規則的語意——同一棵條件樹在
// 「賣出＝出清回現金」與「賣出＝反手做空」兩種讀法下，講的是兩件不同的事。
//
// 這裡試過表單、樹、抽屜、矩陣、以及一個點兩下就拼好的零件盤，
// 每一版得到的評語都一樣：「區塊換位置而已」。那是對的——那幾版真正在做的事
// 都是「填欄位」，只是欄位排得不同。
//
// 工作檯做的是**搬東西**：左邊一個零件架，右邊兩張墊子（買入、賣出）。
// 把零件拖上墊子、在墊子之間搬、拖回架子就收走。墊子上的順序是使用者自己排的，
// 而且會被存下來——樹的子節點本來就有順序，所以那不是一個假的自由度。
const {
  editing,
  strategyScriptOptions,
  tradingModeOptions,
  saving,
  failureMessage,
  savedGeneration,
}
  = defineProps<{
  /** 有值就是改那一份，沒有就是新的一份。 */
    editing: TradingStrategyDto | null
    strategyScriptOptions: readonly { value: number, label: string }[]
    /** 交易模式挑得到的那兩個，各自帶著一句話說它拿賣出信號做什麼。 */
    tradingModeOptions: readonly TradingModeOptionDto[]
    parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
    /** 存在、但當不了信號來源的那幾支，以及原因。一塊指著它們的零件要說得出來。 */
    unusableStrategyScripts: Readonly<Record<number, string>>
    /** 一支都挑不到時，是哪一種挑不到。挑得到就是 `null`。 */
    shortage: 'noStrategyScripts' | 'noSignalStrategyScripts' | null
    saving: boolean
    /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
    failureMessage: string
    /** 這一份被成功存過幾次。每多一次，「打開時的樣子」就重新記一次。 */
    savedGeneration: number
  }>()

const emit = defineEmits<{
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
 * 這一組單選鈕共用的名字。
 *
 * 每個實例各不相同，理由與回測那一列相同：兩張表單若同時在頁面上，
 * 共用一個名字會讓兩邊的選項彼此互斥。
 */
const tradingModeGroupName = `trading-strategy-trading-mode-${useId()}`

/**
 * 這一頁被改過了沒有。
 *
 * 比的是**現在要送出去的那一份**與**上一次存下來的那一份**（沒存過就是剛打開時的），
 * 而不是「有沒有碰過鍵盤」：打了一個字再刪掉，什麼都沒改，不該為此攔人一次。
 *
 * 基準要跟著存成功往前走。存好之後不再離開這一頁，基準留在原地的話，
 * 他會在一個**已經存好**的頁面上被攔下來問「還沒存，確定要離開嗎」。
 */
const pristine = ref(JSON.stringify(form.toWriteDto() ?? form.rejection.value))
watch(() => savedGeneration, () => {
  pristine.value = JSON.stringify(form.toWriteDto() ?? form.rejection.value)
})
watchEffect(() => {
  emit(
    'dirtyChange',
    JSON.stringify(form.toWriteDto() ?? form.rejection.value) !== pristine.value)
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
        並排而不是下拉選單，理由與回測那一列一字不差：多數使用者根本不知道
        現在這一種在幫他放空，而一個要點開才看得到的選單，救不了一個不知道要去點的人。
      -->
      <div class="workbench__trading-mode">
        <AppRadio
          v-for="modeOption in tradingModeOptions"
          :key="modeOption.value"
          v-model="form.tradingMode.value"
          :value="modeOption.value"
          :label="modeOption.label"
          :description="modeOption.description"
          :name="tradingModeGroupName"
          :disabled="saving"
          :data-testid="`trading-strategy-trading-mode-${modeOption.value}-radio`"
        />
      </div>
    </div>

    <TradingStrategyCanvas
      :sources="form.signalSources.value"
      :buy-board="form.conditionSides[0].board.value"
      :sell-board="form.conditionSides[1].board.value"
      :strategy-script-options="strategyScriptOptions"
      :interval-options="form.intervalOptions"
      :parameter-names-by-strategy-script-id="parameterNamesByStrategyScriptId"
      :unusable-strategy-scripts="unusableStrategyScripts"
      :can-add="form.canAddSignalSource.value"
      :signal-source-limit="form.signalSourceLimit"
      :shortage="shortage"
      @add="form.addSignalSource"
      @remove="form.removeSignalSource"
      @change-label="form.changeSignalSourceLabel"
      @change-strategy-script="form.changeSignalSourceStrategyScript"
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

    <!--
      只有一顆鍵。儲存不再離開這一頁之後，一顆叫「取消」的按鈕旁邊放著一顆
      不會離開的「儲存」，讀起來像在問取消什麼——而回清單那顆按鈕就在這一頁頂端，
      說得出自己要去哪。
    -->
    <div class="workbench__actions">
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
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('sm');
  }

  &__trading-mode {
    // 兩顆並排；窄到擺不下時自己折成上下兩顆，仍然同時看得見。
    // 與回測那一列同一個寫法——同一件事在兩塊畫面上不該長得不一樣。
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: spacing('2xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
