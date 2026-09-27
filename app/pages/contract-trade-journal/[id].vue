<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import ContractTradeStatusBadge from '~/components/molecules/ContractTradeStatusBadge.vue'
import ContractTradeForm from '~/components/organisms/ContractTradeForm.vue'
import ContractTradeOutcomePanel from '~/components/organisms/ContractTradeOutcomePanel.vue'
import ContractTradePlanPanel from '~/components/organisms/ContractTradePlanPanel.vue'
import ContractTradeReviewPanel from '~/components/organisms/ContractTradeReviewPanel.vue'

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
const journalLinkIdentifier = typeof route.query.journalLink === 'string' && route.query.journalLink !== ''
  ? route.query.journalLink
  : null

const detail = useContractTradeDetail(() => tradeId.value)
const addingFills = ref(route.query.addFill === 'entry')
const addFillDirty = ref(false)
const deleteConfirmationOpen = ref(false)
const closedJustNow = ref(false)
const reviewPanel = useTemplateRef<InstanceType<typeof ContractTradeReviewPanel>>('reviewPanel')
const leaveConfirmation = useLeaveConfirmation(() => addingFills.value && addFillDirty.value)

onBeforeRouteLeave(to => leaveConfirmation.shouldLeave(to.fullPath))

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
        <h2 class="contract-trade-page__title">
          {{ detail.record.value.title }}
        </h2>
        <ContractTradeStatusBadge
          :label="detail.record.value.statusLabel"
          :tone="detail.record.value.statusTone"
        />
        <span class="contract-trade-page__source">{{ detail.record.value.sourceLabel }}</span>
        <div class="contract-trade-page__actions">
          <AppButton
            v-if="detail.record.value.canEditFills && !addingFills"
            variant="secondary"
            @click="addingFills = true"
          >
            ＋ 加成交
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
        title="加一筆成交"
      >
        <ContractTradeForm
          :existing-record="detail.record.value"
          :journal-link-identifier="journalLinkIdentifier"
          :time-zone-identifier="selectedTimeZone.identifier"
          :contract-trade-journal-application="$contractTradeJournalApplication"
          :trade-journal-setting-application="$tradeJournalSettingApplication"
          :trading-strategy-application="$tradingStrategyApplication"
          @saved="record => { detail.adoptSavedRecord(record); addingFills = false; addFillDirty = false; closedJustNow = record.status !== 'open'; announce(record.status === 'open' ? '已加上成交' : '這筆已平倉') }"
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

      <ContractTradeOutcomePanel
        :record="detail.record.value"
        :price-path="detail.pricePath.value"
        :price-path-loading="detail.pricePathLoading.value"
        :price-path-failure-message="detail.pricePathFailureMessage.value"
        :time-zone="selectedTimeZone"
      />

      <div class="contract-trade-page__columns">
        <ContractTradePlanPanel
          :record="detail.record.value"
          :setup-tags="detail.setupTags.value"
          :busy="detail.busy.value"
          :failure-message="detail.actionFailureMessage.value"
          :time-zone-identifier="selectedTimeZone.identifier"
          @save-plan="detail.savePlan"
          @add-note="detail.addNote"
          @amend-fill="detail.amendFill"
          @remove-fill="detail.removeFill"
          @assign-setup-tags="detail.assignSetupTags"
          @create-setup-tag="detail.createSetupTag"
        />
        <ContractTradeReviewPanel
          ref="reviewPanel"
          :record="detail.record.value"
          :mistake-tags="detail.mistakeTags.value"
          :busy="detail.busy.value"
          @submit="detail.writeReview"
        />
      </div>
    </template>

    <ConfirmDialog
      :open="deleteConfirmationOpen"
      title="刪除這筆交易"
      message="刪除後，這筆交易的成交、附註、檢討都會一併刪除，無法復原"
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

  &__title {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('lg');

    @include numeric;
  }

  &__source {
    color: color('text-muted');
    font-size: font-size('xs');
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
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    }
  }
}
</style>
