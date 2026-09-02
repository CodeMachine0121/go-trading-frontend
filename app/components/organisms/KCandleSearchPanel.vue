<script setup lang="ts">
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'
import KCandleTable from '~/components/organisms/KCandleTable.vue'
import KCandleEditorPanel from '~/components/organisms/KCandleEditorPanel.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { formatUtcMinuteInput, parseUtcMinuteInput } from '~/utilities/utc-time-format'

/** 進入畫面時預先帶入的交易標的，只是省一次輸入，使用者可自行更換。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：K 線查詢這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
const { kCandleApplication } = defineProps<{ kCandleApplication: KCandleApplication }>()

const symbol = ref('')
const startTime = ref('')
const endTime = ref('')

const loading = ref(false)
const result = ref<KCandleSearchResultDto | null>(null)
const symbolError = ref<string | null>(null)
const startTimeError = ref<string | null>(null)
const endTimeError = ref<string | null>(null)
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

// 預設區間在進入畫面時才取，避免伺服器端與瀏覽器端取到不同的「目前時間」。
onMounted(() => {
  const defaultQuery = kCandleApplication.buildDefaultQuery(DEFAULT_SYMBOL)
  symbol.value = defaultQuery.symbol
  startTime.value = formatUtcMinuteInput(defaultQuery.startTime)
  endTime.value = formatUtcMinuteInput(defaultQuery.endTime)
})

async function searchKCandles() {
  loading.value = true
  symbolError.value = null
  startTimeError.value = null
  endTimeError.value = null
  rejectedMessage.value = null
  backendUnreachable.value = false
  serverErrorMessage.value = null
  result.value = null

  try {
    result.value = await kCandleApplication.searchKCandles(new KCandleQueryDto(
      symbol.value,
      parseUtcMinuteInput(startTime.value),
      parseUtcMinuteInput(endTime.value),
    ))
  }
  catch (error: unknown) {
    // 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
    if (error instanceof KCandleQueryValidationError) {
      if (error.field === 'symbol') {
        symbolError.value = error.message
      }
      else if (error.field === 'startTime') {
        startTimeError.value = error.message
      }
      else {
        endTimeError.value = error.message
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
    <div class="k-candle-search-panel__query">
      <KCandleQueryForm
        v-model:symbol="symbol"
        v-model:start-time="startTime"
        v-model:end-time="endTime"
        :loading="loading"
        :symbol-error="symbolError"
        :start-time-error="startTimeError"
        :end-time-error="endTimeError"
        @submit="searchKCandles"
      />
    </div>

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

    <div class="k-candle-search-panel__maintenance">
      <span class="k-candle-search-panel__maintenance-label">手動維護 K 線</span>
      <AppButton
        variant="secondary"
        :disabled="editorOpen"
        data-testid="create-button"
        @click="startCreating"
      >
        新增 K 線
      </AppButton>
    </div>

    <KCandleEditorPanel
      v-if="editorOpen"
      :key="editingKCandle ? editingKCandle.openTime.toISOString() : 'new'"
      :k-candle-application="kCandleApplication"
      :editing-k-candle="editingKCandle"
      :default-symbol="symbol"
      @changed="searchKCandles"
      @cancel="closeEditor"
      @busy-change="editorBusy = $event"
    />

    <KCandleTable
      v-if="result"
      :result="result"
    >
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
  flex-direction: column;
  gap: spacing('lg');

  // 查詢條件收成一張卡，才不會一整排欄位懸在頁面底色上
  &__query {
    @include surface('md');
  }

  &__maintenance {
    display: flex;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid color('border');
    padding-top: spacing('md');
  }

  &__maintenance-label {
    color: color('text-muted');
    font-size: font-size('sm');
  }
}
</style>
