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
const { sources, placedLabels, intervalOptions } = defineProps<{
  sources: readonly TradingStrategySignalSourceDto[]
  /** 已經擺在任何一張墊子上的那幾塊。它們在架子上淡一階。 */
  placedLabels: readonly string[]
  intervalOptions: readonly { value: string, label: string }[]
  /** 還加不加得動——到了上限時新增鍵**不存在**，而不是按了才被拒。 */
  canAdd: boolean
  signalSourceLimit: number
  /**
   * 一支挑得到的策略腳本都沒有，而且是哪一種沒有。挑得到就是 `null`。
   *
   * 這時按新增只會得到一個空的下拉選單——而畫面**明明知道原因**。
   * 而且原因有兩種，下一步完全不同：一支都沒建過的人要去建一支；
   * 建了好幾支卻沒有一支吐訊號的人要去改它們的指標值種類。
   * 兩種說同一句話，等於把後者推去建第五支同樣用不了的腳本。
   */
  shortage: 'noStrategyScripts' | 'noSignalStrategyScripts' | null
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

function intervalLabelOf(interval: string): string {
  return intervalOptions.find(option => option.value === interval)?.label ?? interval
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
      v-if="shortage === 'noStrategyScripts'"
      class="shelf__note"
      data-testid="no-strategy-scripts"
    >
      還沒有任何策略腳本。先去策略腳本庫建一支。
    </p>
    <p
      v-else-if="shortage === 'noSignalStrategyScripts'"
      class="shelf__note"
      data-testid="no-signal-strategy-scripts"
    >
      你有策略腳本，但沒有一支吐訊號，所以一支都挑不到。
      條件比對的是買入／賣出／持有，只有指標值種類是「一個信號」的腳本說得出那三個值——
      去策略腳本庫把要用的那幾支改成「一個信號」（算式要回傳 indicator.Signal）。
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
          <span class="shelf__piece-note">{{ intervalLabelOf(source.aggregationInterval) }}</span>

          <!--
            按鈕自己也標成可拖：原生拖曳不會從一個 button 上起頭，而這兩顆就坐在
            零件上。不標的話，按在它們身上往外拉什麼都不會發生——同一塊積木
            有些地方拖得動、有些地方拖不動。dragstart 照樣往上冒泡到零件身上。
          -->
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            draggable="true"
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
            draggable="true"
            label="丟掉這塊零件"
            data-testid="strategy-script-remove"
            @click="emit('remove', index)"
          >
            ✕
          </AppButton>
        </div>
      </li>

      <li v-if="canAdd && shortage === null">
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
      <li v-else-if="shortage === null">
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
