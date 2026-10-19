<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import SymbolScreeningTermsList from '~/components/molecules/SymbolScreeningTermsList.vue'
import SymbolScreeningProfileForm from '~/components/organisms/SymbolScreeningProfileForm.vue'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// Organism: the administrator's screening profiles, with create, edit and a confirmed delete.
const {
  profiles, screenableStrategyScripts, aggregationIntervalOptions, tradingModeOptions,
  loading, failureMessage, saving, saveFailureMessage, saveProfile,
} = defineProps<{
  profiles: readonly SymbolScreeningProfileDto[]
  screenableStrategyScripts: readonly StrategyScriptDto[]
  aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
  tradingModeOptions: readonly ContractTradingModeOptionDto[]
  loading: boolean
  failureMessage: LocalizedTextVo | null
  saving: boolean
  saveFailureMessage: LocalizedTextVo | null
  saveProfile: (writeDto: SymbolScreeningProfileWriteDto) => Promise<boolean>
}>()

const emit = defineEmits<{ remove: [id: number], closeForm: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()

// undefined: no form; null: a new profile; a profile: editing that one.
const editing = ref<SymbolScreeningProfileDto | null | undefined>(undefined)
const deleting = ref<SymbolScreeningProfileDto | null>(null)

function closeForm() {
  editing.value = undefined
  emit('closeForm')
}

async function save(writeDto: SymbolScreeningProfileWriteDto) {
  if (await saveProfile(writeDto)) {
    editing.value = undefined
  }
}

function confirmDelete() {
  if (deleting.value !== null) {
    emit('remove', deleting.value.id)
  }
  deleting.value = null
}
</script>

<template>
  <AppPanel
    :title="t('symbolScreening.profiles.title')"
    data-testid="symbol-screening-profile-panel"
  >
    <template #meta>
      <AppButton
        v-if="editing === undefined"
        size="small"
        variant="secondary"
        data-testid="symbol-screening-profile-create"
        @click="editing = null"
      >
        {{ t('symbolScreening.profiles.create') }}
      </AppButton>
    </template>

    <div class="symbol-screening-profile-panel">
      <SymbolScreeningProfileForm
        v-if="editing !== undefined"
        :key="editing?.id ?? 'new'"
        :profile="editing"
        :screenable-strategy-scripts="screenableStrategyScripts"
        :aggregation-interval-options="aggregationIntervalOptions"
        :trading-mode-options="tradingModeOptions"
        :saving="saving"
        :failure-message="saveFailureMessage"
        @save="save"
        @cancel="closeForm"
      />

      <p
        v-if="failureMessage !== null"
        class="symbol-screening-profile-panel__notice symbol-screening-profile-panel__notice--failed"
        data-testid="symbol-screening-profiles-failure"
      >
        {{ localize(failureMessage) }}
      </p>
      <p
        v-else-if="loading && profiles.length === 0"
        class="symbol-screening-profile-panel__notice"
      >
        {{ t('symbolScreening.common.loading') }}
      </p>
      <p
        v-else-if="profiles.length === 0"
        class="symbol-screening-profile-panel__notice"
        data-testid="symbol-screening-profiles-empty"
      >
        {{ t('symbolScreening.profiles.empty') }}
      </p>

      <ul
        v-if="profiles.length > 0"
        class="symbol-screening-profile-panel__rows"
      >
        <li
          v-for="profile in profiles"
          :key="profile.id"
          class="symbol-screening-profile-panel__row"
          data-testid="symbol-screening-profile"
        >
          <div class="symbol-screening-profile-panel__headline">
            <strong data-testid="symbol-screening-profile-title">{{ profile.name }}</strong>
            <span class="symbol-screening-profile-panel__script">
              {{ screenableStrategyScripts.find(strategyScript => strategyScript.id === profile.strategyScriptId)?.name
                ?? t('symbolScreening.profiles.strategyScriptNumber', { id: profile.strategyScriptId }) }}
            </span>
          </div>
          <SymbolScreeningTermsList :terms="profile.terms" />
          <div class="symbol-screening-profile-panel__actions">
            <AppButton
              variant="ghost"
              size="small"
              data-testid="symbol-screening-profile-edit"
              @click="editing = profile"
            >
              {{ t('symbolScreening.profiles.edit') }}
            </AppButton>
            <AppButton
              variant="danger-ghost"
              size="small"
              data-testid="symbol-screening-profile-delete"
              @click="deleting = profile"
            >
              {{ t('symbolScreening.profiles.delete') }}
            </AppButton>
          </div>
        </li>
      </ul>
    </div>

    <ConfirmDialog
      :open="deleting !== null"
      :title="t('symbolScreening.profiles.deleteTitle')"
      :message="t('symbolScreening.profiles.deleteMessage', { name: deleting?.name ?? '' })"
      :confirm-label="t('symbolScreening.profiles.delete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </AppPanel>
</template>

<style scoped lang="scss">
.symbol-screening-profile-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');

    &--failed {
      color: color('danger');
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border-bottom: 1px solid color('border');
    padding: spacing('xs') 0;

    &:last-child {
      border-bottom: none;
    }
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs') spacing('xs');
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__script {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
  }
}
</style>
