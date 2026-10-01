<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import KCandleContractTable from '~/components/organisms/KCandleContractTable.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import type { KCandleContractSearchResultDto } from '~/domain/models/dto/k-candle-contract-search-result-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 進入畫面時預先帶入的合約標的，只是省一次挑選，不在清單上就會被換掉。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：合約 K 線查詢這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
//
// **這裡只讀。** 合約 K 線由背景同步進來，沒有新增、編輯、刪除的入口。
const { kCandleApplication, tradingSymbolApplication, timeZone } = defineProps<{
  kCandleApplication: KCandleApplication
  tradingSymbolApplication: TradingSymbolApplication
  /** 開始時間用哪一個時區填與呈現；查到的 K 線也用它說。 */
  timeZone: TimeZoneDto
}>()

const symbol = ref('')
const startTime = ref('')

const loading = ref(false)
const result = ref<KCandleContractSearchResultDto | null>(null)
const symbolError = ref<LocalizedTextVo | null>(null)
const startTimeError = ref<LocalizedTextVo | null>(null)
const rejectedMessage = ref<LocalizedTextVo | null>(null)
const unexpectedFailure = ref(false)
const unreachableExplanation = ref<LocalizedTextVo | null>(null)
const serverErrorMessage = ref<LocalizedTextVo | null>(null)

const { t } = useI18n()
const { localize } = useLocalizedText()

// 預設開始時間在進入畫面時才取——與現貨那一塊同一個預設，由同一個地方說。
onMounted(() => {
  const defaultQuery = kCandleApplication.buildDefaultQuery(DEFAULT_SYMBOL)
  symbol.value = defaultQuery.symbol
  startTime.value = timeZone.formatMinuteInput(defaultQuery.startTime)
})

// 換時區只是換一種說法：欄位裡指的仍是同一個瞬間，以舊時區讀回、以新時區寫出。
watch(() => timeZone, (nextTimeZone, previousTimeZone) => {
  const filledInstant = previousTimeZone.parseMinuteInput(startTime.value)
  if (Number.isNaN(filledInstant.getTime())) {
    return
  }

  startTime.value = nextTimeZone.formatMinuteInput(filledInstant)
})

async function searchKCandleContracts() {
  loading.value = true
  symbolError.value = null
  startTimeError.value = null
  rejectedMessage.value = null
  unexpectedFailure.value = false
  unreachableExplanation.value = null
  serverErrorMessage.value = null
  result.value = null

  try {
    result.value = await kCandleApplication.searchKCandleContracts(new KCandleQueryDto(
      symbol.value,
      timeZone.parseMinuteInput(startTime.value),
    ))
  }
  catch (error: unknown) {
    // 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
    if (error instanceof KCandleQueryValidationError) {
      if (error.field === 'symbol') {
        symbolError.value = error.localizedMessage
      }
      else {
        startTimeError.value = error.localizedMessage
      }
    }
    else if (error instanceof BackendServerError) {
      serverErrorMessage.value = error.localizedMessage
    }
    else if (error instanceof BackendRequestRejectedError) {
      rejectedMessage.value = error.localizedMessage
    }
    else if (error instanceof BackendUnreachableError) {
      unreachableExplanation.value = error.localizedMessage
    }
    else {
      unexpectedFailure.value = true
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="k-candle-contract-search-panel">
    <!-- 查詢列畫在結果那張卡的頂端：條件與它查出來的東西是同一張卡。 -->
    <KCandleContractTable
      :result="result"
      :time-zone="timeZone"
    >
      <template #query>
        <KCandleQueryForm
          v-model:start-time="startTime"
          :time-zone="timeZone"
          :loading="loading"
          :start-time-error="startTimeError ? localize(startTimeError) : null"
          @submit="searchKCandleContracts"
        >
          <template #symbol>
            <ContractSymbolField
              v-model="symbol"
              :trading-symbol-application="tradingSymbolApplication"
              :error-message="symbolError ? localize(symbolError) : null"
            />
          </template>
        </KCandleQueryForm>

        <AppAlert
          v-if="rejectedMessage || unexpectedFailure"
          tone="danger"
          data-testid="rejected-alert"
        >
          {{ rejectedMessage ? localize(rejectedMessage) : t('marketData.common.unexpectedSearchFailure') }}
        </AppAlert>

        <AppAlert
          v-else-if="serverErrorMessage"
          tone="danger"
          data-testid="server-error-alert"
        >
          {{ t('marketData.common.searchServerError', { message: localize(serverErrorMessage) }) }}
          <template #action>
            <AppButton
              variant="secondary"
              size="small"
              :disabled="loading"
              @click="searchKCandleContracts"
            >
              {{ t('marketData.common.retry') }}
            </AppButton>
          </template>
        </AppAlert>

        <AppAlert
          v-else-if="unreachableExplanation"
          tone="danger"
          data-testid="unreachable-alert"
        >
          {{ localize(unreachableExplanation) }}
          <template #action>
            <AppButton
              variant="secondary"
              size="small"
              :disabled="loading"
              @click="searchKCandleContracts"
            >
              {{ t('marketData.common.retry') }}
            </AppButton>
          </template>
        </AppAlert>

        <AppAlert
          v-else-if="loading"
          tone="info"
          data-testid="loading-alert"
        >
          {{ t('marketData.common.searching') }}
        </AppAlert>
      </template>
    </KCandleContractTable>
  </section>
</template>

<style scoped lang="scss">
.k-candle-contract-search-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;
}
</style>
