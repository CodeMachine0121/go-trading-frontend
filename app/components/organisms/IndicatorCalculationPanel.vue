<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
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
const { indicatorCalculationApplication } = defineProps<{
  indicatorCalculationApplication: IndicatorCalculationApplication
}>()

const symbol = ref('BTCUSDT')
const candleCount = ref('20')
const scriptBody = ref('')
// 種類與內容是兩個各自獨立的狀態：換種類只換外框，使用者寫到一半的內容一字不動。
const resultType = ref<string>(indicatorCalculationApplication.defaultResultType())

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
  <section class="indicator-calculation-panel">
    <AppAlert
      tone="info"
      data-testid="calculation-notice"
    >
      計算一律排除最新一根 K 線，因為它涵蓋的五分鐘尚未走完；算式只能做純運算，碰不到檔案、網路與時間。
    </AppAlert>

    <form
      class="indicator-calculation-panel__form"
      @submit.prevent="calculateIndicator"
    >
      <div class="indicator-calculation-panel__conditions">
        <FormField
          label="交易標的"
          hint="例如 BTCUSDT"
          :error-message="messageFor('symbol')"
        >
          <AppInput
            v-model="symbol"
            type="text"
            :invalid="Boolean(messageFor('symbol'))"
            data-testid="symbol-input"
          />
        </FormField>

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
          label="指標值種類"
          hint="決定算式要回傳什麼形狀，外框跟著變"
        >
          <AppSelect
            v-model="resultType"
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
        </FormField>
      </div>

      <IndicatorScriptEditor
        v-model="scriptBody"
        :script-template="scriptTemplate"
        :error-message="messageFor('scriptBody')"
      />

      <div class="indicator-calculation-panel__actions">
        <AppButton
          type="submit"
          :disabled="calculating"
          data-testid="calculate-button"
        >
          {{ calculating ? '計算中…' : '執行計算' }}
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          data-testid="example-button"
          @click="fillExampleScriptBody"
        >
          帶入範例內容
        </AppButton>
      </div>
    </form>

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
      連不上後端 go-trading API，請確認它已啟動。
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
          實際採用 {{ result.usedCandleCount }} 根 · 指標值種類：{{ result.resultTypeLabel }}
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
            <td>{{ indicatorValue.name }}</td>
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
              <template v-else>
                {{ indicatorValue.displayValues[0] }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<style scoped lang="scss">
.indicator-calculation-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

  &__form {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
  }

  &__conditions {
    display: grid;
    gap: spacing('md');
    grid-template-columns: 1fr;

    @include respond-to('md') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__actions {
    display: flex;
    gap: spacing('sm');
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
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__series {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    margin: 0;
    justify-content: flex-end;
    padding: 0;
    list-style: none;
  }

  &__series-item {
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: 0 spacing('2xs');
  }

  &__empty-series {
    color: color('text-muted');
  }

  &__empty {
    margin: 0;
    border: 1px dashed color('border');
    border-radius: radius('md');
    padding: spacing('lg');
    color: color('text-muted');
    text-align: center;
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
      font-weight: font-weight('medium');
    }

    tbody tr:last-child td {
      border-bottom: none;
    }
  }
}
</style>
