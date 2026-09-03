<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

// 分子：留著的每一支策略，逐列可以載入或刪除。
//
// 它是覆蓋在畫面上的，不是另一頁——換頁的話，編輯器裡寫到一半的內容
// 要嘛丟失、要嘛得額外做一套狀態保存。
//
// 連不上後端與一支都沒有是兩件事：後者說「還沒有任何策略」，
// 前者要說連不上。把連線失敗顯示成空清單，會讓人以為自己什麼都沒存過。
const { open, strategies, errorMessage = null, activeStrategyId = null } = defineProps<{
  open: boolean
  strategies: StrategyDto[]
  errorMessage?: string | null
  activeStrategyId?: number | null
}>()

const emit = defineEmits<{ load: [id: number], remove: [id: number], close: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    title="策略清單"
    @close="emit('close')"
  >
    <p
      v-if="errorMessage"
      class="strategy-library__error"
      data-testid="strategy-library-error"
    >
      {{ errorMessage }}
    </p>

    <p
      v-else-if="strategies.length === 0"
      class="strategy-library__empty"
      data-testid="strategy-library-empty"
    >
      還沒有任何策略。
    </p>

    <ul
      v-else
      class="strategy-library__list"
    >
      <li
        v-for="strategy in strategies"
        :key="strategy.id"
        class="strategy-library__row"
        data-testid="strategy-library-row"
      >
        <span class="strategy-library__name">
          {{ strategy.name }}
          <span
            v-if="strategy.id === activeStrategyId"
            class="strategy-library__active"
          >使用中</span>
        </span>

        <span class="strategy-library__actions">
          <AppButton
            variant="secondary"
            size="small"
            :label="`載入「${strategy.name}」`"
            :data-testid="`strategy-library-load-${strategy.id}`"
            @click="emit('load', strategy.id)"
          >
            <AppIcon
              name="load"
              size="small"
            />
          </AppButton>
          <AppButton
            variant="danger"
            size="small"
            :label="`刪除「${strategy.name}」`"
            :data-testid="`strategy-library-delete-${strategy.id}`"
            @click="emit('remove', strategy.id)"
          >
            <AppIcon
              name="delete"
              size="small"
            />
          </AppButton>
        </span>
      </li>
    </ul>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-library {
  &__error,
  &__empty {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__error {
    color: color('danger');
  }

  // 一份清單就畫成一份清單：一條一條以髮絲線隔開，不是一疊各自帶框的小卡。
  // 十支策略疊起來時，十個框會比十行字更難數。
  &__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    border: 1px solid color('border');
    border-radius: radius('sm');
    padding: 0;
    list-style: none;
    overflow: hidden;
  }

  &__row {
    display: flex;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    padding: spacing('2xs') spacing('xs') spacing('2xs') spacing('sm');

    &:not(:last-child) {
      border-bottom: 1px solid color('border');
    }

    &:hover {
      background-color: color('surface-muted');
    }
  }

  &__name {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    min-width: 0;
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__active {
    flex: none;
    border-radius: radius('sm');
    background-color: color('primary-soft');
    padding: 0 spacing('2xs');
    color: color('primary');
    font-size: font-size('2xs');
  }

  &__actions {
    display: flex;
    flex: none;
    gap: spacing('2xs');
  }
}
</style>
