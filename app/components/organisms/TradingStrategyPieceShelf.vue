<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'

// 有機體：工作檯左邊那個零件架——這台機器人手上有哪幾塊零件。
//
// 架子是**庫存**，不是第二份清單：一塊已經擺在某張墊子上的零件在這裡淡一階，
// 但它仍然在架子上，因為它隨時可以再被拖到另一張墊子。
//
// 拖回架子＝把它從墊子上收走。那個動作由上面那一層決定要做什麼，
// 這裡只負責說「有東西掉在我身上了」。
const { sources, placedLabels } = defineProps<{
  sources: readonly TradingStrategySignalSourceDto[]
  /** 已經擺在任何一張墊子上的那幾塊。它們在架子上淡一階。 */
  placedLabels: readonly string[]
  /** 還加不加得動——到了上限時新增鍵**不存在**，而不是按了才被拒。 */
  canAdd: boolean
  signalSourceLimit: number
  /**
   * 一支會吐訊號的策略腳本都沒有。
   *
   * 這時按新增只會得到一個空的下拉選單——而畫面**明明知道原因**。
   */
  hasNoStrategyScripts: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  tune: [index: number]
  pickUp: [event: DragEvent, sourceLabel: string]
  letGo: []
  dropBack: []
}>()

function isPlaced(sourceLabel: string): boolean {
  return placedLabels.includes(sourceLabel)
}
</script>

<template>
  <section
    class="shelf"
    data-testid="shelf"
    @dragover.prevent="undefined"
    @drop.prevent="emit('dropBack')"
  >
    <h3 class="shelf__heading">
      零件架
    </h3>

    <p
      v-if="hasNoStrategyScripts"
      class="shelf__note"
      data-testid="no-strategy-scripts"
    >
      還沒有任何會吐訊號的策略腳本。先去策略腳本庫建一支。
    </p>
    <p
      v-else-if="sources.length === 0"
      class="shelf__note"
      data-testid="no-sources"
    >
      架子是空的。加一塊零件，就可以把它拖到右邊的墊子上。
    </p>

    <ul class="shelf__pieces">
      <li
        v-for="(source, index) in sources"
        :key="source.label + index"
        data-testid="strategy-script-row"
      >
        <div
          class="shelf__piece"
          :class="{ 'shelf__piece--in-use': isPlaced(source.label) }"
          :draggable="true"
          :data-testid="`shelf-piece-${source.label}`"
          @dragstart="emit('pickUp', $event, source.label)"
          @dragend="emit('letGo')"
        >
          <span
            class="shelf__grip"
            aria-hidden="true"
          >⠿</span>
          <span class="shelf__piece-name">{{ source.label }}</span>

          <AppButton
            type="button"
            variant="ghost"
            size="small"
            label="這塊零件的設定"
            :data-testid="`strategy-script-settings-${index}`"
            @click="emit('tune', index)"
          >
            ⚙
          </AppButton>
          <AppButton
            type="button"
            variant="danger-ghost"
            size="small"
            label="丟掉這塊零件"
            data-testid="strategy-script-remove"
            @click="emit('remove', index)"
          >
            ✕
          </AppButton>
        </div>
      </li>

      <li v-if="canAdd && !hasNoStrategyScripts">
        <AppButton
          type="button"
          variant="secondary"
          size="small"
          block
          data-testid="strategy-script-add"
          @click="emit('add')"
        >
          ＋ 加一塊零件
        </AppButton>
      </li>
      <li v-else-if="!hasNoStrategyScripts">
        <span class="shelf__note">架子上最多 {{ signalSourceLimit }} 塊</span>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.shelf {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');
  border: 1px dashed color('border-strong');
  border-radius: radius('md');
  padding: spacing('xs');

  &__heading {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-weight: font-weight('medium');
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__pieces {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* 一塊零件。厚、圓、底下一條暗邊——它要看起來拿得起來。 */
  &__piece {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
    border-radius: radius('sm');
    box-shadow: shadow('piece-edge');
    background-color: color('surface-raised');
    cursor: grab;
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;
    color: color('text');

    &:active {
      cursor: grabbing;
    }
  }

  // 已經擺在某張墊子上的那幾塊淡一階——架子是庫存，不是第二份清單。
  &__piece--in-use {
    opacity: 0.5;
  }

  &__piece-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: font-size('2xs');
    font-weight: font-weight('semibold');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__piece-note {
    flex: none;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__grip {
    flex: none;
    color: color('text-faint');
    font-size: font-size('xs');
    line-height: 1;
  }
}
</style>
