<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyPicker from '~/components/molecules/StrategyPicker.vue'
import StrategyNameDialog from '~/components/molecules/StrategyNameDialog.vue'
import StrategyLibraryDialog from '~/components/molecules/StrategyLibraryDialog.vue'
import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { StrategyApplication } from '~/application/strategy-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import {
  IndicatorCalculationFieldError,
  type IndicatorCalculationField,
} from '~/domain/errors/indicator-calculation-field-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 有機體：指標計算這一整塊。Application 由頁面注入。
//
// 版面照著「寫程式 → 執行 → 看結果」的順序擺：左邊是那塊夠大的算式編輯區，
// 右邊是按下去會發生事情的那一欄，結果攤在下面整排。
const { indicatorCalculationApplication, strategyApplication, tradingSymbolApplication }
  = defineProps<{
    indicatorCalculationApplication: IndicatorCalculationApplication
    strategyApplication: StrategyApplication
    tradingSymbolApplication: TradingSymbolApplication
  }>()

const symbol = ref('BTCUSDT')
const candleCount = ref('20')
const scriptBody = ref('')
// 種類與內容是兩個各自獨立的狀態：換種類只換外框，使用者寫到一半的內容一字不動。
const resultType = ref<string>(indicatorCalculationApplication.defaultResultType())

// 彙總刻度目前只被記進策略，計算還沒理它——畫面上必須說出來，
// 否則使用者會以為自己已經在用一小時的 K 線算指標。
const aggregationInterval = ref<string>(strategyApplication.defaultAggregationInterval())
const aggregationIntervalOptions = strategyApplication.listAggregationIntervalOptions()

const resultTypeOptions = indicatorCalculationApplication.listResultTypeOptions()
const scriptTemplate = computed(
  () => indicatorCalculationApplication.describeIndicatorScript(resultType.value))

// 策略庫拿畫面上這四樣東西當它的輸入，也負責把載入的那一份寫回來。
// 「這四樣是什麼」只寫在這兩個函式裡，其餘一律走 StrategyContentDto。
const strategyLibrary = useStrategyLibrary(
  strategyApplication,
  () => new StrategyContentDto(
    scriptBody.value, resultType.value, aggregationInterval.value, Number(candleCount.value)),
  (content) => {
    scriptBody.value = content.scriptBody
    resultType.value = content.resultType
    aggregationInterval.value = content.aggregationInterval
    candleCount.value = String(content.candleCount)
  })

onMounted(() => {
  void strategyLibrary.refreshStrategies()
})

const calculating = ref(false)
const result = ref<IndicatorCalculationResultDto | null>(null)
const fieldError = ref<{ field: IndicatorCalculationField, message: string } | null>(null)
const requestRejectedMessage = ref<string | null>(null)
const scriptFailedMessage = ref<string | null>(null)
const backendUnreachable = ref(false)
const serverErrorMessage = ref<string | null>(null)

function messageFor(field: IndicatorCalculationField): string | null {
  return fieldError.value?.field === field ? fieldError.value.message : null
}

function fillExampleScriptBody() {
  scriptBody.value = scriptTemplate.value.exampleBody
}

async function calculateIndicator() {
  calculating.value = true
  fieldError.value = null
  requestRejectedMessage.value = null
  scriptFailedMessage.value = null
  backendUnreachable.value = false
  serverErrorMessage.value = null
  result.value = null

  try {
    result.value = await indicatorCalculationApplication.calculateIndicator(
      new IndicatorCalculationRequestDto(
        symbol.value, candleCount.value, scriptBody.value, resultType.value))
  }
  catch (error: unknown) {
    // 四種失敗各有各的下一步：改欄位、改根數、改算式、去把後端啟動起來。
    if (error instanceof IndicatorCalculationFieldError) {
      fieldError.value = { field: error.field, message: error.message }
    }
    else if (error instanceof IndicatorScriptFailedError) {
      scriptFailedMessage.value = error.message
    }
    else if (error instanceof BackendServerError) {
      serverErrorMessage.value = error.message
    }
    else if (error instanceof BackendRequestRejectedError) {
      requestRejectedMessage.value = error.message
    }
    else if (error instanceof BackendUnreachableError) {
      backendUnreachable.value = true
    }
    else {
      requestRejectedMessage.value = '執行計算時發生未預期的錯誤。'
    }
  }
  finally {
    calculating.value = false
  }
}
</script>

<template>
  <form
    class="indicator-calculation-panel"
    @submit.prevent="calculateIndicator"
  >
    <section class="indicator-calculation-panel__strategy">
      <StrategyPicker
        class="indicator-calculation-panel__strategy-picker"
        :strategies="strategyLibrary.strategies.value"
        :active-strategy-id="strategyLibrary.activeStrategy.value?.id ?? null"
        @select="strategyLibrary.selectStrategy"
      />

      <div class="indicator-calculation-panel__strategy-actions">
        <AppButton
          type="button"
          variant="secondary"
          size="small"
          :disabled="strategyLibrary.saving.value"
          data-testid="save-strategy-button"
          @click="strategyLibrary.saveStrategy"
        >
          {{ strategyLibrary.saving.value ? '儲存中…' : '儲存' }}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="small"
          data-testid="save-as-strategy-button"
          @click="strategyLibrary.openNameDialog"
        >
          另存為新策略
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          size="small"
          data-testid="open-library-button"
          @click="strategyLibrary.openLibrary"
        >
          策略清單
        </AppButton>
      </div>

      <p
        v-if="strategyLibrary.noticeMessage.value"
        class="indicator-calculation-panel__strategy-notice"
        data-testid="strategy-notice"
      >
        {{ strategyLibrary.noticeMessage.value }}
      </p>
      <p
        v-if="strategyLibrary.errorMessage.value"
        class="indicator-calculation-panel__strategy-error"
        data-testid="strategy-error"
      >
        {{ strategyLibrary.errorMessage.value }}
      </p>
    </section>

    <div class="indicator-calculation-panel__workbench">
      <IndicatorScriptEditor
        v-model="scriptBody"
        class="indicator-calculation-panel__editor"
        :script-template="scriptTemplate"
        :error-message="messageFor('scriptBody')"
      >
        <template #toolbar>
          <AppSelect
            v-model="resultType"
            class="indicator-calculation-panel__result-type"
            data-testid="result-type-select"
          >
            <option
              v-for="resultTypeOption in resultTypeOptions"
              :key="resultTypeOption.value"
              :value="resultTypeOption.value"
            >
              {{ resultTypeOption.label }}
            </option>
          </AppSelect>
          <AppButton
            type="button"
            variant="secondary"
            size="small"
            data-testid="example-button"
            @click="fillExampleScriptBody"
          >
            帶入範例內容
          </AppButton>
        </template>
      </IndicatorScriptEditor>

      <aside class="indicator-calculation-panel__run">
        <h2 class="indicator-calculation-panel__run-title">
          執行條件
        </h2>

        <SymbolField
          v-model="symbol"
          :trading-symbol-application="tradingSymbolApplication"
          :error-message="messageFor('symbol')"
        />

        <FormField
          label="計算根數"
          hint="要餵給算式的 K 線根數"
          :error-message="messageFor('candleCount')"
        >
          <AppInput
            v-model="candleCount"
            type="text"
            inputmode="numeric"
            :invalid="Boolean(messageFor('candleCount'))"
            data-testid="candle-count-input"
          />
        </FormField>

        <FormField
          label="彙總刻度"
          hint="這支策略要吃多粗的 K 線。目前計算仍以五分鐘執行，記下來是為了下一版生效時不必回頭一支一支改。"
        >
          <AppSelect
            v-model="aggregationInterval"
            data-testid="aggregation-interval-select"
          >
            <option
              v-for="intervalOption in aggregationIntervalOptions"
              :key="intervalOption.value"
              :value="intervalOption.value"
            >
              {{ intervalOption.label }}
            </option>
          </AppSelect>
        </FormField>

        <AppButton
          type="submit"
          block
          :disabled="calculating"
          data-testid="calculate-button"
        >
          {{ calculating ? '計算中…' : '執行計算' }}
        </AppButton>

        <p
          class="indicator-calculation-panel__notice"
          data-testid="calculation-notice"
        >
          計算一律排除最新一根 K 線，因為它涵蓋的五分鐘尚未走完；算式只能做純運算，碰不到檔案、網路與時間。
        </p>

        <AppAlert
          v-if="scriptFailedMessage"
          tone="danger"
          data-testid="script-failed-alert"
        >
          算式的問題（要改的是算式）：{{ scriptFailedMessage }}
        </AppAlert>

        <AppAlert
          v-else-if="requestRejectedMessage"
          tone="warning"
          data-testid="request-rejected-alert"
        >
          請求的問題：{{ requestRejectedMessage }}
        </AppAlert>

        <AppAlert
          v-else-if="serverErrorMessage"
          tone="danger"
          data-testid="server-error-alert"
        >
          後端出錯了（不是你的請求有問題），請稍後重試：{{ serverErrorMessage }}
          <template #action>
            <AppButton
              variant="secondary"
              size="small"
              :disabled="calculating"
              @click="calculateIndicator"
            >
              重試
            </AppButton>
          </template>
        </AppAlert>

        <AppAlert
          v-else-if="backendUnreachable"
          tone="danger"
          data-testid="unreachable-alert"
        >
          連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。
          <template #action>
            <AppButton
              variant="secondary"
              size="small"
              :disabled="calculating"
              @click="calculateIndicator"
            >
              重試
            </AppButton>
          </template>
        </AppAlert>

        <AppAlert
          v-else-if="calculating"
          tone="info"
          data-testid="calculating-alert"
        >
          計算中…算式最長可能跑上數十秒。
        </AppAlert>
      </aside>
    </div>

    <section
      v-if="result"
      class="indicator-calculation-panel__result"
    >
      <header class="indicator-calculation-panel__result-header">
        <h2 class="indicator-calculation-panel__result-title">
          計算結果
        </h2>
        <p
          class="indicator-calculation-panel__used-count"
          data-testid="used-candle-count"
        >
          實際採用 {{ result.usedCandleCount }} 根
          <AppBadge variant="info">
            {{ result.resultTypeLabel }}
          </AppBadge>
        </p>
      </header>

      <p
        v-if="result.isEmpty"
        class="indicator-calculation-panel__empty"
        data-testid="empty-result"
      >
        這次沒有算出任何指標。算式可以什麼都不放進結果，這不算失敗。
      </p>

      <table
        v-else
        class="indicator-calculation-panel__table"
      >
        <thead>
          <tr>
            <th scope="col">
              指標名稱
            </th>
            <th scope="col">
              數值
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="indicatorValue in result.indicatorValues"
            :key="indicatorValue.name"
            data-testid="indicator-row"
          >
            <td class="indicator-calculation-panel__indicator-name">
              {{ indicatorValue.name }}
            </td>
            <td>
              <span
                v-if="indicatorValue.isEmptySeries"
                class="indicator-calculation-panel__empty-series"
                data-testid="empty-series"
              >空的一串</span>
              <ol
                v-else-if="indicatorValue.isSeries"
                class="indicator-calculation-panel__series"
              >
                <li
                  v-for="(displayValue, position) in indicatorValue.displayValues"
                  :key="position"
                  class="indicator-calculation-panel__series-item"
                  data-testid="series-item"
                >
                  {{ displayValue }}
                </li>
              </ol>
              <span
                v-else
                class="indicator-calculation-panel__value"
              >{{ indicatorValue.displayValues[0] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <StrategyLibraryDialog
      :open="strategyLibrary.openDialog.value === 'library'"
      :strategies="strategyLibrary.strategies.value"
      :error-message="strategyLibrary.listErrorMessage.value"
      :active-strategy-id="strategyLibrary.activeStrategy.value?.id ?? null"
      @load="strategyLibrary.selectStrategy"
      @remove="strategyLibrary.askToDelete"
      @close="strategyLibrary.closeDialog"
    />

    <StrategyNameDialog
      :open="strategyLibrary.openDialog.value === 'name'"
      :error-message="strategyLibrary.nameErrorMessage.value"
      :submitting="strategyLibrary.saving.value"
      @submit="strategyLibrary.createStrategy"
      @cancel="strategyLibrary.closeDialog"
    />

    <ConfirmDialog
      :open="strategyLibrary.openDialog.value === 'discard'"
      title="放棄尚未儲存的變更？"
      message="編輯區的內容已經改過而且還沒存。載入另一支策略會蓋掉它。"
      confirm-label="放棄並載入"
      @confirm="strategyLibrary.confirmDiscard"
      @cancel="strategyLibrary.closeDialog"
    />

    <ConfirmDialog
      :open="strategyLibrary.openDialog.value === 'delete'"
      title="刪除這支策略？"
      message="刪掉就沒了，救不回來。編輯區的內容會留著。"
      confirm-label="刪除"
      variant="danger"
      @confirm="strategyLibrary.confirmDelete"
      @cancel="strategyLibrary.closeDialog"
    />
  </form>
</template>

<style scoped lang="scss">
.indicator-calculation-panel__strategy {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('sm');
  align-items: flex-end;
  margin-bottom: spacing('md');

  &-picker {
    flex: 1 1 18rem;
  }

  &-actions {
    display: flex;
    gap: spacing('2xs');
  }

  &-notice,
  &-error {
    flex-basis: 100%;
    margin: 0;
    font-size: font-size('xs');
  }

  &-notice {
    color: color('text-muted');
  }

  &-error {
    color: color('danger');
  }
}

.indicator-calculation-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

  // 編輯區要大，執行那一欄夠填就好；窄螢幕就上下疊起來。
  &__workbench {
    display: grid;
    gap: spacing('lg');
    grid-template-columns: 1fr;
    align-items: start;

    @include respond-to('lg') {
      grid-template-columns: minmax(0, 1fr) 20rem;
    }
  }

  &__editor {
    min-width: 0;
  }

  &__result-type {
    width: auto;
  }

  &__run {
    display: flex;
    flex-direction: column;
    gap: spacing('md');

    @include surface('md');

    @include respond-to('lg') {
      position: sticky;
      top: spacing('2xl');
    }
  }

  &__run-title {
    margin: 0;
    font-size: font-size('md');
  }

  &__notice {
    margin: 0;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
    color: color('text-muted');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__result-header {
    display: flex;
    gap: spacing('md');
    align-items: baseline;
    justify-content: space-between;
  }

  &__result-title {
    margin: 0;
  }

  &__used-count {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__empty {
    margin: 0;
    border: 1px dashed color('border-strong');
    border-radius: radius('md');
    padding: spacing('xl');
    color: color('text-muted');
    text-align: center;
  }

  &__series {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    justify-content: flex-end;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__series-item,
  &__value {
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: 0 spacing('2xs');
    color: color('text-strong');
    font-family: font-family('mono');
  }

  &__indicator-name {
    color: color('text-strong');
  }

  &__empty-series {
    color: color('text-muted');
  }

  &__table {
    border-collapse: collapse;
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    width: 100%;
    font-size: font-size('sm');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('xs') spacing('sm');
      text-align: left;
    }

    td:last-child,
    th:last-child {
      text-align: right;
    }

    th {
      background-color: color('surface-muted');
      color: color('text-muted');
      font-weight: font-weight('medium');
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: font-size('xs');
    }

    // 指標名稱那一欄只要放得下名字就好，剩下的寬度全部留給值
    td:first-child {
      width: 1%;
      white-space: nowrap;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }
  }
}
</style>
