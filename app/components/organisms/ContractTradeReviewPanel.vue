<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

const DEFAULT_EXECUTION_SCORE = 3

const { record, mistakeTags, busy = false } = defineProps<{
  record: ContractTradeRecordDto
  mistakeTags: readonly TradeTagDto[]
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [wentWell: string, wentWrong: string, nextTime: string, executionScore: number, mistakeTagIds: number[]]
}>()

const wentWell = ref('')
const wentWrong = ref('')
const nextTime = ref('')
const executionScore = ref<number | null>(DEFAULT_EXECUTION_SCORE)
const mistakeTagIds = ref<number[]>([])

watch(() => record, () => {
  wentWell.value = record.review?.wentWell ?? ''
  wentWrong.value = record.review?.wentWrong ?? ''
  nextTime.value = record.review?.nextTime ?? ''
  executionScore.value = record.review?.executionScore ?? DEFAULT_EXECUTION_SCORE
  mistakeTagIds.value = record.mistakeTags.map(tag => tag.id)
}, { immediate: true })
</script>

<template>
  <AppPanel title="檢討">
    <template
      v-if="record.canWriteReview && !record.review"
      #actions
    >
      <AppBadge
        variant="warning"
        data-testid="review-pending"
      >
        尚未填寫
      </AppBadge>
    </template>
    <p
      v-if="!record.canWriteReview"
      class="contract-trade-review-panel__state"
      data-testid="review-unavailable"
    >
      {{ record.reviewUnavailableMessage }}
    </p>

    <form
      v-else
      class="contract-trade-review-panel__form"
      data-testid="review-form"
      @submit.prevent="emit('submit', wentWell, wentWrong, nextTime, executionScore ?? DEFAULT_EXECUTION_SCORE, mistakeTagIds)"
    >
      <FormField label="哪裡做對">
        <AppTextarea
          v-model="wentWell"
          data-testid="review-went-well"
        />
      </FormField>
      <FormField label="哪裡做錯">
        <AppTextarea
          v-model="wentWrong"
          data-testid="review-went-wrong"
        />
      </FormField>
      <FormField label="下次怎麼做">
        <AppTextarea
          v-model="nextTime"
          data-testid="review-next-time"
        />
      </FormField>
      <FormField
        label="執行評分"
        grouped
      >
        <AppRating
          v-model="executionScore"
          label="執行評分"
          :clearable="false"
          data-testid="review-execution-score"
        />
      </FormField>
      <FormField
        label="失誤標籤"
        grouped
      >
        <TradeTagPicker
          v-model:selected-ids="mistakeTagIds"
          :tags="mistakeTags"
          :creatable="false"
        />
      </FormField>
      <div>
        <AppButton
          type="submit"
          :disabled="busy"
          data-testid="review-save"
        >
          {{ record.review ? '更新檢討' : '寫下檢討' }}
        </AppButton>
      </div>
    </form>
  </AppPanel>
</template>

<style scoped lang="scss">
.contract-trade-review-panel {
  &__state {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }
}
</style>
