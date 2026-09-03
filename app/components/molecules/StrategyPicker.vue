<script setup lang="ts">
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

// 分子：挑一支存好的策略，並說明目前用的是哪一支。
//
// 一支都沒有時給的是一句話而不是一個空選單——空選單看起來像壞掉，
// 一句「還沒有任何策略」才說得出真正發生的事。
const { strategies, activeStrategyId = null } = defineProps<{
  strategies: StrategyDto[]
  activeStrategyId?: number | null
}>()

const emit = defineEmits<{ select: [id: number] }>()

/** 選單本身永遠顯示目前使用中的那一支；換掉它是 select 事件的結果，不是選單自己的狀態。 */
const selectedValue = computed(() => (activeStrategyId === null ? '' : String(activeStrategyId)))

function selectStrategy(value: string) {
  if (value !== '') {
    emit('select', Number(value))
  }
}
</script>

<template>
  <div class="strategy-picker">
    <p
      v-if="strategies.length === 0"
      class="strategy-picker__empty"
      data-testid="strategy-picker-empty"
    >
      還沒有任何策略。寫好算式之後按「另存為新策略」就會留下第一支。
    </p>

    <FormField
      v-else
      label="策略"
      hint="挑一支會把它的算式、指標值種類、彙總刻度與計算根數一起帶進來。"
    >
      <AppSelect
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
    </FormField>
  </div>
</template>

<style scoped lang="scss">
.strategy-picker__empty {
  margin: 0;
  color: color('text-muted');
  line-height: line-height('normal');
  font-size: font-size('xs');
}
</style>
