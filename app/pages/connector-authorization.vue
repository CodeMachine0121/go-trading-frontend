<script setup lang="ts">
import ConnectorAuthorizationPanel from '~/components/organisms/ConnectorAuthorizationPanel.vue'

const route = useRoute()
const requestQuery = route.query.request
const requestId = typeof requestQuery === 'string' ? requestQuery : ''

const { currentUser } = useUserSession()
const {
  stage,
  authorizationRequest,
  pendingDecision,
  loadErrorMessage,
  decisionErrorMessage,
  load,
  retry,
  approve,
  deny,
} = useConnectorAuthorization()

onMounted(() => load(requestId))
</script>

<template>
  <main class="connector-authorization-page">
    <ConnectorAuthorizationPanel
      :stage="stage"
      :authorization-request="authorizationRequest"
      :email="currentUser?.email ?? ''"
      :pending-decision="pendingDecision"
      :load-error-message="loadErrorMessage"
      :decision-error-message="decisionErrorMessage"
      @approve="approve"
      @deny="deny"
      @retry="retry"
    />
  </main>
</template>

<style scoped lang="scss">
.connector-authorization-page {
  display: flex;
  justify-content: center;
  background-color: color('background');
  padding: spacing('2xl') spacing('xl') spacing('lg');
  min-height: 100dvh;

  @include respond-to('md') {
    align-items: center;
    padding: spacing('lg');
  }
}
</style>
