<script setup lang="ts">
import KCandleForm from '~/components/molecules/KCandleForm.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'
import { KCandleFieldError, type KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { formatUtcMinuteInput, parseUtcMinuteInput } from '~/utilities/utc-time-format'

// 有機體：一次 K 線維護的互動。
// editingKCandle 為 null 代表新增，否則代表修改那一根（身分唯讀）。
const { kCandleApplication, editingKCandle = null, defaultSymbol = '' } = defineProps<{
  kCandleApplication: KCandleApplication
  editingKCandle?: KCandleDto | null
  /** 新增時預先帶入的交易標的——沿用使用者正在瀏覽的那一個，才不必在兩處之間抄。 */
  defaultSymbol?: string
}>()

const emit = defineEmits<{ changed: [], cancel: [], busyChange: [boolean] }>()

const symbol = ref('')
const openTime = ref('')
const open = ref('')
const high = ref('')
const low = ref('')
const close = ref('')
const volume = ref('')
const quoteVolume = ref('')
const takerBuyBaseVolume = ref('')
const takerBuyQuoteVolume = ref('')

const submitting = ref(false)
const fieldError = ref<{ field: KCandleWriteField, message: string } | null>(null)
const rejectedMessage = ref<string | null>(null)
const backendUnreachable = ref(false)
const successMessage = ref<string | null>(null)
const confirmingDelete = ref(false)
// 刪除成功後這根 K 線就不存在了，表單不能再留著讓人按下儲存。
const deleted = ref(false)

const editing = computed(() => editingKCandle !== null)

onMounted(() => {
  if (editingKCandle === null) {
    const draft = kCandleApplication.buildNewKCandleDraft(defaultSymbol)
    symbol.value = draft.symbol
    openTime.value = formatUtcMinuteInput(draft.openTime)
    return
  }

  symbol.value = editingKCandle.symbol
  openTime.value = formatUtcMinuteInput(editingKCandle.openTime)
  open.value = editingKCandle.open.toString()
  high.value = editingKCandle.high.toString()
  low.value = editingKCandle.low.toString()
  close.value = editingKCandle.close.toString()
  volume.value = editingKCandle.volume.toString()
  quoteVolume.value = editingKCandle.quoteVolume.toString()
  takerBuyBaseVolume.value = editingKCandle.takerBuyBaseVolume.toString()
  takerBuyQuoteVolume.value = editingKCandle.takerBuyQuoteVolume.toString()
})

async function submitKCandle() {
  startRequest()

  const writeDto = new KCandleWriteDto(
    symbol.value,
    parseUtcMinuteInput(openTime.value),
    open.value,
    high.value,
    low.value,
    close.value,
    volume.value,
    quoteVolume.value,
    takerBuyBaseVolume.value,
    takerBuyQuoteVolume.value,
  )

  try {
    if (editing.value) {
      await kCandleApplication.updateKCandle(writeDto)
      finishRequest('已更新這根 K 線')
    }
    else {
      await kCandleApplication.saveKCandle(writeDto)
      finishRequest('已新增這根 K 線')
    }
  }
  catch (error: unknown) {
    reportFailure(error)
  }
}

async function deleteKCandle() {
  startRequest()
  confirmingDelete.value = false

  try {
    await kCandleApplication.deleteKCandle(new KCandleIdentityDto(
      symbol.value, parseUtcMinuteInput(openTime.value)))
    deleted.value = true
    finishRequest('已刪除這根 K 線')
  }
  catch (error: unknown) {
    reportFailure(error)
  }
}

function startRequest() {
  submitting.value = true
  confirmingDelete.value = false
  emit('busyChange', true)
  fieldError.value = null
  rejectedMessage.value = null
  backendUnreachable.value = false
  successMessage.value = null
}

function finishRequest(message: string) {
  submitting.value = false
  successMessage.value = message
  emit('busyChange', false)
  emit('changed')
}

// 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
function reportFailure(error: unknown) {
  submitting.value = false
  emit('busyChange', false)

  if (error instanceof KCandleFieldError) {
    fieldError.value = { field: error.field, message: error.message }
  }
  else if (error instanceof BackendRequestRejectedError) {
    rejectedMessage.value = error.message
  }
  else if (error instanceof BackendUnreachableError) {
    backendUnreachable.value = true
  }
  else {
    rejectedMessage.value = '維護這根 K 線時發生未預期的錯誤。'
  }
}
</script>

<template>
  <section class="k-candle-editor-panel">
    <h2 class="k-candle-editor-panel__title">
      {{ editing ? '修改 K 線' : '新增 K 線' }}
    </h2>

    <KCandleForm
      v-if="!deleted"
      v-model:symbol="symbol"
      v-model:open-time="openTime"
      v-model:open="open"
      v-model:high="high"
      v-model:low="low"
      v-model:close="close"
      v-model:volume="volume"
      v-model:quote-volume="quoteVolume"
      v-model:taker-buy-base-volume="takerBuyBaseVolume"
      v-model:taker-buy-quote-volume="takerBuyQuoteVolume"
      :identity-readonly="editing"
      :submitting="submitting"
      :field-error="fieldError"
      :submit-label="editing ? '儲存變更' : '新增'"
      @submit="submitKCandle"
      @cancel="emit('cancel')"
    >
      <template
        v-if="editing"
        #extra-actions
      >
        <AppButton
          type="button"
          variant="danger"
          :disabled="submitting"
          data-testid="delete-button"
          @click="confirmingDelete = true"
        >
          刪除
        </AppButton>
      </template>
    </KCandleForm>

    <AppAlert
      v-if="confirmingDelete"
      tone="warning"
      data-testid="delete-confirm"
    >
      確定刪除這根 K 線嗎？刪掉之後就找不回來了。
      <template #action>
        <span class="k-candle-editor-panel__confirm-actions">
          <AppButton
            variant="danger"
            size="small"
            data-testid="delete-confirm-yes"
            :disabled="submitting"
            @click="deleteKCandle"
          >
            確定刪除
          </AppButton>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="submitting"
            data-testid="delete-confirm-no"
            @click="confirmingDelete = false"
          >
            取消
          </AppButton>
        </span>
      </template>
    </AppAlert>

    <AppAlert
      v-if="successMessage"
      tone="success"
      data-testid="editor-success"
    >
      {{ successMessage }}
      <template
        v-if="deleted"
        #action
      >
        <AppButton
          variant="secondary"
          size="small"
          data-testid="editor-close"
          @click="emit('cancel')"
        >
          關閉
        </AppButton>
      </template>
    </AppAlert>

    <AppAlert
      v-if="rejectedMessage"
      tone="danger"
      data-testid="editor-rejected"
    >
      {{ rejectedMessage }}
    </AppAlert>

    <AppAlert
      v-else-if="backendUnreachable"
      tone="danger"
      data-testid="editor-unreachable"
    >
      連不上後端 go-trading API，請確認它已啟動。
    </AppAlert>
  </section>
</template>

<style scoped lang="scss">
.k-candle-editor-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('md');
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('lg');

  &__title {
    margin: 0;
  }

  &__confirm-actions {
    display: flex;
    gap: spacing('xs');
  }
}
</style>
