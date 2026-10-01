<script setup lang="ts">
import ConnectorAuthorizationPanel from '~/components/organisms/ConnectorAuthorizationPanel.vue'
import DisplayLanguageField from '~/components/molecules/DisplayLanguageField.vue'

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

const { selectableLanguages, selectedLanguageCode, selectLanguage } = useDisplayLanguage()

onMounted(() => load(requestId))
</script>

<template>
  <main class="connector-authorization-page">
    <div class="connector-authorization-page__language">
      <DisplayLanguageField
        :model-value="selectedLanguageCode"
        :selectable-languages="selectableLanguages"
        @update:model-value="selectLanguage"
      />
    </div>

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
  position: relative;
  justify-content: center;
  background-color: color('background');
  padding: spacing('2xl') spacing('xl') spacing('lg');
  min-height: 100dvh;

  @include respond-to('md') {
    align-items: center;
    padding: spacing('lg');
  }

  // 還沒進門的人也要能先換語言：這一頁沒有頂列，所以選單自己掛在右上角。
  &__language {
    position: absolute;
    top: spacing('md');
    right: spacing('md');
  }
}
</style>
