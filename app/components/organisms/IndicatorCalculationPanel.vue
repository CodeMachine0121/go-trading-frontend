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
import KCandleFieldReference from '~/components/molecules/KCandleFieldReference.vue'
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
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'
import type { StrategyParameterDto, StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'
import StrategyParameterList from '~/components/molecules/StrategyParameterList.vue'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
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
 * 哪天預設的種類改了、只改到一邊，「新開的」就會與「剛進來的」不一樣。
 */
const blankStrategyContent = new StrategyContentDto(
  '',
  indicatorCalculationApplication.defaultResultType(),
)

/*
 * 這一組是「這一次要怎麼算」，不是策略記著的東西：交易標的、彙總刻度、要看多長。
 * 它們因此不在那份空白裡，也不會被載入另一支策略換掉——
 * 使用者正在用一小時的粗細研究一件事，換一支算法不該把他打回五分鐘，
 * 一如換算法向來不會把他丟到別的市場去。
 */
const symbol = ref('BTCUSDT')
const aggregationInterval = ref<string>(
  indicatorCalculationApplication.defaultAggregationInterval())
// 使用者說得出口的是「最近兩小時」，不是「24 根」——而「24」還會隨彙總刻度
// 改變意義。要幾格由系統從這一段算出來，畫面不必也不能填。
const span = ref(indicatorCalculationApplication.defaultCalculationSpan())

const scriptBody = ref(blankStrategyContent.scriptBody)
// 旋鈕是**策略內容**，與算式內容、指標值種類同一層：載入時跟著換，
// 改動它算「有東西還沒存」。彙總刻度與要看多長仍然不是——它們屬於這一次。
const parameters = ref<readonly StrategyParameterDto[]>(blankStrategyContent.parameters)
// 種類與內容是兩個各自獨立的狀態：換種類只換外框，使用者寫到一半的內容一字不動。
const resultType = ref<string>(blankStrategyContent.resultType)

const aggregationIntervalOptions
  = indicatorCalculationApplication.listAggregationIntervalOptions()

const spanUnitOptions = indicatorCalculationApplication.listCalculationSpanUnitOptions()
const parameterKindOptions = indicatorCalculationApplication.listStrategyParameterKindOptions()

// 每一列該長什麼樣子由領域回答——「回看根數要整數鍵盤」是業務規則，不是版面問題。
const parameterFields = computed(
  () => indicatorCalculationApplication.describeStrategyParameters(parameters.value))

const resultTypeOptions = indicatorCalculationApplication.listResultTypeOptions()
// 算式收到的每一根 K 線有哪些欄位。它不會變，取一次就好。
const kCandleFields = indicatorCalculationApplication.listKCandleFields()
const scriptTemplate = computed(
  () => indicatorCalculationApplication.describeIndicatorScript(resultType.value))

const calculating = ref(false)
const result = ref<IndicatorCalculationResultDto | null>(null)
const fieldError = ref<{ field: IndicatorCalculationField, message: string } | null>(null)
const requestRejectedMessage = ref<string | null>(null)
const scriptFailedMessage = ref<string | null>(null)
/** 算式取用了一個沒有宣告的旋鈕名字。它與「算式跑不動」是兩件事。 */
const parameterNotDeclaredMessage = ref<string | null>(null)
const backendUnreachable = ref(false)
const serverErrorMessage = ref<string | null>(null)

/**
 * 把上一次計算留下的東西全部清掉——結果與四種失敗訊息。
 *
 * 它們是同一次計算的產物，所以永遠一起清。少清一個就會出現對不上的畫面：
 * 換了一份算式之後，欄位已經是新的預設值，旁邊卻還紅著上一次那句
 * 「計算根數必須是正整數」。
 */
function clearLastCalculation() {
  result.value = null
  fieldError.value = null
  requestRejectedMessage.value = null
  scriptFailedMessage.value = null
  parameterNotDeclaredMessage.value = null
  serverErrorMessage.value = null
  backendUnreachable.value = false
}

// 策略庫拿畫面上這三樣東西當它的輸入，也負責把載入的那一份寫回來。
// 「這三樣是什麼」只寫在這兩個函式裡，其餘一律走 StrategyContentDto——
// 多一樣東西要跟著策略走，就只有這裡要改，「有沒有還沒存」自動跟著涵蓋它。
// 彙總刻度與要看多長刻意不在其中：它們不屬於任何一支策略，
// 所以載入不會覆蓋它們，改動它們也不算「有東西還沒存」。
const strategyLibrary = useStrategyLibrary(
  strategyApplication,
  () => new StrategyContentDto(scriptBody.value, resultType.value, parameters.value),
  (content) => {
    scriptBody.value = content.scriptBody
    resultType.value = content.resultType
    parameters.value = content.parameters
    // 換了一份算式，上一次那次計算就與畫面上這一份無關了——結果與失敗訊息一起清掉。
    clearLastCalculation()
  },
  blankStrategyContent)

onMounted(() => {
  void strategyLibrary.refreshStrategies()
})

function addParameter() {
  parameters.value = indicatorCalculationApplication.addStrategyParameter(parameters.value)
}

function removeParameter(index: number) {
  parameters.value = indicatorCalculationApplication.removeStrategyParameter(
    parameters.value, index)
}

function renameParameter(index: number, name: string) {
  parameters.value = indicatorCalculationApplication.renameStrategyParameter(
    parameters.value, index, name)
}

function changeParameterKind(index: number, kind: StrategyParameterKind) {
  parameters.value = indicatorCalculationApplication.changeStrategyParameterKind(
    parameters.value, index, kind)
}

function changeParameterValue(index: number, value: number) {
  parameters.value = indicatorCalculationApplication.changeStrategyParameterValue(
    parameters.value, index, value)
}

/** 同上：數字框交出來的可能已經是數字，也可能是還沒讀成數字的那一段文字。 */
function changeSpanAmount(raw: string | number) {
  const amount = typeof raw === 'number' ? raw : Number(raw.trim())
  if (raw !== '' && Number.isFinite(amount)) {
    span.value = new CalculationSpanDto(amount, span.value.unit)
  }
}

function changeSpanUnit(unit: string) {
  span.value = new CalculationSpanDto(span.value.amount, unit as CalculationSpanUnit)
}

function messageFor(field: IndicatorCalculationField): string | null {
  return fieldError.value?.field === field ? fieldError.value.message : null
}

function fillExampleScriptBody() {
  scriptBody.value = scriptTemplate.value.exampleBody
}

async function calculateIndicator() {
  calculating.value = true
  clearLastCalculation()

  try {
    result.value = await indicatorCalculationApplication.calculateIndicator(
      new IndicatorCalculationRequestDto(
        symbol.value,
        aggregationInterval.value,
        indicatorCalculationApplication.kCandleCountFor(span.value, aggregationInterval.value),
        scriptBody.value,
        resultType.value,
        parameters.value))
  }
  catch (error: unknown) {
    // 每一種失敗各有各的下一步，而分開它們的判準只有一個：**使用者要去改哪裡**。
    // 名字對不上要去改參數那一列或算式那一行；算式跑不動要去改算法本身。
    // 把前者說成後者，會讓人盯著一段其實沒有問題的程式碼看很久。
    if (error instanceof StrategyParameterNotDeclaredError) {
      parameterNotDeclaredMessage.value = error.message
    }
    else if (error instanceof IndicatorCalculationFieldError) {
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

      <!--
        旋鈕與算式、指標值種類同一區，因為判準相同：**它是這支算法的一部分**。
        「快線是二十期」換到哪一檔、哪種粗細、哪一段時間去算都一樣。
        彙總刻度與要看多長則在執行條件那一區——它們描述的是這一次。
      -->
      <AppPanel
        title="參數"
        class="indicator-calculation-panel__parameters"
      >
        <template #meta>
          <span class="indicator-calculation-panel__parameters-hint">
            算式以名字取用它們；它們跟著策略一起存。
          </span>
        </template>

        <StrategyParameterList
          :fields="parameterFields"
          :kind-options="parameterKindOptions"
          @add="addParameter"
          @remove="removeParameter"
          @rename="renameParameter"
          @change-kind="changeParameterKind"
          @change-value="changeParameterValue"
        />

        <AppAlert
          v-if="messageFor('parameters')"
          tone="danger"
          data-testid="parameters-alert"
        >
          {{ messageFor('parameters') }}
        </AppAlert>
      </AppPanel>

      <!-- 右欄裝兩塊：按下去會發生事情的那一欄，加上寫算式時要查的那一份說明。 -->
      <div class="indicator-calculation-panel__side">
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
            label="要看多長"
            hint="這一次要涵蓋多長一段。要幾根 K 線由系統自己算——包含算式回看要用的那些。"
            :error-message="messageFor('span')"
          >
            <div class="indicator-calculation-panel__span">
              <AppInput
                :model-value="String(span.amount)"
                type="number"
                inputmode="numeric"
                :invalid="Boolean(messageFor('span'))"
                data-testid="span-amount-input"
                @update:model-value="changeSpanAmount"
              />
              <AppSelect
                :model-value="span.unit"
                data-testid="span-unit-select"
                @update:model-value="changeSpanUnit"
              >
                <option
                  v-for="unitOption in spanUnitOptions"
                  :key="unitOption.value"
                  :value="unitOption.value"
                >
                  {{ unitOption.label }}
                </option>
              </AppSelect>
            </div>
          </FormField>

          <FormField
            label="彙總刻度"
            hint="這次要吃多粗的 K 線。它屬於這一次計算，不會跟著策略存下來。"
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
            計算只採用已經走完的那幾格——還在走的那一格不算，因為它的數字還會變；算式只能做純運算，碰不到檔案、網路與時間。
          </p>

          <AppAlert
            v-if="parameterNotDeclaredMessage"
            tone="danger"
            data-testid="parameter-not-declared-alert"
          >
            參數的問題（要改的是參數那一列的名字，或算式裡取用它的那一行）：{{ parameterNotDeclaredMessage }}
          </AppAlert>

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

        <!-- 查「candle. 後面能接什麼」的時刻就是寫算式的時刻，所以它擺在編輯區旁邊。 -->
        <KCandleFieldReference :fields="kCandleFields" />
      </div>
    </div>

    <AppPanel
      v-if="result"
      title="計算結果"
      flush
      class="indicator-calculation-panel__result"
    >
      <!-- 「這次用了多粗」與「用了幾根」是同一句話的兩半，所以並列。
           挑了一小時卻用五分鐘算出來的數字長得跟對的一模一樣，
           所以它必須看得見，而不是靠信任。 -->
      <template #meta>
        <span data-testid="used-candle-count">
          實際採用 {{ result.usedCandleCount }} 根
          <AppBadge
            variant="info"
            data-testid="used-interval"
          >
            每根涵蓋 {{ result.intervalLabel }}
          </AppBadge>
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
      hint="其餘內容取自畫面上目前的算式與指標值種類。"
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
      // 右欄放得下最長的那個欄位名（TakerBuyQuoteVolume）而不必折行。
      grid-template-columns: minmax(0, 1fr) 21rem;
      align-items: stretch;
    }
  }

  // 右欄裝兩塊：執行條件在上、K 線欄位說明在下，一起在自己的框裡捲。
  &__side {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    min-height: 0;
    overflow-y: auto;
  }

  &__editor {
    min-width: 0;
  }

  &__result-type {
    width: auto;
  }

  &__run {
    flex: none;
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
