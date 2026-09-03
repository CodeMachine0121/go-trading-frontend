<script setup lang="ts">
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

// 分子：挑一支存好的策略，旁邊擺上對這一支能做的事。
//
// 這裡刻意不用 FormField。它把標籤、控制項與說明整包在一個 <label> 裡，
// 而**點 <label> 內的任何地方，瀏覽器都會把那一下轉給它包住的第一個控制項**——
// 動作按鈕放進去，按「策略清單」會變成按到「儲存」。
// 因此 <label> 只包住選單，動作是它的兄弟。
//
// 動作與選單同屬一列且底部對齊，所以它們永遠與選單切齊；
// 擺在整個欄位外面的話，會對齊到說明文字那一行，看起來比選單低一截。
//
// 一支都沒有時，選單換成一句話而不是留一個空選單——空選單看起來像壞掉。
// 但動作**仍然要在**：那正是使用者要按「另存為新策略」存下第一支的時候。
const { strategies, activeStrategyId = null } = defineProps<{
  strategies: StrategyDto[]
  activeStrategyId?: number | null
}>()

const emit = defineEmits<{ select: [id: number] }>()

/** 選單本身永遠顯示目前使用中的那一支；換掉它是 select 事件的結果，不是選單自己的狀態。 */
const selectedValue = computed(() => (activeStrategyId === null ? '' : String(activeStrategyId)))

const hint = computed(() => (strategies.length === 0
  ? '寫好算式之後按「另存為新策略」就會留下第一支。'
  : '挑一支會把它的算式、指標值種類、彙總刻度與計算根數一起帶進來。'))

function selectStrategy(value: string) {
  if (value !== '') {
    emit('select', Number(value))
  }
}
</script>

<template>
  <div class="strategy-picker">
    <div class="strategy-picker__row">
      <label class="strategy-picker__field">
        <span class="strategy-picker__label">策略</span>

        <p
          v-if="strategies.length === 0"
          class="strategy-picker__empty"
          data-testid="strategy-picker-empty"
        >
          還沒有任何策略
        </p>

        <AppSelect
          v-else
          :model-value="selectedValue"
          data-testid="strategy-picker-select"
          @update:model-value="selectStrategy"
        >
          <option value="">
            未使用任何策略
          </option>
          <option
            v-for="strategy in strategies"
            :key="strategy.id"
            :value="String(strategy.id)"
          >
            {{ strategy.name }}
          </option>
        </AppSelect>
      </label>

      <div class="strategy-picker__actions">
        <slot name="actions" />
      </div>
    </div>

    <p class="strategy-picker__hint">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.strategy-picker {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');

  &__row {
    display: flex;
    gap: spacing('xs');

    // 底部對齊：欄位那一欄的最後一樣東西就是選單，所以動作剛好與它切齊。
    align-items: flex-end;
  }

  &__field {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: spacing('2xs');

    // 選項一長就把動作擠出去，除非允許這一欄縮到比內容窄。
    min-width: 0;
  }

  &__label {
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__empty {
    margin: 0;
    border: 1px dashed color('border');
    border-radius: radius('sm');
    padding: spacing('xs') spacing('sm');
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__actions {
    display: flex;
    flex: none;
    gap: spacing('2xs');
  }

  &__hint {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');
  }
}
</style>
