<script setup lang="ts">
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'
import KCandleTable from '~/components/organisms/KCandleTable.vue'
import KCandleEditorPanel from '~/components/organisms/KCandleEditorPanel.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 進入畫面時預先帶入的交易標的，只是省一次輸入，使用者可自行更換。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：K 線查詢這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
const { kCandleApplication, tradingSymbolApplication, timeZone } = defineProps<{
  kCandleApplication: KCandleApplication
  tradingSymbolApplication: TradingSymbolApplication
  /** 開始時間用哪一個時區填與呈現；查到的 K 線也用它說。 */
  timeZone: TimeZoneDto
}>()

const symbol = ref('')
const startTime = ref('')

const loading = ref(false)
const result = ref<KCandleSearchResultDto | null>(null)
const symbolError = ref<string | null>(null)
const startTimeError = ref<string | null>(null)
const rejectedMessage = ref<string | null>(null)
const backendUnreachable = ref(false)
const serverErrorMessage = ref<string | null>(null)

// 維護狀態：null 代表沒在維護；editingKCandle 為 null 但 editorOpen 為真代表正在新增。
const editorOpen = ref(false)
const editingKCandle = ref<KCandleDto | null>(null)
// 維護請求進行中時不得切換到別根——切換會把面板換掉，正在飛的那次結果就沒人接得住。
const editorBusy = ref(false)

function startCreating() {
  editingKCandle.value = null
  editorOpen.value = true
}

function startEditing(kCandle: KCandleDto) {
  editingKCandle.value = kCandle
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingKCandle.value = null
  editorBusy.value = false
}

// 預設開始時間在進入畫面時才取，避免伺服器端與瀏覽器端取到不同的「目前時間」。
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

async function searchKCandles() {
  loading.value = true
  symbolError.value = null
  startTimeError.value = null
  rejectedMessage.value = null
  backendUnreachable.value = false
  serverErrorMessage.value = null
  result.value = null

  try {
    // 只送開始時間：查到哪裡為止是領域的事——它一律查到送出當下。
    result.value = await kCandleApplication.searchKCandles(new KCandleQueryDto(
      symbol.value,
      timeZone.parseMinuteInput(startTime.value),
    ))
  }
  catch (error: unknown) {
    // 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
    if (error instanceof KCandleQueryValidationError) {
      if (error.field === 'symbol') {
        symbolError.value = error.message
      }
      else {
        startTimeError.value = error.message
      }
    }
    else if (error instanceof BackendServerError) {
      serverErrorMessage.value = error.message
    }
    else if (error instanceof BackendRequestRejectedError) {
      rejectedMessage.value = error.message
    }
    else if (error instanceof BackendUnreachableError) {
      backendUnreachable.value = true
    }
    else {
      rejectedMessage.value = '查詢時發生未預期的錯誤。'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="k-candle-search-panel">
    <AppPanel title="查詢條件">
      <KCandleQueryForm
        v-model:symbol="symbol"
        v-model:start-time="startTime"
        :trading-symbol-application="tradingSymbolApplication"
        :time-zone="timeZone"
        :loading="loading"
        :symbol-error="symbolError"
        :start-time-error="startTimeError"
        @submit="searchKCandles"
      />

      <AppAlert
        v-if="rejectedMessage"
        tone="danger"
        data-testid="rejected-alert"
      >
        {{ rejectedMessage }}
      </AppAlert>

      <AppAlert
        v-else-if="serverErrorMessage"
        tone="danger"
        data-testid="server-error-alert"
      >
        後端出錯了（不是你的查詢條件有問題），請稍後重試：{{ serverErrorMessage }}
        <template #action>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="loading"
            @click="searchKCandles"
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
            :disabled="loading"
            @click="searchKCandles"
          >
            重試
          </AppButton>
        </template>
      </AppAlert>

      <AppAlert
        v-else-if="loading"
        tone="info"
        data-testid="loading-alert"
      >
        查詢中…
      </AppAlert>
    </AppPanel>

    <KCandleEditorPanel
      v-if="editorOpen"
      :key="editingKCandle ? editingKCandle.openTime.toISOString() : 'new'"
      :k-candle-application="kCandleApplication"
      :time-zone="timeZone"
      :editing-k-candle="editingKCandle"
      :default-symbol="symbol"
      @changed="searchKCandles"
      @cancel="closeEditor"
      @busy-change="editorBusy = $event"
    />

    <KCandleTable
      :result="result"
      :time-zone="timeZone"
    >
      <!-- 維護入口掛在結果那一塊的標題列上：要動哪一根，就在看得到它的地方動。 -->
      <template #actions>
        <AppButton
          variant="secondary"
          size="small"
          :disabled="editorOpen"
          data-testid="create-button"
          @click="startCreating"
        >
          新增 K 線
        </AppButton>
      </template>

      <template #row-actions="{ kCandle }">
        <AppButton
          variant="ghost"
          size="small"
          :disabled="editorBusy"
          data-testid="edit-button"
          @click="startEditing(kCandle)"
        >
          編輯
        </AppButton>
      </template>
    </KCandleTable>
  </section>
</template>

<style scoped lang="scss">
.k-candle-search-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;
}
</style>
