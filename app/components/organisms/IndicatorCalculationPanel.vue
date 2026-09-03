<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
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
// 版面照著「寫程式 → 執行 → 看結果」的順序擺，也就是每一台開發工作台的擺法：
// 最上面一條說「現在用的是哪一支策略」，左邊是那塊夠大的算式編輯區，
// 右邊是按下去會發生事情的那一欄，結果攤在下面整排。
const { indicatorCalculationApplication, strategyApplication, tradingSymbolApplication }
  = defineProps<{
    indicatorCalculationApplication: IndicatorCalculationApplication
    strategyApplication: StrategyApplication
    tradingSymbolApplication: TradingSymbolApplication
  }>()

/**
 * 一份空白的策略內容——「空白長什麼樣」在這個畫面上只有這一個定義。
 *
 * 第一次進入畫面時是它，按下「新的空白策略」時也是它。各寫一份的話，
 * 哪天預設的彙總刻度改了、只改到一邊，「新開的」就會與「剛進來的」不一樣。
 */
const blankStrategyContent = new StrategyContentDto(
  '',
  indicatorCalculationApplication.defaultResultType(),
  strategyApplication.defaultAggregationInterval(),
  strategyApplication.defaultCandleCount(),
)

// 交易標的不是策略記著的東西（同一支策略要能套用在不同市場上），
// 所以它不在那份空白裡，開一份新稿子也不會把它換掉。
const symbol = ref('BTCUSDT')

const scriptBody = ref(blankStrategyContent.scriptBody)
const candleCount = ref(String(blankStrategyContent.candleCount))
// 種類與內容是兩個各自獨立的狀態：換種類只換外框，使用者寫到一半的內容一字不動。
const resultType = ref<string>(blankStrategyContent.resultType)

// 彙總刻度目前只被記進策略，計算還沒理它——畫面上必須說出來，
// 否則使用者會以為自己已經在用一小時的 K 線算指標。
const aggregationInterval = ref<string>(blankStrategyContent.aggregationInterval)
const aggregationIntervalOptions = strategyApplication.listAggregationIntervalOptions()

const resultTypeOptions = indicatorCalculationApplication.listResultTypeOptions()
const scriptTemplate = computed(
  () => indicatorCalculationApplication.describeIndicatorScript(resultType.value))

const calculating = ref(false)
const result = ref<IndicatorCalculationResultDto | null>(null)
const fieldError = ref<{ field: IndicatorCalculationField, message: string } | null>(null)
const requestRejectedMessage = ref<string | null>(null)
const scriptFailedMessage = ref<string | null>(null)
const backendUnreachable = ref(false)
const serverErrorMessage = ref<string | null>(null)

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
    // 換了一份算式，上一次的結果就不再是這份算式算出來的——留著它只會誤導。
    result.value = null
  },
  blankStrategyContent)

onMounted(() => {
  void strategyLibrary.refreshStrategies()
})

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
    <!-- 策略那一列收成一塊面板，才不會一整排控制項懸在工作區的底色上。
         它不必有標題列——「策略」兩個字就寫在它自己的欄位標籤上了。 -->
    <AppPanel class="indicator-calculation-panel__strategy">
      <StrategyPicker
        :strategies="strategyLibrary.strategies.value"
        :active-strategy-id="strategyLibrary.activeStrategy.value?.id ?? null"
        @select="strategyLibrary.selectStrategy"
      >
        <template #actions>
          <!-- 「新的」排第一：每一個檔案選單都是這個順序，肌肉記憶在那裡。 -->
          <AppButton
            type="button"
            variant="secondary"
            label="新的空白策略"
            data-testid="new-strategy-button"
            @click="strategyLibrary.startBlankStrategy"
          >
            <AppIcon name="new" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="strategyLibrary.saving.value"
            label="儲存"
            data-testid="save-strategy-button"
            @click="strategyLibrary.saveStrategy"
          >
            <AppIcon name="save" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            label="另存為新策略"
            data-testid="save-as-strategy-button"
            @click="strategyLibrary.openNameDialog"
          >
            <AppIcon name="save-as" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="strategyLibrary.activeStrategy.value === null"
            label="重新命名"
            data-testid="rename-strategy-button"
            @click="strategyLibrary.openRenameDialog"
          >
            <AppIcon name="rename" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            label="策略清單"
            data-testid="open-library-button"
            @click="strategyLibrary.openLibrary"
          >
            <AppIcon name="library" />
          </AppButton>
        </template>
      </StrategyPicker>

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
    </AppPanel>

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
            label="帶入範例內容"
            data-testid="example-button"
            @click="fillExampleScriptBody"
          >
            <AppIcon name="example" />
          </AppButton>
        </template>
      </IndicatorScriptEditor>

      <AppPanel
        title="執行條件"
        class="indicator-calculation-panel__run"
      >
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
      </AppPanel>
    </div>

    <AppPanel
      v-if="result"
      title="計算結果"
      flush
      class="indicator-calculation-panel__result"
    >
      <template #meta>
        <span data-testid="used-candle-count">
          實際採用 {{ result.usedCandleCount }} 根
          <AppBadge variant="info">
            {{ result.resultTypeLabel }}
          </AppBadge>
        </span>
      </template>

      <p
        v-if="result.isEmpty"
        class="indicator-calculation-panel__empty"
        data-testid="empty-result"
      >
        這次沒有算出任何指標。算式可以什麼都不放進結果，這不算失敗。
      </p>

      <div
        v-else
        class="indicator-calculation-panel__scroller"
      >
        <table class="indicator-calculation-panel__table">
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
      </div>
    </AppPanel>

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
      title="另存為新策略"
      hint="其餘內容取自畫面上目前的算式、指標值種類、彙總刻度與計算根數。"
      :error-message="strategyLibrary.nameErrorMessage.value"
      :submitting="strategyLibrary.saving.value"
      @submit="strategyLibrary.createStrategy"
      @cancel="strategyLibrary.closeDialog"
    />

    <StrategyNameDialog
      :open="strategyLibrary.openDialog.value === 'rename'"
      title="重新命名"
      hint="只換名字，這一支記著的算式與其餘設定都不會被動到。"
      :initial-name="strategyLibrary.activeStrategy.value?.name ?? ''"
      :error-message="strategyLibrary.nameErrorMessage.value"
      :submitting="strategyLibrary.saving.value"
      data-testid="rename-dialog"
      @submit="strategyLibrary.renameStrategy"
      @cancel="strategyLibrary.closeDialog"
    />

    <ConfirmDialog
      :open="strategyLibrary.openDialog.value === 'discard'"
      title="放棄尚未儲存的變更？"
      message="編輯區的內容已經改過而且還沒存。接下來這個動作會蓋掉它。"
      confirm-label="放棄並繼續"
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
.indicator-calculation-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;

  &__strategy {
    flex: none;
  }

  &__strategy-notice,
  &__strategy-error {
    margin: 0;
    font-size: font-size('2xs');
  }

  &__strategy-notice {
    color: color('text-muted');
  }

  &__strategy-error {
    color: color('danger');
  }

  // 編輯區要大，執行那一欄夠填就好；窄螢幕就上下疊起來。
  &__workbench {
    display: grid;
    flex: 1;
    gap: spacing('sm');
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    min-height: 0;

    @include respond-to('lg') {
      grid-template-columns: minmax(0, 1fr) 19rem;
      align-items: stretch;
    }
  }

  &__editor {
    min-width: 0;
  }

  &__result-type {
    width: auto;
  }

  &__run {
    // 執行條件那一欄要能自己捲：條件之外還會長出四種失敗訊息，
    // 讓它把整個工作台頂長的話，編輯區就會被推出視窗外。
    overflow-y: auto;
  }

  &__notice {
    margin: 0;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__result {
    flex: none;

    // 一串很長的指標值不該把整個畫面撐開——結果自己在框裡捲。
    max-height: 24rem;
  }

  &__empty {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }

  &__series {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('3xs');
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

    @include numeric;
  }

  &__indicator-name {
    color: color('text-strong');
    font-family: font-family('mono');
  }

  &__empty-series {
    color: color('text-faint');
  }

  &__scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &__table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: font-size('xs');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('2xs') spacing('sm');
      text-align: left;
    }

    td:last-child,
    th:last-child {
      text-align: right;
    }

    th {
      position: sticky;
      top: 0;

      // sticky 的表頭必須自己不透明，否則捲上來的列會從它底下透出來。
      background-color: color('surface-muted');
      white-space: nowrap;

      @include dense-label;
    }

    // 指標名稱那一欄只要放得下名字就好，剩下的寬度全部留給值
    td:first-child {
      width: 1%;
      white-space: nowrap;
    }
  }
}
</style>
