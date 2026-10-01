<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import KCandleForm from '~/components/molecules/KCandleForm.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import type { KCandleApplication } from '~/application/k-candle-application'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { KCandleFieldError, type KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 有機體：一次 K 線維護的互動。
// editingKCandle 為 null 代表新增，否則代表修改那一根（身分唯讀）。
//
// 它有兩種樣子，內容一模一樣：寬螢幕上是表格旁邊的一張卡，手機上是從底部拉出的一張紙。
const {
  kCandleApplication, timeZone, editingKCandle = null, defaultSymbol = '', asSheet = false,
} = defineProps<{
  kCandleApplication: KCandleApplication
  /** 起始時間用哪一個時區填與呈現。 */
  timeZone: TimeZoneDto
  editingKCandle?: KCandleDto | null
  /** 新增時預先帶入的交易標的——沿用使用者正在瀏覽的那一個，才不必在兩處之間抄。 */
  defaultSymbol?: string
  /** 從底部拉出來，而不是一張擺在表格旁的卡。 */
  asSheet?: boolean
}>()

const emit = defineEmits<{ changed: [], cancel: [], busyChange: [boolean] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()

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
const fieldError = ref<{ field: KCandleWriteField, message: LocalizedTextVo } | null>(null)
const rejectedMessage = ref<LocalizedTextVo | null>(null)
const unexpectedFailure = ref(false)
const unreachableExplanation = ref<LocalizedTextVo | null>(null)
const serverErrorMessage = ref<LocalizedTextVo | null>(null)
const succeededAction = ref<'created' | 'updated' | 'deleted' | null>(null)
const confirmingDelete = ref(false)
// 刪除成功後這根 K 線就不存在了，表單不能再留著讓人按下儲存。
const deleted = ref(false)

const editing = computed(() => editingKCandle !== null)
const title = computed(() => editing.value
  ? t('marketData.kCandleEditorPanel.editTitle')
  : t('marketData.kCandleEditorPanel.createTitle'))

/** 存的是做成了哪一件事，不是那一句話——換語言時已經顯示的那一句才跟著換。 */
const successMessage = computed(() => {
  switch (succeededAction.value) {
    case 'created':
      return t('marketData.kCandleEditorPanel.created')
    case 'updated':
      return t('marketData.kCandleEditorPanel.updated')
    case 'deleted':
      return t('marketData.kCandleEditorPanel.deleted')
    default:
      return null
  }
})

/**
 * 照寫入規則即時檢查這份草稿：每改一格就重看一次，與按下儲存時被擋下的是同一套規則、同一句話。
 * 有任何一條不成立，儲存就按不下去。
 */
const draftIssue = computed(() => kCandleApplication.inspectKCandleDraft(buildWriteDto()))

/**
 * 使用者動過的那幾格。一張剛打開的空白草稿每一格都「還沒填」，
 * 一打開就滿版紅字等於在罵一個還沒開始的人——所以只有動過的那一格才說話。
 * 既有的那一根是整份帶進來的，一打開就該照實說（見 onMounted）。
 */
const touchedFields = ref(new Set<KCandleWriteField>())
/** 按過一次儲存之後，每一格都要說話：那是使用者在問「還差什麼」。 */
const revealsEveryIssue = ref(editingKCandle !== null)

function touchField(field: KCandleWriteField) {
  touchedFields.value = new Set(touchedFields.value).add(field)
}

/**
 * 標在欄位旁的那一句：送出時後端那一側擋下的優先（它說的是剛才那一次），
 * 否則是即時檢查的結果——只要那一格該說話。
 */
const shownFieldError = computed(() => {
  if (fieldError.value !== null) {
    return fieldError.value
  }

  const issue = draftIssue.value
  if (issue === null || !(revealsEveryIssue.value || touchedFields.value.has(issue.field))) {
    return null
  }

  return { field: issue.field, message: issue.message }
})

// 送出時被擋下的那一句是對「上一次送出的內容」說的。使用者一動手改，那句話就可能已經不成立，
// 所以一改就收起來——之後由即時檢查接手。
watch(
  [symbol, openTime, open, high, low, close, volume, quoteVolume, takerBuyBaseVolume, takerBuyQuoteVolume],
  () => {
    fieldError.value = null
  },
)

/** 表單此刻的內容，整理成一份寫入草稿。即時檢查與真的送出看的是同一份。 */
function buildWriteDto(): KCandleWriteDto {
  return new KCandleWriteDto(
    symbol.value,
    timeZone.parseMinuteInput(openTime.value),
    open.value,
    high.value,
    low.value,
    close.value,
    volume.value,
    quoteVolume.value,
    takerBuyBaseVolume.value,
    takerBuyQuoteVolume.value,
  )
}

/**
 * 關掉這張卡／這張紙。請求還在飛的時候不收：收掉的話，那次結果就沒有人接得住——
 * 與表單裡那顆取消鍵在送出中是灰的同一個道理。
 */
function requestClose() {
  if (!submitting.value) {
    emit('cancel')
  }
}

onMounted(() => {
  if (editingKCandle === null) {
    const draft = kCandleApplication.buildNewKCandleDraft(defaultSymbol)
    symbol.value = draft.symbol
    openTime.value = timeZone.formatMinuteInput(draft.openTime)
    return
  }

  symbol.value = editingKCandle.symbol
  openTime.value = timeZone.formatMinuteInput(editingKCandle.openTime)
  open.value = editingKCandle.open.toString()
  high.value = editingKCandle.high.toString()
  low.value = editingKCandle.low.toString()
  close.value = editingKCandle.close.toString()
  volume.value = editingKCandle.volume.toString()
  // 這個市場不報的數字沒有東西可以填進去，欄位就留白——填一個 0 進去，
  // 一按儲存就把「這個市場沒有這一項」寫成了「它是零」。
  quoteVolume.value = editingKCandle.quoteVolume?.toString() ?? ''
  takerBuyBaseVolume.value = editingKCandle.takerBuyBaseVolume?.toString() ?? ''
  takerBuyQuoteVolume.value = editingKCandle.takerBuyQuoteVolume?.toString() ?? ''
})

// 換時區只是換一種說法：欄位裡指的仍是同一個瞬間，以舊時區讀回、以新時區寫出。
watch(() => timeZone, (nextTimeZone, previousTimeZone) => {
  const filledInstant = previousTimeZone.parseMinuteInput(openTime.value)
  if (Number.isNaN(filledInstant.getTime())) {
    return
  }

  openTime.value = nextTimeZone.formatMinuteInput(filledInstant)
})

async function submitKCandle() {
  // 按下儲存就是在問「還差什麼」：從這一刻起每一格都說話。
  // 草稿還有不成立的規則就不送——儲存鍵本來就是灰的，這裡擋的是 Enter 那一條路。
  revealsEveryIssue.value = true
  if (draftIssue.value !== null) {
    return
  }

  startRequest()

  const writeDto = buildWriteDto()

  try {
    if (editing.value) {
      await kCandleApplication.updateKCandle(writeDto)
      finishRequest('updated')
    }
    else {
      await kCandleApplication.saveKCandle(writeDto)
      finishRequest('created')
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
      symbol.value, timeZone.parseMinuteInput(openTime.value)))
    deleted.value = true
    finishRequest('deleted')
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
  unexpectedFailure.value = false
  unreachableExplanation.value = null
  serverErrorMessage.value = null
  succeededAction.value = null
}

function finishRequest(action: 'created' | 'updated' | 'deleted') {
  submitting.value = false
  succeededAction.value = action
  emit('busyChange', false)
  emit('changed')
}

// 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
function reportFailure(error: unknown) {
  submitting.value = false
  emit('busyChange', false)

  if (error instanceof KCandleFieldError) {
    fieldError.value = { field: error.field, message: error.localizedMessage }
  }
  else if (error instanceof BackendServerError) {
    serverErrorMessage.value = error.localizedMessage
  }
  else if (error instanceof BackendRequestRejectedError) {
    rejectedMessage.value = error.localizedMessage
  }
  else if (error instanceof BackendUnreachableError) {
    unreachableExplanation.value = error.explanation
  }
  else {
    unexpectedFailure.value = true
  }
}
</script>

<template>
  <!--
    兩種外框、同一份內容：AppModal 在手機上本來就是從底部升起的那一張紙；
    寬螢幕上它不用對話框，而是一塊擺在表格旁的面板——改的時候還看得到表格。
  -->
  <component
    :is="asSheet ? AppModal : AppPanel"
    :title="title"
    :open="asSheet ? true : undefined"
    class="k-candle-editor-panel"
    :class="{ 'k-candle-editor-panel--sheet': asSheet }"
    @close="requestClose"
  >
    <template
      v-if="editing && !asSheet"
      #meta
    >
      <span class="k-candle-editor-panel__identity">{{ symbol }} · {{ openTime }}</span>
    </template>

    <template
      v-if="!asSheet"
      #actions
    >
      <AppButton
        variant="ghost"
        size="small"
        :label="t('marketData.kCandleEditorPanel.close')"
        :disabled="submitting"
        data-testid="editor-dismiss"
        @click="requestClose"
      >
        <AppIcon name="close" />
      </AppButton>
    </template>

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
      :time-zone="timeZone"
      :identity-readonly="editing"
      :submitting="submitting"
      :field-error="shownFieldError"
      :savable="draftIssue === null"
      :submit-label="editing
        ? t('marketData.kCandleEditorPanel.saveChanges')
        : t('marketData.kCandleEditorPanel.create')"
      @submit="submitKCandle"
      @touch="touchField"
      @cancel="emit('cancel')"
    >
      <template
        v-if="editing"
        #extra-actions
      >
        <AppButton
          type="button"
          variant="danger-ghost"
          :disabled="submitting"
          data-testid="delete-button"
          @click="confirmingDelete = true"
        >
          {{ t('marketData.kCandleEditorPanel.delete') }}
        </AppButton>
      </template>
    </KCandleForm>

    <AppAlert
      v-if="confirmingDelete"
      tone="warning"
      data-testid="delete-confirm"
    >
      {{ t('marketData.kCandleEditorPanel.deleteConfirm') }}
      <template #action>
        <span class="k-candle-editor-panel__confirm-actions">
          <AppButton
            variant="danger"
            size="small"
            data-testid="delete-confirm-yes"
            :disabled="submitting"
            @click="deleteKCandle"
          >
            {{ t('marketData.kCandleEditorPanel.deleteConfirmYes') }}
          </AppButton>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="submitting"
            data-testid="delete-confirm-no"
            @click="confirmingDelete = false"
          >
            {{ t('marketData.common.cancel') }}
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
          {{ t('marketData.kCandleEditorPanel.close') }}
        </AppButton>
      </template>
    </AppAlert>

    <AppAlert
      v-if="rejectedMessage || unexpectedFailure"
      tone="danger"
      data-testid="editor-rejected"
    >
      {{ rejectedMessage ? localize(rejectedMessage) : t('marketData.kCandleEditorPanel.unexpectedFailure') }}
    </AppAlert>

    <AppAlert
      v-else-if="serverErrorMessage"
      tone="danger"
      data-testid="editor-server-error"
    >
      {{ t('marketData.kCandleEditorPanel.serverError', { message: localize(serverErrorMessage) }) }}
    </AppAlert>

    <AppAlert
      v-else-if="unreachableExplanation"
      tone="danger"
      data-testid="editor-unreachable"
    >
      {{ localize(unreachableExplanation) }}
    </AppAlert>
  </component>
</template>

<style scoped lang="scss">
.k-candle-editor-panel {
  // 維護表單是暫時插進來的一塊，不跟表格搶高度。
  flex: none;

  // 正在動的是哪一根，寫在標題列上而不是表單裡——
  // 表單裡那兩個欄位是灰的（改不動），灰字不適合當這塊面板的身分證。
  &__identity {
    @include numeric;
  }

  &__confirm-actions {
    display: flex;
    gap: spacing('xs');
  }
}
</style>
