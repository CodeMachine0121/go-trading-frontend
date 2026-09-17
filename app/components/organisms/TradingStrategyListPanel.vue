<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { useTradingStrategies } from '~/composables/use-trading-strategies'

// 有機體：交易策略清單這一整塊——每一份、空清單、錯誤與重試、刪除確認。
//
// 它不顯示「幾台機器人在用」。要顯示那個數字，得為每一份各問一次機器人清單，
// 而它救不了任何一次操作：真的要刪的時候後端會擋下並說出數字。
const { tradingStrategyApplication } = defineProps<{
  tradingStrategyApplication: TradingStrategyApplication
}>()

const tradingStrategies = useTradingStrategies(tradingStrategyApplication)

onMounted(() => {
  void tradingStrategies.load()
})
</script>

<template>
  <AppPanel title="我的交易策略">
    <template #actions>
      <!-- 拼好一份之後下一步是派一台機器人出去，所以那條路就擺在這裡。 -->
      <AppButton
        to="/strategy-bots"
        variant="ghost"
        data-testid="trading-strategy-bots-link"
      >
        我的機器人
      </AppButton>
      <AppButton
        to="/trading-strategies/new"
        data-testid="trading-strategy-create"
      >
        ＋ 拼一份交易策略
      </AppButton>
    </template>

    <AppToast :message="tradingStrategies.announcement.value" />

    <AppAlert
      v-if="tradingStrategies.failureMessage.value !== ''"
      tone="danger"
      data-testid="trading-strategy-list-failure"
    >
      {{ tradingStrategies.failureMessage.value }}
      <template #action>
        <AppButton
          type="button"
          variant="ghost"
          data-testid="trading-strategy-list-retry"
          @click="tradingStrategies.load"
        >
          再試一次
        </AppButton>
      </template>
    </AppAlert>

    <p
      v-if="tradingStrategies.loading.value"
      class="trading-strategy-list__notice"
    >
      讀取中…
    </p>

    <!--
      讀不到與「一份都沒有」永遠分開講：一句要他再試一次，一句要他去拼一份。
      說成同一句，他會把一次連不上讀成自己什麼都沒有。
    -->
    <p
      v-else-if="tradingStrategies.failureMessage.value === ''
        && tradingStrategies.tradingStrategies.value.length === 0"
      class="trading-strategy-list__notice"
      data-testid="trading-strategy-list-empty"
    >
      還沒有任何交易策略。拼一份之後，就能讓好幾台機器人一起照它判斷。
    </p>

    <ul
      v-else-if="tradingStrategies.tradingStrategies.value.length > 0"
      class="trading-strategy-list__rows"
    >
      <li
        v-for="tradingStrategy in tradingStrategies.tradingStrategies.value"
        :key="tradingStrategy.id"
        class="trading-strategy-list__row"
        data-testid="trading-strategy-row"
      >
        <div class="trading-strategy-list__identity">
          <span class="trading-strategy-list__name">{{ tradingStrategy.name }}</span>
          <span class="trading-strategy-list__meta">
            {{ tradingStrategy.signalSources.length }} 支策略腳本
          </span>
        </div>

        <div class="trading-strategy-list__actions">
          <AppButton
            :to="`/trading-strategies/${tradingStrategy.id}`"
            variant="secondary"
            data-testid="trading-strategy-edit"
          >
            改一改
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            :disabled="tradingStrategies.busyId.value === tradingStrategy.id"
            data-testid="trading-strategy-delete"
            @click="tradingStrategies.askToDelete(tradingStrategy)"
          >
            刪掉
          </AppButton>
        </div>
      </li>
    </ul>

    <!-- 刪除不可逆，而它是花時間拼出來的。 -->
    <ConfirmDialog
      :open="tradingStrategies.deleting.value !== null"
      title="刪掉這一份交易策略？"
      :message="`「${tradingStrategies.deleting.value?.name ?? ''}」刪掉就沒了。還有機器人在用它的話，這一步會被擋下來。`"
      confirm-label="刪掉"
      data-testid="trading-strategy-delete-confirm"
      @confirm="tradingStrategies.confirmDelete"
      @cancel="tradingStrategies.cancelDelete"
    />
  </AppPanel>
</template>

<style scoped lang="scss">
.trading-strategy-list {
  &__notice {
    color: color('text-faint');
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    align-items: center;
    justify-content: space-between;
    border: 1px solid color('border');
    border-radius: radius('sm');
    padding: spacing('2xs');
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__name {
    font-weight: font-weight('medium');
  }

  &__meta {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__actions {
    display: flex;
    gap: spacing('3xs');
  }
}
</style>
