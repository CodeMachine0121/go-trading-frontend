<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

const { record, setupTags, busy = false } = defineProps<{
  record: ContractTradeRecordDto
  setupTags: readonly TradeTagDto[]
  busy?: boolean
}>()

const emit = defineEmits<{
  savePlan: [plannedStopLossText: string, plannedTakeProfitText: string, entryReason: string, confidence: number | null]
  assignSetupTags: [setupTagIds: number[]]
  createSetupTag: [name: string]
}>()

const editingPlan = ref(false)
const planStopLossText = ref('')
const planTakeProfitText = ref('')
const planEntryReason = ref('')
const planConfidence = ref<number | null>(null)

watch(() => record, () => {
  editingPlan.value = false
})

const setupTagIds = computed({
  get: () => record.setupTags.map(tag => tag.id),
  set: (ids: number[]) => emit('assignSetupTags', ids),
})
</script>

<template>
  <AppPanel title="進場時的我">
    <template #actions>
      <AppBadge
        v-if="record.planLocked"
        data-testid="plan-locked"
      >
        已鎖定
      </AppBadge>
    </template>

    <div class="contract-trade-plan-panel">
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
        <FormField
          label="信心"
          grouped
        >
          <AppRating
            v-model="planConfidence"
            label="信心"
            data-testid="plan-confidence"
          />
        </FormField>
        <FormField
          label="進場理由"
          class="contract-trade-plan-panel__wide"
        >
          <AppTextarea
            v-model="planEntryReason"
            data-testid="plan-entry-reason"
          />
        </FormField>
        <div class="contract-trade-plan-panel__actions">
          <AppButton
            :disabled="busy"
            data-testid="plan-save"
            @click="emit('savePlan', planStopLossText, planTakeProfitText, planEntryReason, planConfidence)"
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

      <template v-else>
        <blockquote
          class="contract-trade-plan-panel__reason"
          data-testid="plan-reason"
        >
          {{ record.entryReason || '沒有寫進場理由' }}
        </blockquote>
        <dl
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
        </dl>
        <AppButton
          v-if="!record.planLocked"
          variant="secondary"
          size="small"
          class="contract-trade-plan-panel__edit"
          data-testid="plan-edit"
          @click="planStopLossText = record.plannedStopLossPrice?.toString() ?? ''; planTakeProfitText = record.plannedTakeProfitPrice?.toString() ?? ''; planEntryReason = record.entryReason; planConfidence = record.confidence; editingPlan = true"
        >
          修改計畫
        </AppButton>
      </template>

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
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.contract-trade-plan-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__form {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('md') {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__wide {
    grid-column: 1 / -1;
  }

  &__reason {
    margin: 0;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('xs') spacing('sm');
    color: color('text');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }

  &__plan {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: spacing('sm');
    margin: 0;

    dt {
      color: color('text-faint');
      font-size: font-size('2xs');
    }

    dd {
      margin: 0;
      color: color('text-strong');
      font-size: font-size('sm');

      @include numeric;
    }
  }

  &__edit {
    align-self: flex-start;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: flex-end;
  }
}
</style>
