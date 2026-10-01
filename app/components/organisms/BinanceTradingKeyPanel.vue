<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
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
  loadErrorMessage?: LocalizedTextVo | null
  formVisible?: boolean
  editing?: boolean
  saving?: boolean
  saveErrorMessage?: LocalizedTextVo | null
  apiKeyError?: LocalizedTextVo | null
  secretKeyError?: LocalizedTextVo | null
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

const { t } = useI18n()
const { localize } = useLocalizedText()

const configured = computed(() => setting?.configured ?? false)

function confirmRemoval(): void {
  removeConfirmationOpen.value = false
  emit('remove')
}
</script>

<template>
  <SettingsSection
    :title="t('settings.binanceTradingKey.title')"
    :description="t('settings.binanceTradingKey.description')"
  >
    <template
      v-if="!loading && !loadErrorMessage && configured"
      #status
    >
      <AppBadge
        variant="success"
        data-testid="binance-trading-key-configured"
      >
        {{ t('settings.binanceTradingKey.configured') }}
      </AppBadge>
    </template>

    <p
      v-if="loading"
      class="binance-trading-key-panel__state"
      data-testid="binance-trading-key-loading"
    >
      {{ t('settings.common.loading') }}
    </p>

    <AppAlert
      v-else-if="loadErrorMessage"
      tone="danger"
      data-testid="binance-trading-key-load-error"
    >
      {{ localize(loadErrorMessage) }}
    </AppAlert>

    <dl
      v-else-if="configured"
      class="binance-trading-key-panel__record"
      data-testid="binance-trading-key-summary"
    >
      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          API Key
          <span class="binance-trading-key-panel__hint">{{ t('settings.binanceTradingKey.apiKeyHint') }}</span>
        </dt>
        <dd class="binance-trading-key-panel__value">
          <span
            class="binance-trading-key-panel__secret"
            data-testid="binance-trading-key-api-key"
          >{{ setting?.apiKeySummary ? localize(setting.apiKeySummary) : '' }}</span>
          <AppButton
            v-if="!editing"
            variant="secondary"
            size="small"
            :disabled="saving"
            data-testid="binance-trading-key-edit"
            @click="emit('startEditing')"
          >
            {{ t('settings.binanceTradingKey.replace') }}
          </AppButton>
        </dd>
      </div>

      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          {{ t('settings.binanceTradingKey.tradableMarketsLabel') }}
        </dt>
        <dd
          class="binance-trading-key-panel__value"
          data-testid="binance-trading-key-tradable-markets"
        >
          {{ setting ? localize(setting.tradableMarketsLabel) : '' }}
        </dd>
      </div>

      <div class="binance-trading-key-panel__row">
        <dt class="binance-trading-key-panel__label">
          {{ t('settings.binanceTradingKey.configuredAtLabel') }}
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
          {{ t('settings.binanceTradingKey.removeLabel') }}
        </dt>
        <dd class="binance-trading-key-panel__value">
          <AppButton
            variant="danger-ghost"
            size="small"
            :disabled="saving"
            data-testid="binance-trading-key-remove"
            @click="removeConfirmationOpen = true"
          >
            {{ t('settings.binanceTradingKey.remove') }}
          </AppButton>
        </dd>
      </div>
    </dl>

    <p
      v-if="!loading && !loadErrorMessage && !configured"
      class="binance-trading-key-panel__state"
      data-testid="binance-trading-key-unconfigured"
    >
      {{ t('settings.binanceTradingKey.unconfigured') }}
    </p>

    <AppAlert
      v-if="saveErrorMessage && !formVisible"
      tone="danger"
      data-testid="binance-trading-key-save-error"
    >
      {{ localize(saveErrorMessage) }}
    </AppAlert>

    <div
      v-if="formVisible && !loading && !loadErrorMessage"
      class="binance-trading-key-panel__form"
    >
      <FormField
        label="API Key"
        :error-message="apiKeyError ? localize(apiKeyError) : null"
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
        :hint="t('settings.binanceTradingKey.secretKeyHint')"
        :error-message="secretKeyError ? localize(secretKeyError) : null"
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
        {{ localize(saveErrorMessage) }}
      </AppAlert>

      <p
        v-if="saving"
        class="binance-trading-key-panel__state"
        role="status"
        data-testid="binance-trading-key-verifying"
      >
        {{ t('settings.binanceTradingKey.verifying') }}
      </p>

      <div class="binance-trading-key-panel__actions">
        <AppButton
          variant="primary"
          :disabled="saving"
          data-testid="binance-trading-key-save"
          @click="emit('save')"
        >
          {{ saving ? t('settings.binanceTradingKey.saving') : t('settings.binanceTradingKey.save') }}
        </AppButton>
        <AppButton
          v-if="editing"
          variant="ghost"
          :disabled="saving"
          data-testid="binance-trading-key-cancel"
          @click="emit('cancelEditing')"
        >
          {{ t('common.cancel') }}
        </AppButton>
      </div>
    </div>

    <ConfirmDialog
      :open="removeConfirmationOpen"
      :title="t('settings.binanceTradingKey.removeConfirmationTitle')"
      :message="t('settings.binanceTradingKey.removeConfirmationMessage')"
      :confirm-label="t('settings.binanceTradingKey.remove')"
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
