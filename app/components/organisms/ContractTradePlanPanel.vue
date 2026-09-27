<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const

const { record, setupTags, busy = false, failureMessage = null, timeZoneIdentifier } = defineProps<{
  record: ContractTradeRecordDto
  setupTags: readonly TradeTagDto[]
  busy?: boolean
  failureMessage?: string | null
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{
  savePlan: [plannedStopLossText: string, plannedTakeProfitText: string, entryReason: string, confidence: number | null]
  addNote: [content: string]
  amendFill: [fill: ContractTradeFillDto, priceText: string, quantityText: string, feeText: string]
  removeFill: [fillId: number]
  assignSetupTags: [setupTagIds: number[]]
  createSetupTag: [name: string]
}>()

const editingPlan = ref(false)
const planStopLossText = ref('')
const planTakeProfitText = ref('')
const planEntryReason = ref('')
const planConfidence = ref('')
const editingFillId = ref<number | null>(null)
const fillPriceText = ref('')
const fillQuantityText = ref('')
const fillFeeText = ref('')
const noteText = ref('')

watch(() => record, () => {
  editingPlan.value = false
  editingFillId.value = null
  noteText.value = ''
})

const setupTagIds = computed({
  get: () => record.setupTags.map(tag => tag.id),
  set: (ids: number[]) => emit('assignSetupTags', ids),
})
</script>

<template>
  <div class="contract-trade-plan-panel">
    <AppPanel title="成交">
      <ul class="contract-trade-plan-panel__fills">
        <li
          v-for="fill in record.fills"
          :key="fill.id"
          class="contract-trade-plan-panel__fill"
          :data-testid="`detail-fill-${fill.id}`"
        >
          <template v-if="editingFillId === fill.id">
            <AppInput
              v-model="fillPriceText"
              inputmode="decimal"
              data-testid="detail-fill-price"
            />
            <AppInput
              v-model="fillQuantityText"
              inputmode="decimal"
              data-testid="detail-fill-quantity"
            />
            <AppInput
              v-model="fillFeeText"
              inputmode="decimal"
              data-testid="detail-fill-fee"
            />
            <AppButton
              size="small"
              :disabled="busy"
              data-testid="detail-fill-save"
              @click="emit('amendFill', fill, fillPriceText, fillQuantityText, fillFeeText)"
            >
              儲存
            </AppButton>
            <AppButton
              size="small"
              variant="ghost"
              data-testid="detail-fill-cancel"
              @click="editingFillId = null"
            >
              取消
            </AppButton>
          </template>
          <template v-else>
            <span class="contract-trade-plan-panel__fill-kind">{{ fill.kindLabel }}</span>
            <span>{{ formatDateTimeInTimeZone(fill.filledAt, timeZoneIdentifier) }}</span>
            <span class="contract-trade-plan-panel__number">{{ fill.priceText }} × {{ fill.quantityText }}</span>
            <span class="contract-trade-plan-panel__number">{{ fill.liquidityLabel }} 手續費 {{ fill.feeText }}</span>
            <small
              v-if="fill.feeNote"
              class="contract-trade-plan-panel__note"
            >{{ fill.feeNote }}</small>
            <template v-if="record.canEditFills">
              <AppButton
                size="small"
                variant="ghost"
                :disabled="busy"
                data-testid="detail-fill-edit"
                @click="editingFillId = fill.id; fillPriceText = fill.price.toString(); fillQuantityText = fill.quantity.toString(); fillFeeText = fill.fee.toString()"
              >
                修改
              </AppButton>
              <AppButton
                size="small"
                variant="danger-ghost"
                :disabled="busy"
                data-testid="detail-fill-remove"
                @click="emit('removeFill', fill.id)"
              >
                刪除
              </AppButton>
            </template>
          </template>
        </li>
      </ul>
    </AppPanel>

    <AppPanel title="進場時的計畫">
      <template #actions>
        <AppBadge
          v-if="record.planLocked"
          data-testid="plan-locked"
        >
          已鎖定
        </AppBadge>
      </template>

      <div
        v-if="editingPlan && !record.planLocked"
        class="contract-trade-plan-panel__form"
      >
        <FormField label="計畫止損">
          <AppInput
            v-model="planStopLossText"
            inputmode="decimal"
            data-testid="plan-stop-loss"
          />
        </FormField>
        <FormField label="計畫止盈">
          <AppInput
            v-model="planTakeProfitText"
            inputmode="decimal"
            data-testid="plan-take-profit"
          />
        </FormField>
        <FormField label="信心">
          <AppSelect
            v-model="planConfidence"
            data-testid="plan-confidence"
          >
            <option value="">
              不填
            </option>
            <option
              v-for="level in CONFIDENCE_LEVELS"
              :key="level"
              :value="String(level)"
            >
              {{ level }} / 5
            </option>
          </AppSelect>
        </FormField>
        <FormField label="進場理由">
          <AppTextarea
            v-model="planEntryReason"
            data-testid="plan-entry-reason"
          />
        </FormField>
        <div class="contract-trade-plan-panel__actions">
          <AppButton
            :disabled="busy"
            data-testid="plan-save"
            @click="emit('savePlan', planStopLossText, planTakeProfitText, planEntryReason, planConfidence === '' ? null : Number(planConfidence))"
          >
            儲存計畫
          </AppButton>
          <AppButton
            variant="ghost"
            data-testid="plan-cancel"
            @click="editingPlan = false"
          >
            取消
          </AppButton>
        </div>
      </div>

      <dl
        v-else
        class="contract-trade-plan-panel__plan"
        data-testid="plan-summary"
      >
        <div>
          <dt>計畫止損</dt>
          <dd>{{ record.plannedStopLossText }}</dd>
        </div>
        <div>
          <dt>計畫止盈</dt>
          <dd>{{ record.plannedTakeProfitText }}</dd>
        </div>
        <div>
          <dt>信心</dt>
          <dd>{{ record.confidence === null ? '未填' : `${record.confidence} / 5` }}</dd>
        </div>
        <div class="contract-trade-plan-panel__reason">
          <dt>進場理由</dt>
          <dd>{{ record.entryReason || '未填' }}</dd>
        </div>
      </dl>

      <AppButton
        v-if="!record.planLocked && !editingPlan"
        variant="secondary"
        size="small"
        data-testid="plan-edit"
        @click="planStopLossText = record.plannedStopLossPrice?.toString() ?? ''; planTakeProfitText = record.plannedTakeProfitPrice?.toString() ?? ''; planEntryReason = record.entryReason; planConfidence = record.confidence === null ? '' : String(record.confidence); editingPlan = true"
      >
        修改計畫
      </AppButton>

      <FormField
        label="型態標籤"
        grouped
      >
        <TradeTagPicker
          v-model:selected-ids="setupTagIds"
          :tags="setupTags"
          :disabled="busy"
          @create="name => emit('createSetupTag', name)"
        />
      </FormField>
    </AppPanel>

    <AppPanel title="附註">
      <ol
        v-if="record.notes.length > 0"
        class="contract-trade-plan-panel__notes"
        data-testid="notes"
      >
        <li
          v-for="note in record.notes"
          :key="note.id"
        >
          <time class="contract-trade-plan-panel__note">{{ formatDateTimeInTimeZone(note.createdAt, timeZoneIdentifier) }}</time>
          <p>{{ note.content }}</p>
        </li>
      </ol>
      <div class="contract-trade-plan-panel__add-note">
        <AppTextarea
          v-model="noteText"
          placeholder="加一則附註"
          data-testid="note-input"
        />
        <AppButton
          variant="secondary"
          size="small"
          :disabled="busy || noteText.trim() === ''"
          data-testid="note-add"
          @click="emit('addNote', noteText)"
        >
          加附註
        </AppButton>
      </div>
    </AppPanel>

    <AppAlert
      v-if="failureMessage"
      tone="danger"
      data-testid="detail-action-failure"
    >
      {{ failureMessage }}
    </AppAlert>
  </div>
</template>

<style scoped lang="scss">
.contract-trade-plan-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__fills,
  &__notes {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__fill {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding-bottom: spacing('xs');
    color: color('text');
    font-size: font-size('xs');
  }

  &__fill-kind {
    color: color('text-strong');
    font-weight: font-weight('medium');
  }

  &__number {
    @include numeric;
  }

  &__note {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__form {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('md') {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__plan {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: spacing('sm');
    margin: 0 0 spacing('sm');

    dt {
      color: color('text-faint');
      font-size: font-size('2xs');
    }

    dd {
      margin: 0;
      color: color('text-strong');
      font-size: font-size('sm');
    }
  }

  &__reason {
    grid-column: 1 / -1;
  }

  &__actions,
  &__add-note {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: flex-end;
  }
}
</style>
