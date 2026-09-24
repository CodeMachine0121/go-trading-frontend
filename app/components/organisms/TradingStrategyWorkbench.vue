<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import TradingStrategyConditionCard from '~/components/organisms/TradingStrategyConditionCard.vue'
import TradingStrategySignalSourceCard from '~/components/organisms/TradingStrategySignalSourceCard.vue'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import type { MarketDataKindOptionDto } from '~/domain/models/dto/market-data-kind-option-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'
import { useTradingStrategyForm } from '~/composables/use-trading-strategy-form'

// 有機體：拼一份交易策略的整個工作檯。
//
// 它**不知道自己是在新增還是在改**——收到一份交易策略（或 null），交出一份要存的東西。
// 知道的話，這裡就會長出兩條各自的路，而它們要做的事其實一模一樣。
//
// 最上面一列是這份規則的身分：名稱、行情種類，以及（合約的）交易模式，存在同一列。
// 交易模式在這裡，因為它變的是規則的語意——同一棵條件樹在「賣出＝出清回現金」
// 與「賣出＝反手做空」兩種讀法下，講的是兩件不同的事。
//
// 交易標的、觸發間隔與部位規劃**不在這裡**：那是機器人的事。分開之後，
// 同一份規則才能被好幾台機器人同時用。
//
// 底下是由上而下三張步驟卡：訊號來源 → 什麼算買入 → 什麼算賣出。
// 點一張卡，它的設定出現在旁邊（窄螢幕從下方拉出）。一切都用點的，不用拖的，
// 所以手機上也編得動。
const {
  editing,
  strategyScriptOptionsByKind,
  parameterNamesByStrategyScriptId,
  unusableStrategyScriptsByKind,
  shortageByKind,
  marketDataKindOptions,
  contractTradingModeOptions,
  saving,
  failureMessage,
  savedGeneration,
  layoutDensity,
}
  = defineProps<{
  /** 有值就是改那一份，沒有就是新的一份。 */
    editing: TradingStrategyDto | null
    /** 每一種行情各自挑得到哪幾支策略腳本；訊號來源只挑得到這一份吃的那一種。 */
    strategyScriptOptionsByKind: Readonly<Record<MarketDataKind, readonly { value: number, label: string }[]>>
    /** 每一支策略腳本開得出來的那幾個參數名。 */
    parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
    /** 存在、但當不了訊號來源的那幾支，以及原因。一個指著它們的來源要說得出來。 */
    unusableStrategyScriptsByKind: Readonly<Record<MarketDataKind, Readonly<Record<number, string>>>>
    /** 一支都挑不到時，是哪一種挑不到。挑得到就是 `null`。 */
    shortageByKind: Readonly<Record<MarketDataKind, 'noStrategyScripts' | 'noSignalStrategyScripts' | null>>
    /** 行情種類選單的選項。 */
    marketDataKindOptions: readonly MarketDataKindOptionDto[]
    /** 合約交易策略的交易模式選單。 */
    contractTradingModeOptions: readonly ContractTradingModeOptionDto[]
    saving: boolean
    /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
    failureMessage: string
    /** 這一份被成功存過幾次。每多一次，「打開時的樣子」就重新記一次。 */
    savedGeneration: number
    /**
     * 現在這個寬度代表什麼。這裡用到的是「設定擺在卡旁邊，還是從下方拉出」。
     *
     * 它由上面那一層問來、往下傳：這個有機體因此在任何地方都掛得起來，
     * 包括一個沒有整個應用程式在跑的測試裡。
     */
    layoutDensity: LayoutDensityDto
  }>()

const emit = defineEmits<{
  save: [writeDto: TradingStrategyWriteDto]
  /** 這一頁被改過了沒有——離開前要不要問，由上面那一層決定。 */
  dirtyChange: [dirty: boolean]
}>()

const form = useTradingStrategyForm(
  () => editing,
  () => strategyScriptOptionsByKind[form.marketDataKind.value],
  () => unusableStrategyScriptsByKind[form.marketDataKind.value],
  () => parameterNamesByStrategyScriptId,
)

// 挑得到的策略腳本與「一支都挑不到」那一句，都跟著這一份吃的行情走。
const strategyScriptOptions = computed(() => strategyScriptOptionsByKind[form.marketDataKind.value])
const shortage = computed(() => shortageByKind[form.marketDataKind.value])

/** 已存的那一份寫出它是哪一種行情；它換不了，所以是一句話，不是選單。 */
const lockedMarketDataKindLabel = computed(
  () => marketDataKindOptions.find(option => option.value === form.marketDataKind.value)?.label ?? '')
const selectedContractTradingMode = computed(
  () => contractTradingModeOptions.find(option => option.value === form.tradingMode.value))

form.reset()

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
const dirty = computed(
  () => JSON.stringify(form.toWriteDto() ?? form.rejection.value) !== pristine.value)
watchEffect(() => {
  emit('dirtyChange', dirty.value)
})

/** 現在被選著的那一張卡。一次只開一張的設定——兩張同時開，旁邊那一欄就說不清是誰的。 */
const selectedStep = ref<'sources' | ConditionSideVo | null>(null)

/** 寬螢幕上設定貼在卡旁邊；導覽貼到底部的寬度放不下第二欄，改從下方拉出。 */
const settingsPlacement = computed(
  () => (layoutDensity.usesBottomNavigation ? 'sheet' as const : 'beside' as const))

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
      這份交易策略的身分：名稱、行情種類、（合約的）交易模式，與唯一的那一顆儲存鍵。
      它填一次就不會再動，所以只佔一列——**拼**這件事會做上半小時。
    -->
    <header class="workbench__identity">
      <FormField
        label="交易策略名稱"
        class="workbench__name"
      >
        <AppInput
          v-model="form.name.value"
          type="text"
          placeholder="例如：突破＋動能確認"
          data-testid="trading-strategy-name-input"
        />
      </FormField>

      <!--
        行情種類決定訊號來源挑得到哪幾支。存過之後它換不了
        （每一個來源都是照它挑的），所以改成一句話。
      -->
      <FormField
        v-if="!form.marketDataKindLocked.value"
        label="行情種類"
      >
        <AppSelect
          :model-value="form.marketDataKind.value"
          data-testid="trading-strategy-market-data-kind-select"
          @update:model-value="kind => form.changeMarketDataKind(kind as MarketDataKind)"
        >
          <option
            v-for="kindOption in marketDataKindOptions"
            :key="kindOption.value"
            :value="kindOption.value"
          >
            {{ kindOption.label }}
          </option>
        </AppSelect>
      </FormField>
      <AppBadge
        v-else
        variant="info"
        class="workbench__locked"
        data-testid="trading-strategy-market-data-kind-locked"
      >
        {{ lockedMarketDataKindLabel }}（存過之後不能換）
      </AppBadge>

      <FormField
        v-if="form.replaysOnContractAccount.value"
        label="交易模式"
      >
        <AppSelect
          :model-value="form.tradingMode.value"
          data-testid="trading-strategy-trading-mode-select"
          @update:model-value="mode => form.changeTradingMode(mode as ContractTradingMode)"
        >
          <option
            v-for="modeOption in contractTradingModeOptions"
            :key="modeOption.value"
            :value="modeOption.value"
          >
            {{ modeOption.label }}
          </option>
        </AppSelect>
      </FormField>

      <!--
        只有一顆鍵。儲存不離開這一頁，所以一顆叫「取消」的按鈕放在旁邊讀起來像在問取消什麼——
        而回清單那顆按鈕就在這一頁頂端，說得出自己要去哪。
      -->
      <!-- 改過還沒存時說一聲：離開時才被攔下來問，他在那之前不會知道這一頁還沒存。 -->
      <span
        v-if="dirty"
        class="workbench__unsaved"
        data-testid="trading-strategy-unsaved"
      >還沒存的改動</span>
      <AppButton
        type="button"
        class="workbench__save"
        :disabled="saving || form.rejection.value !== null"
        data-testid="trading-strategy-form-save"
        @click="onSave"
      >
        {{ saving ? '儲存中…' : '儲存' }}
      </AppButton>
    </header>

    <p
      v-if="form.replaysOnContractAccount.value && selectedContractTradingMode"
      class="workbench__hint"
      data-testid="trading-strategy-trading-mode-description"
    >
      {{ selectedContractTradingMode.description }}
    </p>

    <AppAlert
      v-if="form.marketDataKindNotice.value !== ''"
      tone="info"
      data-testid="trading-strategy-market-data-kind-notice"
    >
      {{ form.marketDataKindNotice.value }}
    </AppAlert>

    <!-- 擋下來的原因貼著儲存鍵講，而不是在三張卡的最底下。 -->
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

    <div
      class="workbench__steps"
      :class="{ 'workbench__steps--beside': settingsPlacement === 'beside' }"
    >
      <TradingStrategySignalSourceCard
        :sources="form.signalSources.value"
        :strategy-script-options="strategyScriptOptions"
        :strategy-script-labels="form.signalSourceStrategyScriptLabels.value"
        :parameter-summaries="form.signalSourceParameterSummaries.value"
        :parameter-inputs="form.signalSourceParameterInputs.value"
        :interval-options="form.intervalOptions"
        :can-add="form.canAddSignalSource.value"
        :signal-source-limit="form.signalSourceLimit"
        :shortage="shortage"
        :usage-warnings="form.signalSourceUsageWarnings.value"
        :selected="selectedStep === 'sources'"
        :settings-placement="settingsPlacement"
        @select="selectedStep = 'sources'"
        @close="selectedStep = null"
        @add="form.addSignalSource"
        @remove="form.removeSignalSource"
        @change-label="form.changeSignalSourceLabel"
        @change-strategy-script="form.changeSignalSourceStrategyScript"
        @change-interval="form.changeSignalSourceInterval"
        @change-parameter-value="form.changeSignalSourceParameterValue"
      />

      <template
        v-for="conditionSide in form.conditionSides"
        :key="conditionSide.key"
      >
        <!-- 卡與卡之間那一小段線：由上往下讀，就是這份規則怎麼想事情的順序。 -->
        <div
          class="workbench__connector"
          aria-hidden="true"
        >
          <span class="workbench__connector-label">
            {{ conditionSide.connectorWord }}
          </span>
        </div>

        <TradingStrategyConditionCard
          :side="conditionSide.key"
          :heading="conditionSide.heading"
          :tone="conditionSide.tone"
          :board="conditionSide.board.value"
          :source-labels="form.sourceLabels.value"
          :signal-options="form.signalOptions"
          :selected="selectedStep === conditionSide.key"
          :settings-placement="settingsPlacement"
          @select="selectedStep = conditionSide.key"
          @close="selectedStep = null"
          @change-operator="conditionSide.changeOperator"
          @change-bundle-operator="conditionSide.changeBundleOperator"
          @add-clause="conditionSide.addClause"
          @toggle-signal="conditionSide.toggleSignal"
          @take-off="conditionSide.takeOff"
          @bundle-onto="conditionSide.bundleOnto"
          @bundle-with="conditionSide.bundleWith"
          @unbundle="conditionSide.unbundle"
          @split-bundle="conditionSide.splitBundle"
          @place-at="conditionSide.placeAt"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workbench {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  // 排得下就一列，排不下就往下折：名稱最寬，行情種類與交易模式各佔一格，儲存靠右。
  &__identity {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: flex-end;
    border: 1px solid color('border');
    border-radius: radius('lg');
    background-color: color('surface');
    padding: spacing('sm');

    > * {
      flex: 1 1 10rem;
    }
  }

  &__unsaved {
    align-self: center;
    color: color('warning');
    font-size: font-size('xs');
    white-space: nowrap;
  }

  &__name {
    flex: 2 1 16rem;
  }

  &__locked {
    flex: none;
    align-self: center;
  }

  &__save {
    flex: none;
    margin-left: auto;
  }

  &__hint {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__steps {
    display: flex;
    flex-direction: column;
  }

  &__connector {
    display: flex;
    position: relative;
    justify-content: center;
    height: spacing('xl');

    // 那條線畫在正中間；寬螢幕上它只跨卡片那一欄，不跨右邊的設定欄。
    &::before {
      position: absolute;
      inset-block: 0;
      left: 50%;
      background-color: color('border-strong');
      width: 1px;
      content: '';
    }
  }

  // 右邊那一欄的寬度與 StepCard 留給設定的那一欄相同，線因此落在卡片的正中間。
  &__steps--beside &__connector {
    margin-right: calc(20rem + #{spacing('sm')});
  }

  &__connector-label {
    position: relative;
    align-self: center;
    border: 1px solid color('border-strong');
    border-radius: radius('pill');
    background-color: color('background');
    padding: 0 spacing('xs');
    color: color('text-muted');
    font-size: font-size('2xs');
  }
}
</style>
