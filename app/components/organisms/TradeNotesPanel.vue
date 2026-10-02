<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import type { TradeNoteDto } from '~/domain/models/dto/trade-note-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { notes, busy = false, timeZoneIdentifier } = defineProps<{
  notes: readonly TradeNoteDto[]
  busy?: boolean
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{ addNote: [content: string] }>()

const { t } = useI18n()

const noteText = ref('')

watch(() => notes.map(note => note.id).join(','), () => {
  noteText.value = ''
})
</script>

<template>
  <AppPanel :title="t('tradeJournal.notesPanel.title')">
    <div class="trade-notes-panel">
      <ol
        v-if="notes.length > 0"
        class="trade-notes-panel__notes"
        data-testid="notes"
      >
        <li
          v-for="note in notes"
          :key="note.id"
          class="trade-notes-panel__note"
        >
          <time class="trade-notes-panel__time">{{ formatDateTimeInTimeZone(note.createdAt, timeZoneIdentifier) }}</time>
          <p class="trade-notes-panel__content">
            {{ note.content }}
          </p>
        </li>
      </ol>
      <div class="trade-notes-panel__add">
        <AppTextarea
          v-model="noteText"
          :placeholder="t('tradeJournal.notesPanel.placeholder')"
          data-testid="note-input"
        />
        <AppButton
          variant="secondary"
          size="small"
          :disabled="busy || noteText.trim() === ''"
          data-testid="note-add"
          @click="emit('addNote', noteText)"
        >
          {{ t('tradeJournal.notesPanel.add') }}
        </AppButton>
      </div>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.trade-notes-panel {
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
