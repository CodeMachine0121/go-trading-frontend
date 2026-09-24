<script setup lang="ts">
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import KCandleTable from '~/components/organisms/KCandleTable.vue'
import KCandleEditorPanel from '~/components/organisms/KCandleEditorPanel.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 進入畫面時預先帶入的交易標的，只是省一次輸入，使用者可自行更換。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：K 線查詢這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
const { kCandleApplication, tradingSymbolApplication, timeZone, layoutDensity = null } = defineProps<{
  kCandleApplication: KCandleApplication
  tradingSymbolApplication: TradingSymbolApplication
  /** 開始時間用哪一個時區填與呈現；查到的 K 線也用它說。 */
  timeZone: TimeZoneDto
  /**
   * 現在這個寬度代表什麼。沒給時當成一台坐著用的機器——
   * 那是掛載以前第一次畫出來的樣子（見 useLayoutDensity）。
   */
  layoutDensity?: LayoutDensityDto | null
}>()

/**
 * 維護表單從底部拉出來，而不是擺在表格旁。
 * 與導覽貼到底部是同一道分界：那個寬度分不出第二欄給表單。
 */
const editorAsSheet = computed(() => layoutDensity?.usesBottomNavigation ?? false)

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
  // 與列上那顆「編輯」在忙碌時是灰的同一條規則；點整列挑一根也走這裡。
  if (editorBusy.value) {
    return
  }

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
  <section
    class="k-candle-search-panel"
    :class="{ 'k-candle-search-panel--editing': editorOpen && !editorAsSheet }"
  >
    <KCandleTable
      :result="result"
      :time-zone="timeZone"
      :selected-k-candle="editorOpen ? editingKCandle : null"
      selectable
      class="k-candle-search-panel__table"
      @select="startEditing"
    >
      <!-- 查詢列畫在結果那張卡的頂端：條件與它查出來的東西是同一張卡。 -->
      <template #query>
        <KCandleQueryForm
          v-model:start-time="startTime"
          :time-zone="timeZone"
          :loading="loading"
          :start-time-error="startTimeError"
          @submit="searchKCandles"
        >
          <template #symbol>
            <SymbolField
              v-model="symbol"
              :trading-symbol-application="tradingSymbolApplication"
              :error-message="symbolError"
            />
          </template>
        </KCandleQueryForm>

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
      </template>

      <!-- 維護入口掛在結果那一塊的標題列上：要動哪一根，就在看得到它的地方動。 -->
      <template #actions>
        <AppButton
          size="small"
          :disabled="editorOpen"
          data-testid="create-button"
          @click="startCreating"
        >
          <AppIcon
            name="plus"
            size="small"
          />
          新增 K 線
        </AppButton>
      </template>

      <!-- 整列點得到之外仍留這顆鍵：鍵盤走得到它，而一整列不是一個可以 Tab 到的東西。 -->
      <template #row-actions="{ kCandle }">
        <AppButton
          variant="ghost"
          size="small"
          :disabled="editorBusy"
          data-testid="edit-button"
          @click.stop="startEditing(kCandle)"
        >
          編輯
        </AppButton>
      </template>
    </KCandleTable>

    <KCandleEditorPanel
      v-if="editorOpen"
      :key="editingKCandle ? editingKCandle.openTime.toISOString() : 'new'"
      :k-candle-application="kCandleApplication"
      :time-zone="timeZone"
      :editing-k-candle="editingKCandle"
      :default-symbol="symbol"
      :as-sheet="editorAsSheet"
      class="k-candle-search-panel__editor"
      @changed="searchKCandles"
      @cancel="closeEditor"
      @busy-change="editorBusy = $event"
    />
  </section>
</template>

<style scoped lang="scss">
.k-candle-search-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;

  // 表格與表單上下疊的那一段寬度，表單擺在表格上面：
  // 按下「編輯」之後，要看的東西出現在眼前，而不是一整張表格的底下。
  &__editor {
    order: -1;
  }

  // 寬螢幕上表單是表格旁邊的一張卡：改的時候那一列仍然亮著、看得到。
  &--editing {
    @include respond-to('lg') {
      display: grid;
      align-items: start;
      grid-template-columns: minmax(0, 1fr) 22.5rem;

      // 這一列吃滿整個工作區的高度：表格在自己的框裡捲，不把整頁撐長。
      grid-template-rows: minmax(0, 1fr);
    }
  }

  &--editing &__table {
    @include respond-to('lg') {
      align-self: stretch;
    }
  }

  // 表單比工作區高時，它自己捲——不把旁邊那張表格一起推走。
  &--editing &__editor {
    @include respond-to('lg') {
      order: 0;
      max-height: 100%;
      overflow-y: auto;
    }
  }
}
</style>
