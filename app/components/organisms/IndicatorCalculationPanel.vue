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
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'
import StrategyParameterList from '~/components/molecules/StrategyParameterList.vue'
import { readNumberInput } from '~/utilities/number-input-reading'
import { useStrategyParameters } from '~/composables/use-strategy-parameters'
import { useIndicatorCalculationRun } from '~/composables/use-indicator-calculation-run'

// 有機體：指標計算這一整塊。Application 由頁面注入。
//
// 版面由上而下照著使用者的順序擺，也就是每一台這類工作台的擺法
// （Databricks、Neon、Supabase 的查詢頁都是同一個形狀）：
//
//   現在用的是哪一支策略  →  這一次要算什麼（一條橫列，最右邊是那顆按鈕）
//   →  算式與它的旋鈕（獨佔下面那一整片，右邊擺寫的時候要查的東西）
//   →  結果攤在最下面整排
//
// **執行條件是一條橫列，不是一根側欄。** 側欄得跟編輯區一樣高，
// 於是三個欄位下面永遠空著一大塊；而編輯區——這個畫面上唯一需要空間的東西——
// 反而被那根用不到的欄子擠窄。
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
const strategyParameters = useStrategyParameters(
  indicatorCalculationApplication, blankStrategyContent.parameters)
// 種類與內容是兩個各自獨立的狀態：換種類只換外框，使用者寫到一半的內容一字不動。
const resultType = ref<string>(blankStrategyContent.resultType)

const aggregationIntervalOptions
  = indicatorCalculationApplication.listAggregationIntervalOptions()

const spanUnitOptions = indicatorCalculationApplication.listCalculationSpanUnitOptions()

const resultTypeOptions = indicatorCalculationApplication.listResultTypeOptions()
// 算式收到的每一根 K 線有哪些欄位。它不會變，取一次就好。
const kCandleFields = indicatorCalculationApplication.listKCandleFields()
const scriptTemplate = computed(
  () => indicatorCalculationApplication.describeIndicatorScript(resultType.value))

const calculationRun = useIndicatorCalculationRun(indicatorCalculationApplication)

// 策略庫拿畫面上這三樣東西當它的輸入，也負責把載入的那一份寫回來。
// 「這三樣是什麼」只寫在這兩個函式裡，其餘一律走 StrategyContentDto——
// 多一樣東西要跟著策略走，就只有這裡要改，「有沒有還沒存」自動跟著涵蓋它。
// 彙總刻度與要看多長刻意不在其中：它們不屬於任何一支策略，
// 所以載入不會覆蓋它們，改動它們也不算「有東西還沒存」。
const strategyLibrary = useStrategyLibrary(
  strategyApplication,
  () => new StrategyContentDto(
    scriptBody.value, resultType.value, strategyParameters.parameters.value),
  (content) => {
    scriptBody.value = content.scriptBody
    resultType.value = content.resultType
    strategyParameters.replaceAll(content.parameters)
    // 換了一份算式，上一次那次計算就與畫面上這一份無關了——結果與失敗訊息一起清掉。
    calculationRun.clear()
  },
  blankStrategyContent)

onMounted(() => {
  void strategyLibrary.refreshStrategies()
})

/** 同上：打到一半的東西不往下送。 */
function changeSpanAmount(raw: string | number) {
  const amount = readNumberInput(raw)
  if (amount !== null) {
    span.value = new CalculationSpanDto(amount, span.value.unit)
  }
}

function changeSpanUnit(unit: string) {
  span.value = new CalculationSpanDto(span.value.amount, unit as CalculationSpanUnit)
}

function fillExampleScriptBody() {
  scriptBody.value = scriptTemplate.value.exampleBody
}

async function calculateIndicator() {
  await calculationRun.run(() => new IndicatorCalculationRequestDto(
    symbol.value,
    aggregationInterval.value,
    indicatorCalculationApplication.kCandleCountFor(span.value, aggregationInterval.value),
    scriptBody.value,
    resultType.value,
    strategyParameters.parameters.value))
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

    <!--
      執行條件是一條**貼在頂上的橫列**，不是一根高高的側欄。
      它描述的是「這一次要算什麼」——交易標的、看多長、多粗——三件事各一格，
      按下去的那顆在最右邊。做過這件事的工具（Databricks、Neon、Supabase）都是這樣擺：
      設定與動作連在同一條帶子上，寫東西的地方獨佔下面那一整片。
      擺成側欄的代價很具體：它得跟編輯區一樣高，於是三個欄位下面永遠空著一大塊。
    -->
    <!--
      這一頁只有一個分別要記住：**什麼跟著策略走，什麼只屬於這一次**。
      它以前被拆成三句小灰字散在三個地方，於是沒有人讀——一句永遠掛著、
      每次都讀到的話，讀的人很快就會學會不讀它。
      改成兩個對照的標記：短到會被讀完，而且兩邊擺在一起才看得出是一組。
    -->
    <AppPanel
      title="執行條件"
      class="indicator-calculation-panel__run"
    >
      <template #meta>
        <AppBadge variant="info">
          只影響這一次
        </AppBadge>
      </template>

      <div class="indicator-calculation-panel__run-fields">
        <SymbolField
          v-model="symbol"
          :trading-symbol-application="tradingSymbolApplication"
          :error-message="calculationRun.messageFor('symbol')"
        />

        <FormField
          label="要看多長"
          :error-message="calculationRun.messageFor('span')"
        >
          <div class="indicator-calculation-panel__span">
            <AppInput
              :model-value="String(span.amount)"
              type="number"
              inputmode="numeric"
              :invalid="Boolean(calculationRun.messageFor('span'))"
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
          :disabled="calculationRun.calculating.value"
          data-testid="calculate-button"
        >
          {{ calculationRun.calculating.value ? '計算中…' : '執行計算' }}
        </AppButton>

        <AppButton
          type="submit"
          class="indicator-calculation-panel__run-action"
          :disabled="calculationRun.calculating.value"
          data-testid="calculate-button"
        >
          {{ calculationRun.calculating.value ? '計算中…' : '執行計算' }}
        </AppButton>
      </div>
    </AppPanel>

    <!--
      說明橫跨整個寬度：它講的是剛剛那一次計算，不屬於左右任何一欄。
      刻意不包一層外框——包了，沒有任何說明的時候那個空盒子照樣吃掉一個間距，
      而 Vue 為沒渲染的東西留下的是註解節點，`:empty` 選不到它。
    -->
    <AppAlert
      v-if="calculationRun.parameterNotDeclaredMessage.value"
      tone="danger"
      data-testid="parameter-not-declared-alert"
    >
      參數的問題（要改的是參數那一列的名字，或算式裡取用它的那一行）：{{ calculationRun.parameterNotDeclaredMessage.value }}
    </AppAlert>

    <AppAlert
      v-if="calculationRun.scriptFailedMessage.value"
      tone="danger"
      data-testid="script-failed-alert"
    >
      算式的問題（要改的是算式）：{{ calculationRun.scriptFailedMessage.value }}
    </AppAlert>

    <AppAlert
      v-else-if="calculationRun.requestRejectedMessage.value"
      tone="warning"
      data-testid="request-rejected-alert"
    >
      請求的問題：{{ calculationRun.requestRejectedMessage.value }}
    </AppAlert>

    <AppAlert
      v-else-if="calculationRun.serverErrorMessage.value"
      tone="danger"
      data-testid="server-error-alert"
    >
      後端出錯了（不是你的請求有問題），請稍後重試：{{ calculationRun.serverErrorMessage.value }}
      <template #action>
        <AppButton
          variant="secondary"
          size="small"
          :disabled="calculationRun.calculating.value"
          @click="calculateIndicator"
        >
          重試
        </AppButton>
      </template>
    </AppAlert>

    <AppAlert
      v-else-if="calculationRun.backendUnreachable.value"
      tone="danger"
      data-testid="unreachable-alert"
    >
      連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。
      <template #action>
        <AppButton
          variant="secondary"
          size="small"
          :disabled="calculationRun.calculating.value"
          @click="calculateIndicator"
        >
          重試
        </AppButton>
      </template>
    </AppAlert>

    <AppAlert
      v-else-if="calculationRun.calculating.value"
      tone="info"
      data-testid="calculating-alert"
    >
      計算中…算式最長可能跑上數十秒。
    </AppAlert>

    <!-- 這一整片是「這支算法」：算式、它自己的旋鈕，以及寫的時候翻一下的那份清單。 -->
    <div class="indicator-calculation-panel__workbench">
      <IndicatorScriptEditor
        v-model="scriptBody"
        class="indicator-calculation-panel__editor"
        :script-template="scriptTemplate"
        :error-message="calculationRun.messageFor('scriptBody')"
      >
        <template #toolbar>
          <!--
            這個框裡的每一樣東西——算式、指標值種類、旋鈕——都是這支策略記著的。
            對面那個「只影響這一次」是它的另一半：兩個標記擺在一起才看得出是一組，
            而這一頁只有這一個分別需要記住。
          -->
          <AppBadge variant="success">
            跟著策略存
          </AppBadge>

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

        <!--
          旋鈕與算式、指標值種類**同屬一支策略**，所以它們在同一個框裡。
          判準相同：「快線是二十期」換到哪一檔、哪種粗細、哪一段時間去算都一樣。
          彙總刻度與要看多長則在執行條件那一區——它們描述的是這一次。
        -->
        <template #footer>
          <StrategyParameterList
            :fields="strategyParameters.fields.value"
            :kind-options="strategyParameters.kindOptions"
            @add="strategyParameters.add"
            @remove="strategyParameters.remove"
            @rename="strategyParameters.rename"
            @change-kind="strategyParameters.changeKind"
            @change-value="strategyParameters.changeValue"
          />

          <AppAlert
            v-if="calculationRun.messageFor('parameters')"
            tone="danger"
            data-testid="parameters-alert"
          >
            {{ calculationRun.messageFor('parameters') }}
          </AppAlert>
        </template>
      </IndicatorScriptEditor>
    </div>
    <!-- 查「candle. 後面能接什麼」的時刻就是寫算式的時刻，所以它就在編輯區底下。 -->
    <KCandleFieldReference :fields="kCandleFields" />

    <AppPanel
      v-if="calculationRun.result.value"
      title="計算結果"
      flush
      class="indicator-calculation-panel__result"
    >
      <!-- 「這次用了多粗」與「用了幾根」是同一句話的兩半，所以並列。
           挑了一小時卻用五分鐘算出來的數字長得跟對的一模一樣，
           所以它必須看得見，而不是靠信任。 -->
      <template #meta>
        <!--
          「為什麼是這個數字」與那個數字擺在一起。
          它以前是一行常駐在執行條件底下的細字——而使用者會問這件事的時刻，
          正是他看到「實際採用 24 根」卻要了 25 根的那一刻，不是他剛打開畫面的時候。
        -->
        <span data-testid="used-candle-count">
          實際採用 {{ calculationRun.result.value.usedCandleCount }} 根
          <AppBadge
            variant="info"
            data-testid="used-interval"
          >
            每根涵蓋 {{ calculationRun.result.value.intervalLabel }}
          </AppBadge>
          <AppBadge variant="info">
            {{ calculationRun.result.value.resultTypeLabel }}
          </AppBadge>
          <span
            class="indicator-calculation-panel__notice"
            data-testid="calculation-notice"
          >只採用已經走完的那幾格——還在走的那一格不算，它的數字還會變。</span>
        </span>
      </template>

      <p
        v-if="calculationRun.result.value.isEmpty"
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
              v-for="indicatorValue in calculationRun.result.value.indicatorValues"
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
      hint="其餘內容取自畫面上目前的算式、指標值種類與參數。"
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

  // 三個欄位排成一列，按下去的那顆貼在最右邊。
  // 窄螢幕改成一欄一列——三個欄位擠在一行會讓每一格都窄到讀不出裡面的值。
  &__run-fields {
    display: grid;
    gap: spacing('sm');
    grid-template-columns: minmax(0, 1fr);
    align-items: end;

    @include respond-to('md') {
      // 交易標的要放得下代號、要看多長是「數字＋單位」兩格、刻度只是一個選單，
      // 所以前兩格分得多一些。最後一欄剛好裝下那顆按鈕。
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr) auto;
    }
  }

  &__run-action {
    // 與同一列的輸入框對齊：它們的標籤在上面，按鈕沒有標籤。
    align-self: end;
  }

  // 算式與它的旋鈕。編輯區吃掉剩下的高度——這個畫面上唯一需要空間的就是它。
  &__workbench {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: spacing('sm');
    min-height: 0;
  }

  &__editor {
    min-width: 0;
  }

  &__result-type {
    width: auto;
  }

  &__notice {
    margin: 0;
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
