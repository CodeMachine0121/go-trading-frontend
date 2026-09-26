<script setup lang="ts">
import type { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'
import type { ConnectorAuthorizationStageVo } from '~/domain/models/vo/connector-authorization-stage-vo'
import type { ConnectorAuthorizationDecisionVo } from '~/domain/models/vo/connector-authorization-decision-vo'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

const {
  stage,
  authorizationRequest = null,
  email,
  pendingDecision = null,
  loadErrorMessage = null,
  decisionErrorMessage = null,
} = defineProps<{
  stage: ConnectorAuthorizationStageVo
  authorizationRequest?: ConnectorAuthorizationRequestDto | null
  email: string
  pendingDecision?: ConnectorAuthorizationDecisionVo | null
  loadErrorMessage?: string | null
  decisionErrorMessage?: string | null
}>()

const emit = defineEmits<{
  approve: []
  deny: []
  retry: []
}>()

const deciding = computed(() => pendingDecision !== null)
</script>

<template>
  <section class="connector-authorization-panel">
    <div class="connector-authorization-panel__brand">
      <span class="connector-authorization-panel__brand-mark">
        <AppIcon name="candles" />
      </span>
      <span class="connector-authorization-panel__brand-name">Go Trading</span>
    </div>

    <div class="connector-authorization-panel__heading">
      <h1 class="connector-authorization-panel__title">
        授權外掛
      </h1>
    </div>

    <p
      v-if="stage === 'loading'"
      class="connector-authorization-panel__caption"
      data-testid="authorization-loading"
    >
      正在讀取授權請求…
    </p>

    <AppAlert
      v-else-if="stage === 'expired'"
      tone="warning"
      data-testid="authorization-expired"
    >
      這一張授權請求已失效或已被使用，請回到 Claude Code 重新連線。
    </AppAlert>

    <AppAlert
      v-else-if="stage === 'loadFailed'"
      tone="danger"
      data-testid="authorization-load-failed"
    >
      {{ loadErrorMessage }}
      <template #action>
        <AppButton
          variant="secondary"
          size="small"
          data-testid="authorization-retry"
          @click="emit('retry')"
        >
          再試一次
        </AppButton>
      </template>
    </AppAlert>

    <AppAlert
      v-else-if="stage === 'handedBack'"
      tone="success"
      data-testid="authorization-handed-back"
    >
      已交回 Claude Code，可以關掉這個分頁，回到 Claude Code。
    </AppAlert>

    <template v-else>
      <p class="connector-authorization-panel__caption">
        <strong data-testid="authorization-client-name">{{ authorizationRequest?.clientName }}</strong>
        想要連線到你的交易服務帳號
        <strong data-testid="authorization-email">{{ email }}</strong>。
      </p>

      <p
        class="connector-authorization-panel__scope"
        data-testid="authorization-scope"
      >
        允許後，它能以你的身分使用交易服務的全部功能。只在你信任這個外掛、而且是你自己剛剛發起連線時才允許。
      </p>

      <AppAlert
        v-if="decisionErrorMessage"
        tone="danger"
        data-testid="authorization-decision-error"
      >
        {{ decisionErrorMessage }}
      </AppAlert>

      <div class="connector-authorization-panel__actions">
        <AppButton
          variant="secondary"
          size="large"
          :disabled="deciding"
          data-testid="authorization-deny"
          @click="emit('deny')"
        >
          {{ pendingDecision === 'deny' ? '拒絕中…' : '拒絕' }}
        </AppButton>
        <AppButton
          variant="primary"
          size="large"
          :disabled="deciding"
          data-testid="authorization-approve"
          @click="emit('approve')"
        >
          {{ pendingDecision === 'approve' ? '允許中…' : '允許' }}
        </AppButton>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.connector-authorization-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');
  width: 100%;
  max-width: 28rem;

  @include respond-to('md') {
    box-shadow: shadow('md');
    border: 1px solid color('border');
    border-radius: radius('lg');
    background-color: color('surface');
    padding: spacing('2xl') spacing('xl');
  }

  &__brand {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }

  &__brand-mark {
    display: grid;
    flex: none;
    place-items: center;
    border-radius: radius('md');
    background-image: linear-gradient(135deg, color('primary'), color('primary-strong'));
    width: 2.75rem;
    height: 2.75rem;
    color: color('text-inverse');
  }

  &__brand-name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-size: font-size('2xl');
    line-height: line-height('tight');
  }

  &__caption {
    margin: 0;
    color: color('text-muted');
    line-height: line-height('relaxed');
    font-size: font-size('sm');
    overflow-wrap: anywhere;
  }

  &__scope {
    margin: 0;
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('sm');
    color: color('text-strong');
    line-height: line-height('relaxed');
    font-size: font-size('sm');
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: spacing('xs');
    margin-top: auto;

    @include safe-area-bottom;

    @include respond-to('md') {
      margin-top: 0;
      padding-bottom: 0;
    }
  }
}
</style>
