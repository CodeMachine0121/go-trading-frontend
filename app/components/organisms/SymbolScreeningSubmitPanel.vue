<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import { useSymbolScreeningSubmission } from '~/composables/use-symbol-screening-submission'

// Organism: pick a profile, paste symbols, submit; a refusal keeps what was pasted.
const { symbolScreeningApplication, profiles } = defineProps<{
  symbolScreeningApplication: SymbolScreeningApplication
  profiles: readonly SymbolScreeningProfileDto[]
}>()

const emit = defineEmits<{ submitted: [run: SymbolScreeningRunDto] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const submission = useSymbolScreeningSubmission(symbolScreeningApplication)

const selectedProfileId = computed({
  get: () => String(submission.profileId.value),
  set: (value: string) => {
    submission.profileId.value = Number(value)
  },
})

watch(() => profiles, (current) => {
  if (!current.some(profile => profile.id === submission.profileId.value)) {
    submission.profileId.value = current[0]?.id ?? null
  }
}, { immediate: true })

async function submit() {
  const submitted = await submission.submit()
  if (submitted !== null) {
    emit('submitted', submitted)
  }
}
</script>

<template>
  <AppPanel
    :title="t('symbolScreening.submit.title')"
    data-testid="symbol-screening-submit-panel"
  >
    <AppAlert
      v-if="profiles.length === 0"
      tone="info"
      data-testid="symbol-screening-submit-no-profiles"
    >
      {{ t('symbolScreening.submit.noProfiles') }}
    </AppAlert>

    <form
      v-else
      class="symbol-screening-submit-panel"
      @submit.prevent="submit"
    >
      <FormField :label="t('symbolScreening.submit.profile')">
        <AppSelect
          v-model="selectedProfileId"
          data-testid="symbol-screening-submit-profile"
        >
          <option
            v-for="profile in profiles"
            :key="profile.id"
            :value="String(profile.id)"
          >
            {{ profile.name }}
          </option>
        </AppSelect>
      </FormField>
      <FormField
        :label="t('symbolScreening.submit.symbols')"
        :hint="t('symbolScreening.submit.symbolsHint')"
      >
        <AppTextarea
          v-model="submission.symbols.value"
          data-testid="symbol-screening-submit-symbols"
        />
      </FormField>

      <p
        v-if="submission.failureMessage.value !== null"
        class="symbol-screening-submit-panel__failure"
        data-testid="symbol-screening-submit-failure"
      >
        {{ localize(submission.failureMessage.value) }}
      </p>

      <div>
        <AppButton
          type="submit"
          size="small"
          :disabled="submission.submitting.value"
          data-testid="symbol-screening-submit"
        >
          {{ t('symbolScreening.submit.submit') }}
        </AppButton>
      </div>
    </form>
  </AppPanel>
</template>

<style scoped lang="scss">
.symbol-screening-submit-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__failure {
    margin: 0;
    color: color('danger');
    font-size: font-size('sm');
  }
}
</style>
