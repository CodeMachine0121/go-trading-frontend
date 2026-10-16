<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'

/**
 * 分子：物件樹——目前這一檔的每一個繪圖，新畫的在上。
 * 每一列可以選取、顯示或隱藏、刪除。
 */
const { drawings, selectedDrawingId = null } = defineProps<{
  drawings: readonly ChartDrawingDto[]
  selectedDrawingId?: number | null
}>()

const emit = defineEmits<{
  select: [id: number]
  toggleVisible: [id: number]
  remove: [id: number]
  close: []
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const newestFirst = computed(() => [...drawings].reverse())
</script>

<template>
  <section
    class="chart-drawing-object-tree"
    :aria-label="t('marketData.chartDrawing.objectTree')"
    data-testid="chart-drawing-object-tree"
  >
    <header class="chart-drawing-object-tree__head">
      <h2 class="chart-drawing-object-tree__title">
        {{ t('marketData.chartDrawing.objectTree') }}
      </h2>
      <AppButton
        variant="chrome"
        size="small"
        :label="t('common.close')"
        data-testid="close-object-tree"
        @click="emit('close')"
      >
        <AppIcon
          name="close"
          stroke="fine"
        />
      </AppButton>
    </header>

    <p
      v-if="drawings.length === 0"
      class="chart-drawing-object-tree__empty"
      data-testid="object-tree-empty"
    >
      {{ t('marketData.chartDrawing.objectTreeEmpty') }}
    </p>

    <ul
      v-else
      class="chart-drawing-object-tree__list"
    >
      <li
        v-for="drawing in newestFirst"
        :key="drawing.id"
        class="chart-drawing-object-tree__row"
        :class="{ 'chart-drawing-object-tree__row--selected': drawing.id === selectedDrawingId }"
        data-testid="object-tree-row"
      >
        <button
          type="button"
          class="chart-drawing-object-tree__name"
          :class="{ 'chart-drawing-object-tree__name--hidden': !drawing.visible }"
          data-testid="object-tree-select"
          @click="emit('select', drawing.id)"
        >
          <span
            class="chart-drawing-object-tree__swatch"
            :style="{ backgroundColor: `var(${drawing.colorToken})` }"
          />
          {{ localize(drawing.kindLabel) }}
          <AppIcon
            v-if="drawing.locked"
            name="lock"
            size="small"
            stroke="fine"
          />
        </button>
        <AppButton
          variant="chrome"
          size="small"
          :label="drawing.visible ? t('marketData.chartDrawing.hideDrawing') : t('marketData.chartDrawing.showDrawing')"
          data-testid="object-tree-toggle-visible"
          @click="emit('toggleVisible', drawing.id)"
        >
          <AppIcon
            :name="drawing.visible ? 'shown' : 'hidden'"
            stroke="fine"
          />
        </AppButton>
        <AppButton
          variant="chrome"
          size="small"
          :label="t('marketData.chartDrawing.removeDrawing')"
          data-testid="object-tree-remove"
          @click="emit('remove', drawing.id)"
        >
          <AppIcon
            name="delete"
            stroke="fine"
          />
        </AppButton>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.chart-drawing-object-tree {
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: color('chart-workspace-text');

  &__head {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('chart-workspace-seam');
    padding: spacing('xs') spacing('xs') spacing('xs') spacing('sm');
  }

  &__title {
    margin: 0;
    font-size: font-size('sm');
    font-weight: font-weight('semibold');
  }

  &__empty {
    margin: 0;
    padding: spacing('md') spacing('sm');
    color: color('chart-workspace-text-muted');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__list {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  &__row {
    display: flex;
    gap: spacing('3xs');
    align-items: center;
    padding: 0 spacing('2xs') 0 spacing('sm');

    &:hover {
      background-color: color('chart-workspace-hover');
    }

    &--selected {
      box-shadow: inset 2px 0 0 color('chart-workspace-accent');
      background-color: color('chart-workspace-hover');
    }
  }

  &__name {
    display: flex;
    flex: 1;
    gap: spacing('xs');
    align-items: center;
    border: 0;
    background: none;
    cursor: pointer;
    padding: spacing('xs') 0;
    min-width: 0;
    color: inherit;
    font-size: font-size('sm');
    text-align: left;

    &--hidden {
      opacity: 0.45;
    }
  }

  &__swatch {
    flex: none;
    border-radius: radius('xs');
    width: spacing('xs');
    height: spacing('xs');
  }
}
</style>
