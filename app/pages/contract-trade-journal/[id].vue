<script setup lang="ts">
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import TradeStatusBadge from '~/components/molecules/TradeStatusBadge.vue'
import ContractTradeFillLedgerPanel from '~/components/organisms/ContractTradeFillLedgerPanel.vue'
import ContractTradeForm from '~/components/organisms/ContractTradeForm.vue'
import TradeNotesPanel from '~/components/organisms/TradeNotesPanel.vue'
import TradeOutcomePanel from '~/components/organisms/TradeOutcomePanel.vue'
import TradePlanPanel from '~/components/organisms/TradePlanPanel.vue'
import TradeReviewPanel from '~/components/organisms/TradeReviewPanel.vue'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約交易',
  consoleSubtitle: '結果、價格路徑、進場時的計畫與檢討。',
})

const route = useRoute()
const { $contractTradeJournalApplication, $tradeJournalSettingApplication, $tradingStrategyApplication } = useNuxtApp()
const { selectedTimeZone } = useSelectedTimeZone()
const { announce } = useConsoleAnnouncement()
const tradeId = computed(() => {
  const parsed = Number(route.params.id)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})
const journalLinkIdentifier = ref(typeof route.query.journalLink === 'string' && route.query.journalLink !== ''
  ? route.query.journalLink
  : null)

const detail = useContractTradeDetail(() => tradeId.value)
const addingFills = ref(route.query.addFill === 'entry')
const addFillDirty = ref(false)
const deleteConfirmationOpen = ref(false)
const closedJustNow = ref(false)
const reviewPanel = useTemplateRef<InstanceType<typeof TradeReviewPanel>>('reviewPanel')
const leaveConfirmation = useLeaveConfirmation(() => addingFills.value && addFillDirty.value)

onBeforeRouteLeave(to => leaveConfirmation.shouldLeave(to.fullPath))

function adoptSavedFills(savedRecord: ContractTradeRecordDto): void {
  detail.adoptSavedRecord(savedRecord)
  addingFills.value = false
  addFillDirty.value = false
  closedJustNow.value = savedRecord.status !== 'open'
  announce(savedRecord.status === 'open' ? '已記下' : '這筆已平倉')
  // The bot-link round is used up once saved; leaving it in the address would prefill it again on reload.
  journalLinkIdentifier.value = null
  void navigateTo({ path: route.path }, { replace: true })
}

onMounted(() => {
  void detail.loadTrade()
})
</script>

<template>
  <div class="contract-trade-page">
    <p
      v-if="detail.loading.value && !detail.record.value"
      class="contract-trade-page__state"
    >
      讀取中…
    </p>

    <AppAlert
      v-else-if="detail.failureMessage.value && !detail.record.value"
      tone="danger"
    >
      {{ detail.notFound.value ? '找不到這筆交易' : detail.failureMessage.value }}
      <template #action>
        <AppButton
          variant="ghost"
          to="/contract-trade-journal"
        >
          回交易日誌
        </AppButton>
      </template>
    </AppAlert>

    <template v-else-if="detail.record.value">
      <header class="contract-trade-page__header">
        <div class="contract-trade-page__heading">
          <h2 class="contract-trade-page__title">
            {{ detail.record.value.title }}
          </h2>
          <p
            class="contract-trade-page__period"
            data-testid="trade-period"
          >
            {{ formatDateTimeInTimeZone(detail.record.value.openedAt, selectedTimeZone.identifier) }}
            <template v-if="detail.record.value.closedAt">
              → {{ formatDateTimeInTimeZone(detail.record.value.closedAt, selectedTimeZone.identifier) }}・{{ detail.record.value.holdingDurationText }}
            </template>
            <template v-else>
              起・持倉中
            </template>
          </p>
        </div>
        <TradeStatusBadge
          :label="detail.record.value.statusLabel"
          :tone="detail.record.value.statusTone"
        />
        <AppBadge
          variant="accent"
          data-testid="trade-origin"
        >
          {{ detail.record.value.originLabel }}
        </AppBadge>
        <div class="contract-trade-page__actions">
          <AppButton
            v-if="detail.record.value.canEditFills && !addingFills"
            variant="secondary"
            @click="addingFills = true"
          >
            ＋ 加倉／減倉
          </AppButton>
          <AppButton
            variant="danger-ghost"
            :disabled="detail.busy.value"
            @click="deleteConfirmationOpen = true"
          >
            刪除
          </AppButton>
        </div>
      </header>

      <AppAlert
        v-if="detail.notFound.value"
        tone="danger"
      >
        找不到這筆交易，可能已經被刪除。
        <template #action>
          <AppButton
            variant="ghost"
            to="/contract-trade-journal"
          >
            回交易日誌
          </AppButton>
        </template>
      </AppAlert>

      <AppPanel
        v-if="addingFills && detail.record.value.canEditFills"
        title="加倉或減倉"
      >
        <ContractTradeForm
          :existing-record="detail.record.value"
          :journal-link-identifier="journalLinkIdentifier"
          :time-zone-identifier="selectedTimeZone.identifier"
          :contract-trade-journal-application="$contractTradeJournalApplication"
          :trade-journal-setting-application="$tradeJournalSettingApplication"
          :trading-strategy-application="$tradingStrategyApplication"
          @saved="adoptSavedFills"
          @dirty-change="value => (addFillDirty = value)"
        />
      </AppPanel>

      <AppAlert
        v-if="closedJustNow"
        tone="success"
      >
        這筆已平倉
        <template #action>
          <AppButton
            variant="ghost"
            @click="closedJustNow = false; reviewPanel?.$el?.scrollIntoView?.({ behavior: 'smooth' })"
          >
            去寫檢討
          </AppButton>
        </template>
      </AppAlert>

      <TradeOutcomePanel
        :outcome="detail.record.value.outcome"
        :source="detail.record.value.source"
        :price-path="detail.pricePath.value"
        :price-path-loading="detail.pricePathLoading.value"
        :price-path-failure-message="detail.pricePathFailureMessage.value"
        :time-zone="selectedTimeZone"
      />

      <AppAlert
        v-if="detail.actionFailureMessage.value"
        tone="danger"
        data-testid="detail-action-failure"
      >
        {{ detail.actionFailureMessage.value }}
      </AppAlert>

      <div class="contract-trade-page__columns">
        <TradePlanPanel
          :plan-locked="detail.record.value.planLocked"
          :entry-reason="detail.record.value.entryReason"
          :planned-stop-loss-price="detail.record.value.plannedStopLossPrice"
          :planned-take-profit-price="detail.record.value.plannedTakeProfitPrice"
          :planned-stop-loss-text="detail.record.value.plannedStopLossText"
          :planned-take-profit-text="detail.record.value.plannedTakeProfitText"
          :confidence="detail.record.value.confidence"
          :selected-setup-tags="detail.record.value.setupTags"
          :setup-tags="detail.setupTags.value"
          :busy="detail.busy.value"
          @save-plan="detail.savePlan"
          @assign-setup-tags="detail.assignSetupTags"
          @create-setup-tag="detail.createSetupTag"
        />
        <TradeReviewPanel
          ref="reviewPanel"
          :review="detail.record.value.review"
          :can-write-review="detail.record.value.canWriteReview"
          :review-unavailable-message="detail.record.value.reviewUnavailableMessage"
          :recorded-mistake-tags="detail.record.value.mistakeTags"
          :mistake-tags="detail.mistakeTags.value"
          :busy="detail.busy.value"
          @submit="detail.writeReview"
        />
      </div>

      <div class="contract-trade-page__columns">
        <ContractTradeFillLedgerPanel
          :record="detail.record.value"
          :busy="detail.busy.value"
          :time-zone-identifier="selectedTimeZone.identifier"
          @amend-fill="detail.amendFill"
          @remove-fill="detail.removeFill"
        />
        <TradeNotesPanel
          :notes="detail.record.value.notes"
          :busy="detail.busy.value"
          :time-zone-identifier="selectedTimeZone.identifier"
          @add-note="detail.addNote"
        />
      </div>
    </template>

    <ConfirmDialog
      :open="deleteConfirmationOpen"
      title="刪除這筆交易"
      message="刪除後，這筆交易的開倉平倉紀錄、附註、檢討都會一併刪除，無法復原"
      confirm-label="刪除"
      variant="danger"
      @confirm="deleteConfirmationOpen = false; detail.deleteTrade().then(deleted => { if (deleted) { announce(`已刪除 #${tradeId}`); leaveConfirmation.allowLeaving(); navigateTo('/contract-trade-journal') } })"
      @cancel="deleteConfirmationOpen = false"
    />
    <ConfirmDialog
      :open="leaveConfirmation.confirmationOpen.value"
      title="還沒儲存"
      message="還沒儲存，離開後這些內容會丟失"
      confirm-label="離開"
      variant="danger"
      @confirm="leaveConfirmation.leave"
      @cancel="leaveConfirmation.stay"
    />
  </div>
</template>

<style scoped lang="scss">
.contract-trade-page {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__state {
    color: color('text-faint');
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin-right: spacing('xs');
  }

  &__period {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');

    @include numeric;
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('lg');

    @include numeric;
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
    margin-left: auto;
  }

  &__columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('md');

    @include respond-to('lg') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
