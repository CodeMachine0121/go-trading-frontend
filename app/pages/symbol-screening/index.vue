<script setup lang="ts">
import SymbolScreeningPage from '~/components/templates/SymbolScreeningPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'symbolScreening.pages.title',
  consoleSubtitleKey: 'symbolScreening.pages.subtitle',
})

const { $symbolScreeningApplication } = useNuxtApp()
const { selectedTimeZone } = useSelectedTimeZone()
const { currentUser } = useUserSession()
</script>

<template>
  <SymbolScreeningPage
    :symbol-screening-application="$symbolScreeningApplication"
    :time-zone="selectedTimeZone"
    :is-administrator="currentUser?.isAdmin === true"
  />
</template>
