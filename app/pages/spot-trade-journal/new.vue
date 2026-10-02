<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import SpotTradeForm from '~/components/organisms/SpotTradeForm.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'tradeJournal.pages.spotNew.title',
  consoleSubtitleKey: 'tradeJournal.pages.spotNew.subtitle',
})

const { t } = useI18n()
const route = useRoute()
const { $spotTradeJournalApplication, $tradeJournalSettingApplication, $tradingStrategyApplication } = useNuxtApp()
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
    <SpotTradeForm
      :journal-link-identifier="journalLinkIdentifier"
      :time-zone-identifier="selectedTimeZone.identifier"
      :spot-trade-journal-application="$spotTradeJournalApplication"
      :trade-journal-setting-application="$tradeJournalSettingApplication"
      :trading-strategy-application="$tradingStrategyApplication"
      @saved="record => { leaveConfirmation.allowLeaving(); navigateTo(`/spot-trade-journal/${record.id}`, { replace: true }) }"
      @dirty-change="value => (dirty = value)"
      @redirect="path => navigateTo(path, { replace: true })"
    />
    <ConfirmDialog
      :open="leaveConfirmation.confirmationOpen.value"
      :title="t('tradeJournal.leaveConfirmation.title')"
      :message="t('tradeJournal.leaveConfirmation.message')"
      :confirm-label="t('tradeJournal.leaveConfirmation.confirm')"
      variant="danger"
      @confirm="leaveConfirmation.leave"
      @cancel="leaveConfirmation.stay"
    />
  </div>
</template>
