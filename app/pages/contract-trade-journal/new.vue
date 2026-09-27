<script setup lang="ts">
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import ContractTradeForm from '~/components/organisms/ContractTradeForm.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '記一筆合約交易',
  consoleSubtitle: '填實際的開倉價與數量；從機器人訊息的連結打開時，那一輪的建議已經預填好。',
})

const route = useRoute()
const { $contractTradeJournalApplication, $tradeJournalSettingApplication, $tradingStrategyApplication } = useNuxtApp()
const { selectedTimeZone } = useSelectedTimeZone()
const journalLinkIdentifier = typeof route.query.journalLink === 'string' && route.query.journalLink !== ''
  ? route.query.journalLink
  : null

const dirty = ref(false)
const leaveConfirmation = useLeaveConfirmation(() => dirty.value)

onBeforeRouteLeave(to => leaveConfirmation.shouldLeave(to.fullPath))
</script>

<template>
  <div>
    <ContractTradeForm
      :journal-link-identifier="journalLinkIdentifier"
      :time-zone-identifier="selectedTimeZone.identifier"
      :contract-trade-journal-application="$contractTradeJournalApplication"
      :trade-journal-setting-application="$tradeJournalSettingApplication"
      :trading-strategy-application="$tradingStrategyApplication"
      @saved="record => { leaveConfirmation.allowLeaving(); navigateTo(`/contract-trade-journal/${record.id}`, { replace: true }) }"
      @dirty-change="value => (dirty = value)"
      @redirect="path => navigateTo(path, { replace: true })"
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
