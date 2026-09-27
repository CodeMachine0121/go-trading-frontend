<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { record, busy = false, timeZoneIdentifier } = defineProps<{
  record: ContractTradeRecordDto
  busy?: boolean
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{ addNote: [content: string] }>()

const noteText = ref('')

watch(() => record, () => {
  noteText.value = ''
})
</script>

<template>
  <AppPanel title="附註">
    <div class="contract-trade-notes-panel">
      <ol
        v-if="record.notes.length > 0"
        class="contract-trade-notes-panel__notes"
        data-testid="notes"
      >
        <li
          v-for="note in record.notes"
          :key="note.id"
          class="contract-trade-notes-panel__note"
        >
          <time class="contract-trade-notes-panel__time">{{ formatDateTimeInTimeZone(note.createdAt, timeZoneIdentifier) }}</time>
          <p class="contract-trade-notes-panel__content">
            {{ note.content }}
          </p>
        </li>
      </ol>
      <div class="contract-trade-notes-panel__add">
        <AppTextarea
          v-model="noteText"
          placeholder="加一則附註"
          data-testid="note-input"
        />
        <AppButton
          variant="secondary"
          size="small"
          :disabled="busy || noteText.trim() === ''"
          data-testid="note-add"
          @click="emit('addNote', noteText)"
        >
          加附註
        </AppButton>
      </div>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.contract-trade-notes-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notes {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__note {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__time {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__content {
    margin: 0;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('xs') spacing('sm');
    color: color('text');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }

  &__add {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: flex-end;
  }
}
</style>
