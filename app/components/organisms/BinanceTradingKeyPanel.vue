<script setup lang="ts">
import type { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import FormField from '~/components/molecules/FormField.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const {
  setting = null,
  loading = false,
  loadErrorMessage = null,
  formVisible = true,
  editing = false,
  saving = false,
  saveErrorMessage = null,
  apiKeyError = null,
  secretKeyError = null,
  timeZoneIdentifier,
} = defineProps<{
  setting?: BinanceTradingKeyDto | null
  loading?: boolean
  loadErrorMessage?: string | null
  formVisible?: boolean
  editing?: boolean
  saving?: boolean
  saveErrorMessage?: string | null
  apiKeyError?: string | null
  secretKeyError?: string | null
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{
  save: []
  remove: []
  startEditing: []
  cancelEditing: []
}>()

const apiKey = defineModel<string>('apiKey', { required: true })
const secretKey = defineModel<string>('secretKey', { required: true })

const removeConfirmationOpen = ref(false)

const configured = computed(() => setting?.configured ?? false)

function confirmRemoval(): void {
  removeConfirmationOpen.value = false
  emit('remove')
}
</script>

<template>
  <SettingsSection
    title="幣安交易金鑰"
    description="留下一組幣安 API 金鑰，將來機器人下單時用它。Secret Key 存進去之後一個字都看不到，API Key 只看得到最後四個字。可交易市場只記存入當下的狀態——在幣安改了權限，要回來重存一次。"
  >
    <template
      v-if="!loading && !loadErrorMessage && configured"
      #status
    >
      <AppBadge
        variant="success"
        data-testid="binance-trading-key-configured"
      >
        已設定
      </AppBadge>
    </template>

    <p
      v-if="loading"
      class="binance-trading-key-panel__state"
      data-testid="binance-trading-key-loading"
    >
      讀取目前的設定…
    </p>

    <AppAlert
      v-else-if="loadErrorMessage"
      tone="danger"
      data-testid="binance-trading-key-load-error"
    >
      {{ loadErrorMessage }}
    </AppAlert>

    <dl
      v-else-if="configured"
      class="binance-trading-key-panel__record"
      data-testid="binance-trading-key-summary"
    >
      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          API Key
          <span class="binance-trading-key-panel__hint">只看得到最後四個字</span>
        </dt>
        <dd class="binance-trading-key-panel__value">
          <span
            class="binance-trading-key-panel__secret"
            data-testid="binance-trading-key-api-key"
          >{{ setting?.apiKeySummary }}</span>
          <AppButton
            v-if="!editing"
            variant="secondary"
            size="small"
            :disabled="saving"
            data-testid="binance-trading-key-edit"
            @click="emit('startEditing')"
          >
            換一組
          </AppButton>
        </dd>
      </div>

      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          可交易市場
        </dt>
        <dd
          class="binance-trading-key-panel__value"
          data-testid="binance-trading-key-tradable-markets"
        >
          {{ setting?.tradableMarketsLabel }}
        </dd>
      </div>

      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          設定時刻
        </dt>
        <dd
          class="binance-trading-key-panel__value"
          data-testid="binance-trading-key-configured-at"
        >
          {{ setting?.configuredAt ? formatDateTimeInTimeZone(setting.configuredAt, timeZoneIdentifier) : '' }}
        </dd>
      </div>

      <div
        v-if="!editing"
        class="binance-trading-key-panel__row"
      >
        <dt class="binance-trading-key-panel__label">
          移除金鑰
        </dt>
        <dd class="binance-trading-key-panel__value">
          <AppButton
            variant="danger-ghost"
            size="small"
            :disabled="saving"
            data-testid="binance-trading-key-remove"
            @click="removeConfirmationOpen = true"
          >
            移除
          </AppButton>
        </dd>
      </div>
    </dl>

    <p
      v-if="!loading && !loadErrorMessage && !configured"
      class="binance-trading-key-panel__state"
      data-testid="binance-trading-key-unconfigured"
    >
      還沒有設定。填好下面兩格並存入，系統會先向幣安確認這組金鑰。
    </p>

    <AppAlert
      v-if="saveErrorMessage && !formVisible"
      tone="danger"
      data-testid="binance-trading-key-save-error"
    >
      {{ saveErrorMessage }}
    </AppAlert>

    <div
      v-if="formVisible && !loading && !loadErrorMessage"
      class="binance-trading-key-panel__form"
    >
      <FormField
        label="API Key"
        :error-message="apiKeyError"
      >
        <AppInput
          v-model="apiKey"
          :invalid="apiKeyError !== null"
          :disabled="saving"
          autocomplete="off"
          spellcheck="false"
          data-testid="binance-api-key-input"
        />
      </FormField>

      <FormField
        label="Secret Key"
        hint="存進去之後就拿不回來，畫面上一個字都不會顯示。"
        :error-message="secretKeyError"
      >
        <AppInput
          v-model="secretKey"
          type="password"
          :invalid="secretKeyError !== null"
          :disabled="saving"
          autocomplete="off"
          spellcheck="false"
          data-testid="binance-secret-key-input"
        />
      </FormField>

      <AppAlert
        v-if="saveErrorMessage"
        tone="danger"
        data-testid="binance-trading-key-save-error"
      >
        {{ saveErrorMessage }}
      </AppAlert>

      <p
        v-if="saving"
        class="binance-trading-key-panel__state"
        role="status"
        data-testid="binance-trading-key-verifying"
      >
        正在向幣安確認這組金鑰，最久可能要等十秒。
      </p>

      <div class="binance-trading-key-panel__actions">
        <AppButton
          variant="primary"
          :disabled="saving"
          data-testid="binance-trading-key-save"
          @click="emit('save')"
        >
          {{ saving ? '向幣安確認中…' : '存入' }}
        </AppButton>
        <AppButton
          v-if="editing"
          variant="ghost"
          :disabled="saving"
          data-testid="binance-trading-key-cancel"
          @click="emit('cancelEditing')"
        >
          取消
        </AppButton>
      </div>
    </div>

    <ConfirmDialog
      :open="removeConfirmationOpen"
      title="移除幣安交易金鑰"
      message="移除之後，所有開著自動下單的機器人會一併被關掉。要再用的話，得重新填入 API Key 與 Secret Key。"
      confirm-label="移除"
      variant="danger"
      @confirm="confirmRemoval"
      @cancel="removeConfirmationOpen = false"
    />
  </SettingsSection>
</template>

<style scoped lang="scss">
.binance-trading-key-panel {
  &__state {
    margin: 0;
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('xs');
  }

  &__record {
    display: flex;
    flex-direction: column;
    margin: calc(-1 * spacing('sm')) 0;
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('2xs');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding: spacing('sm') 0;

    @include respond-to('md') {
      grid-template-columns: minmax(0, 10rem) minmax(0, 1fr);
      gap: spacing('md');
    }

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    color: color('text');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__hint {
    color: color('text-faint');
    font-weight: font-weight('regular');
    font-size: font-size('2xs');
  }

  &__value {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    margin: 0;
    min-width: 0;
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__secret {
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('2xs') spacing('xs');
    overflow-wrap: anywhere;
    color: color('text-strong');
    font-size: font-size('sm');

    @include numeric;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    max-width: 30rem;
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }
}
</style>
