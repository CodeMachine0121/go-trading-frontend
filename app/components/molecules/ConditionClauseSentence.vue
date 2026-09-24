<script setup lang="ts">
import type { ConditionBoardItemDto } from '~/domain/models/dto/condition-board-dto'

// 分子：把條件板上的一格——一條，或扣在一起的一組——讀成一句話。
//
// 每一個字都由 DTO 說：來源代號、「等於」、收下的信號、組裡的連接詞。
// 這裡只負責排版——來源與信號各是一枚標籤，連接詞夾在中間。
//
// 整句另外寫一份給讀螢幕的人：一排標籤念出來是一串斷開的字，
// 而那一句本來就是一句話。
const { item } = defineProps<{
  item: ConditionBoardItemDto
}>()
</script>

<template>
  <span class="condition-clause-sentence">
    <span
      class="condition-clause-sentence__read-out"
      data-testid="condition-clause-sentence"
    >{{ item.sentence }}</span>

    <span
      class="condition-clause-sentence__parts"
      aria-hidden="true"
    >
      <template
        v-for="(piece, position) in item.pieces"
        :key="piece.sourceLabel"
      >
        <span
          v-if="position > 0"
          class="condition-clause-sentence__joiner"
        >{{ item.joinerWord }}</span>
        <span class="condition-clause-sentence__source">{{ piece.sourceLabel }}</span>
        <span class="condition-clause-sentence__relation">{{ piece.relationWord }}</span>
        <span
          class="condition-clause-sentence__signal"
          :class="{ 'condition-clause-sentence__signal--undecided': piece.isUndecided }"
        >{{ piece.signalWords }}</span>
      </template>
    </span>
  </span>
</template>

<style scoped lang="scss">
.condition-clause-sentence {
  display: block;
  min-width: 0;

  &__read-out {
    @include visually-hidden;
  }

  &__parts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__source,
  &__signal {
    display: inline-flex;
    align-items: center;
    border: 1px solid color('border-strong');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('3xs') spacing('xs');
    max-width: 100%;
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 來源是一支策略腳本——與整站「策略腳本」同一種強調色，一眼分得出誰在說話。
  &__source {
    border-color: color('primary');
    background-color: color('primary-soft');
  }

  &__signal--undecided {
    border-style: dashed;
    color: color('text-faint');
    font-weight: font-weight('regular');
  }

  &__relation {
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__joiner {
    color: color('info');
    font-weight: font-weight('semibold');
    font-size: font-size('xs');

    @include numeric;
  }
}
</style>
