<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import ContractTradeForm from '~/components/organisms/ContractTradeForm.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'contractTradeJournal.pages.new.title',
  consoleSubtitleKey: 'contractTradeJournal.pages.new.subtitle',
})

const { t } = useI18n()
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
      :title="t('contractTradeJournal.common.unsavedTitle')"
      :message="t('contractTradeJournal.common.unsavedMessage')"
      :confirm-label="t('contractTradeJournal.common.leave')"
      variant="danger"
      @confirm="leaveConfirmation.leave"
      @cancel="leaveConfirmation.stay"
    />
  </div>
</template>
