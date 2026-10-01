<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import type Decimal from 'decimal.js'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const {
  planLocked,
  entryReason,
  plannedStopLossPrice,
  plannedTakeProfitPrice,
  plannedStopLossText,
  plannedTakeProfitText,
  confidence,
  selectedSetupTags,
  setupTags,
  busy = false,
} = defineProps<{
  planLocked: boolean
  entryReason: string
  plannedStopLossPrice: Decimal | null
  plannedTakeProfitPrice: Decimal | null
  plannedStopLossText: LocalizedTextVo
  plannedTakeProfitText: LocalizedTextVo
  confidence: number | null
  selectedSetupTags: readonly TradeTagDto[]
  setupTags: readonly TradeTagDto[]
  busy?: boolean
}>()

const emit = defineEmits<{
  savePlan: [plannedStopLossText: string, plannedTakeProfitText: string, entryReason: string, confidence: number | null]
  assignSetupTags: [setupTagIds: number[]]
  createSetupTag: [name: string]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const editingPlan = ref(false)
const planStopLossText = ref('')
const planTakeProfitText = ref('')
const planEntryReason = ref('')
const planConfidence = ref<number | null>(null)

watch([() => planLocked, () => entryReason, () => plannedStopLossText, () => plannedTakeProfitText, () => confidence], () => {
  editingPlan.value = false
})

const setupTagIds = computed({
  get: () => selectedSetupTags.map(tag => tag.id),
  set: (ids: number[]) => emit('assignSetupTags', ids),
})
</script>

<template>
  <AppPanel :title="t('tradeJournal.planPanel.title')">
    <template #actions>
      <AppBadge
        v-if="planLocked"
        data-testid="plan-locked"
      >
        {{ t('tradeJournal.planPanel.locked') }}
      </AppBadge>
    </template>

    <div class="trade-plan-panel">
      <div
        v-if="editingPlan && !planLocked"
        class="trade-plan-panel__form"
      >
        <FormField :label="t('tradeJournal.planPanel.plannedStopLoss')">
          <AppInput
            v-model="planStopLossText"
            inputmode="decimal"
            data-testid="plan-stop-loss"
          />
        </FormField>
        <FormField :label="t('tradeJournal.planPanel.plannedTakeProfit')">
          <AppInput
            v-model="planTakeProfitText"
            inputmode="decimal"
            data-testid="plan-take-profit"
          />
        </FormField>
        <FormField
          :label="t('tradeJournal.planPanel.confidence')"
          grouped
        >
          <AppRating
            v-model="planConfidence"
            :label="t('tradeJournal.planPanel.confidence')"
            data-testid="plan-confidence"
          />
        </FormField>
        <FormField
          :label="t('tradeJournal.planPanel.entryReason')"
          class="trade-plan-panel__wide"
        >
          <AppTextarea
            v-model="planEntryReason"
            data-testid="plan-entry-reason"
          />
        </FormField>
        <div class="trade-plan-panel__actions">
          <AppButton
            :disabled="busy"
            data-testid="plan-save"
            @click="emit('savePlan', planStopLossText, planTakeProfitText, planEntryReason, planConfidence)"
          >
            {{ t('tradeJournal.planPanel.savePlan') }}
          </AppButton>
          <AppButton
            variant="ghost"
            data-testid="plan-cancel"
            @click="editingPlan = false"
          >
            {{ t('tradeJournal.common.cancel') }}
          </AppButton>
        </div>
      </div>

      <template v-else>
        <blockquote
          class="trade-plan-panel__reason"
          data-testid="plan-reason"
        >
          {{ entryReason || t('tradeJournal.planPanel.noEntryReason') }}
        </blockquote>
        <dl
          class="trade-plan-panel__plan"
          data-testid="plan-summary"
        >
          <div>
            <dt>{{ t('tradeJournal.planPanel.plannedStopLoss') }}</dt>
            <dd>{{ localize(plannedStopLossText) }}</dd>
          </div>
          <div>
            <dt>{{ t('tradeJournal.planPanel.plannedTakeProfit') }}</dt>
            <dd>{{ localize(plannedTakeProfitText) }}</dd>
          </div>
          <div>
            <dt>{{ t('tradeJournal.planPanel.confidence') }}</dt>
            <dd>{{ confidence === null ? t('tradeJournal.planPanel.confidenceNotFilled') : `${confidence} / 5` }}</dd>
          </div>
        </dl>
        <AppButton
          v-if="!planLocked"
          variant="secondary"
          size="small"
          class="trade-plan-panel__edit"
          data-testid="plan-edit"
          @click="planStopLossText = plannedStopLossPrice?.toString() ?? ''; planTakeProfitText = plannedTakeProfitPrice?.toString() ?? ''; planEntryReason = entryReason; planConfidence = confidence; editingPlan = true"
        >
          {{ t('tradeJournal.planPanel.editPlan') }}
        </AppButton>
      </template>

      <FormField
        :label="t('tradeJournal.common.setupTags')"
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
.trade-plan-panel {
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
