<script setup lang="ts">
// 分子：工作檯上的一張步驟卡——一個小標、一個標題、一塊內容，以及它被選中時的設定。
//
// 三張卡（訊號來源、什麼算買入、什麼算賣出）長得一模一樣、只有內容不同，
// 所以外框只寫在這裡一次。寫三份的話，第三份就是那個忘記跟著改的地方。
//
// 設定由使用它的那張卡從 `settings` 插槽填進來。寬螢幕上（`beside`）卡的右邊留一欄給它，
// 沒選著的卡也留著，三張卡因此永遠對齊；窄螢幕上設定自己從下方拉出，這裡不留那一欄。
type StepCardTone = 'accent' | 'success' | 'danger'

const { kicker, title, selected, tone, beside } = defineProps<{
  kicker: string
  title: string
  selected: boolean
  /** 小標旁那一格圖示的色調：來源用強調色，買入綠、賣出紅。 */
  tone: StepCardTone
  beside: boolean
}>()
</script>

<template>
  <div
    class="step-card"
    :class="{ 'step-card--beside': beside }"
  >
    <section
      class="step-card__step"
      :class="{ 'step-card__step--selected': selected }"
    >
      <header class="step-card__head">
        <span
          class="step-card__badge"
          :class="`step-card__badge--${tone}`"
          aria-hidden="true"
        >
          <slot name="badge" />
        </span>
        <div class="step-card__heading">
          <span class="step-card__kicker">{{ kicker }}</span>
          <h3 class="step-card__title">
            {{ title }}
          </h3>
        </div>
        <div
          v-if="$slots.aside"
          class="step-card__aside"
        >
          <slot name="aside" />
        </div>
      </header>

      <div class="step-card__body">
        <slot />
      </div>
    </section>

    <slot name="settings" />
  </div>
</template>

<style scoped lang="scss">
.step-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: spacing('sm');
  align-items: start;

  &--beside {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }

  &__step {
    transition: border-color duration('fast') ease, outline-color duration('fast') ease;
    outline: spacing('3xs') solid transparent;
    border: 1px solid color('border');
    border-radius: radius('lg');
    background-color: color('surface');
    min-width: 0;
  }

  // 選中的那張外面多一圈淡光：邊框換色之外，遠遠也看得出設定屬於哪一張。
  &__step--selected {
    outline-color: color('primary-soft');
    border-color: color('primary');
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('xs');
    padding: spacing('sm');
  }

  &__badge {
    display: grid;
    flex: none;
    place-items: center;
    border-radius: radius('sm');
    width: 1.75rem;
    height: 1.75rem;

    &--accent {
      background-color: color('primary-soft');
      color: color('primary');
    }

    &--success {
      background-color: color('success-soft');
      color: color('success');
    }

    &--danger {
      background-color: color('danger-soft');
      color: color('danger');
    }
  }

  &__heading {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__kicker {
    @include dense-label;
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('md');
  }

  &__aside {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    margin-left: auto;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    padding: 0 spacing('sm') spacing('sm');
  }
}
</style>
