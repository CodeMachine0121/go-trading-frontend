<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const {
  setting = null,
  loading = false,
  loadErrorMessage = null,
  makerRateHint = null,
  takerRateHint = null,
  saving = false,
  saveErrorMessage = null,
  tagGroups = [],
  tagErrorMessage = null,
  tagBusy = false,
} = defineProps<{
  setting?: TradeJournalSettingDto | null
  loading?: boolean
  loadErrorMessage?: LocalizedTextVo | null
  makerRateHint?: LocalizedTextVo | null
  takerRateHint?: LocalizedTextVo | null
  saving?: boolean
  saveErrorMessage?: LocalizedTextVo | null
  tagGroups?: readonly TradeTagGroupDto[]
  tagErrorMessage?: LocalizedTextVo | null
  tagBusy?: boolean
}>()

const emit = defineEmits<{
  saveFeeRates: []
  createTag: []
  renameTag: [id: number, name: string]
  deleteTag: [id: number]
}>()

const makerRateText = defineModel<string>('makerRateText', { required: true })
const takerRateText = defineModel<string>('takerRateText', { required: true })
const newTagKind = defineModel<TradeTagKind>('newTagKind', { required: true })
const newTagName = defineModel<string>('newTagName', { required: true })

const { t } = useI18n()
const { localize } = useLocalizedText()

const renamingTagId = ref<number | null>(null)
const renamingName = ref('')

function confirmRenaming(): void {
  if (renamingTagId.value !== null && renamingName.value.trim() !== '') {
    emit('renameTag', renamingTagId.value, renamingName.value)
  }
  renamingTagId.value = null
}
</script>

<template>
  <SettingsSection
    :title="t('tradeJournal.settingsPanel.title')"
    :description="t('tradeJournal.settingsPanel.description')"
  >
    <p
      v-if="loading"
      class="trade-journal-settings-panel__state"
      data-testid="trade-journal-settings-loading"
    >
      {{ t('tradeJournal.settingsPanel.loading') }}
    </p>

    <AppAlert
      v-else-if="loadErrorMessage"
      tone="danger"
      data-testid="trade-journal-settings-load-error"
    >
      {{ localize(loadErrorMessage) }}
    </AppAlert>

    <template v-else>
      <section class="trade-journal-settings-panel__block">
        <h3 class="trade-journal-settings-panel__heading">
          {{ t('tradeJournal.settingsPanel.feeRatesHeading') }}
          <AppBadge
            :variant="setting?.summaryTone ?? 'neutral'"
            data-testid="fee-rate-summary"
          >
            {{ setting ? localize(setting.summary) : t('tradeJournal.settingsPanel.notConfigured') }}
          </AppBadge>
        </h3>

        <div class="trade-journal-settings-panel__rates">
          <FormField
            :label="t('tradeJournal.settingsPanel.makerFeeRate')"
            :error-message="makerRateHint === null ? null : localize(makerRateHint)"
          >
            <AppInput
              v-model="makerRateText"
              inputmode="decimal"
              :invalid="makerRateHint !== null"
              data-testid="maker-fee-rate-input"
            />
          </FormField>
          <FormField
            :label="t('tradeJournal.settingsPanel.takerFeeRate')"
            :error-message="takerRateHint === null ? null : localize(takerRateHint)"
          >
            <AppInput
              v-model="takerRateText"
              inputmode="decimal"
              :invalid="takerRateHint !== null"
              data-testid="taker-fee-rate-input"
            />
          </FormField>
        </div>

        <AppAlert
          v-if="saveErrorMessage"
          tone="danger"
          data-testid="fee-rate-save-error"
        >
          {{ localize(saveErrorMessage) }}
        </AppAlert>

        <div>
          <AppButton
            :disabled="saving || makerRateHint !== null || takerRateHint !== null"
            data-testid="fee-rate-save"
            @click="emit('saveFeeRates')"
          >
            {{ saving ? t('tradeJournal.settingsPanel.saving') : t('tradeJournal.settingsPanel.saveFeeRates') }}
          </AppButton>
        </div>
      </section>

      <section
        v-for="group in tagGroups"
        :key="group.kind"
        class="trade-journal-settings-panel__block"
        :data-testid="`tag-group-${group.kind}`"
      >
        <h3 class="trade-journal-settings-panel__heading">
          {{ localize(group.title) }}
        </h3>
        <p
          v-if="group.tags.length === 0"
          class="trade-journal-settings-panel__state"
        >
          {{ localize(group.emptyMessage) }}
        </p>
        <ul
          v-else
          class="trade-journal-settings-panel__tags"
        >
          <li
            v-for="tag in group.tags"
            :key="tag.id"
            class="trade-journal-settings-panel__tag"
            :data-testid="`tag-${tag.id}`"
          >
            <template v-if="renamingTagId === tag.id">
              <AppInput
                v-model="renamingName"
                data-testid="tag-rename-input"
                @keydown.enter="confirmRenaming"
              />
              <AppButton
                size="small"
                data-testid="tag-rename-confirm"
                @click="confirmRenaming"
              >
                {{ t('tradeJournal.settingsPanel.rename') }}
              </AppButton>
              <AppButton
                size="small"
                variant="ghost"
                data-testid="tag-rename-cancel"
                @click="renamingTagId = null"
              >
                {{ t('tradeJournal.common.cancel') }}
              </AppButton>
            </template>
            <template v-else>
              <span class="trade-journal-settings-panel__tag-name">{{ tag.name }}</span>
              <AppButton
                size="small"
                variant="ghost"
                :disabled="tagBusy"
                data-testid="tag-rename"
                @click="renamingTagId = tag.id; renamingName = tag.name"
              >
                {{ t('tradeJournal.settingsPanel.rename') }}
              </AppButton>
              <AppButton
                size="small"
                variant="danger-ghost"
                :disabled="tagBusy"
                data-testid="tag-delete"
                @click="emit('deleteTag', tag.id)"
              >
                {{ t('tradeJournal.common.delete') }}
              </AppButton>
            </template>
          </li>
        </ul>
      </section>

      <div class="trade-journal-settings-panel__new-tag">
        <FormField :label="t('tradeJournal.settingsPanel.newTag')">
          <div class="trade-journal-settings-panel__new-tag-row">
            <AppSelect
              v-model="newTagKind"
              data-testid="new-tag-kind"
            >
              <option value="mistake">
                {{ t('tradeJournal.common.mistakeTags') }}
              </option>
              <option value="setup">
                {{ t('tradeJournal.common.setupTags') }}
              </option>
            </AppSelect>
            <AppInput
              v-model="newTagName"
              data-testid="new-tag-name"
              @keydown.enter="emit('createTag')"
            />
            <AppButton
              variant="secondary"
              :disabled="tagBusy || newTagName.trim() === ''"
              data-testid="new-tag-create"
              @click="emit('createTag')"
            >
              {{ t('tradeJournal.tagPicker.create') }}
            </AppButton>
          </div>
        </FormField>
      </div>

      <AppAlert
        v-if="tagErrorMessage"
        tone="danger"
        data-testid="tag-error"
      >
        {{ localize(tagErrorMessage) }}
      </AppAlert>
    </template>
  </SettingsSection>
</template>

<style scoped lang="scss">
.trade-journal-settings-panel {
  &__state {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__block {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    border-bottom: 1px solid color('border');
    padding-bottom: spacing('md');
  }

  &__heading {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__rates {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');
    max-width: 30rem;

    @include respond-to('md') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__tags {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__tag {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
  }

  &__tag-name {
    flex: 1;
    min-width: 0;
    color: color('text');
    font-size: font-size('sm');
  }

  &__new-tag {
    max-width: 30rem;
  }

  &__new-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
  }
}
</style>
