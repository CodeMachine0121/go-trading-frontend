<script setup lang="ts">
import AppSwitch from '~/components/atoms/AppSwitch.vue'
import type { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'

/**
 * 分子：現貨／合約開關。
 *
 * 它不自己決定去哪裡——對應畫面由 DTO 說，它只在被按下時把那條路交出去。
 * 開關的位置永遠反映**現在所在的那一邊**，所以從網址直接進合約畫面時它已經停在「合約」。
 */
const { counterpart } = defineProps<{ counterpart: MarketCounterpartDto }>()

const emit = defineEmits<{ navigate: [path: string] }>()

const onContract = computed({
  get: () => counterpart.onContract,
  set: () => {
    if (counterpart.counterpartPath !== null) {
      emit('navigate', counterpart.counterpartPath)
    }
  },
})
</script>

<template>
  <div class="market-switch">
    <AppSwitch
      v-model="onContract"
      :disabled="!counterpart.switchable"
      :label="counterpart.switchLabel"
      data-testid="market-switch"
    >
      <template #off>
        現貨
      </template>
      <template #on>
        合約
      </template>
    </AppSwitch>

    <!-- 按不動時照樣說出為什麼：停留提示在手機上看不到。 -->
    <span
      v-if="!counterpart.switchable"
      class="market-switch__reason"
      data-testid="market-switch-reason"
    >{{ counterpart.switchLabel }}</span>
  </div>
</template>

<style scoped lang="scss">
.market-switch {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  align-items: flex-end;

  &__reason {
    color: color('text-faint');
    font-size: font-size('2xs');
    white-space: nowrap;
  }
}
</style>
