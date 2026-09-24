<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'

// 分子：一台機器人現在在做什麼，畫成一個（或兩個）標籤。
//
// 語氣與字都是問領域模型要的，這裡不判斷任何狀態字串——
// 「停擺要比已停止更醒目」是規則，不是配色偏好。
defineProps<{ runState: StrategyBotRunStateDto }>()
</script>

<template>
  <div class="strategy-bot-status">
    <AppBadge
      :variant="runState.statusTone"
      data-testid="bot-status-badge"
    >
      {{ runState.statusLabel }}
    </AppBadge>

    <!--
      規則打架與狀態並列而不是取代它：機器人**還在跑**，
      但它現在什麼都不會說，而且會一直不說下去。
    -->
    <AppBadge
      v-if="runState.isConflicting"
      variant="warning"
      data-testid="bot-conflicting-badge"
    >
      規則打架了
    </AppBadge>

    <!-- 停擺原因是使用者要去處理的那一句，所以它跟著標籤走、不必點開才看得到。 -->
    <p
      v-if="runState.isHalted"
      class="strategy-bot-status__reason"
      data-testid="bot-halt-reason"
    >
      {{ runState.haltReasonLabel }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: spacing('2xs');

  // 自己佔一整行、墊一塊軟底：它是一句要人去做事的話，不是標籤旁邊的一個小註解。
  &__reason {
    flex-basis: 100%;
    margin: 0;
    border-radius: radius('sm');
    background-color: color('danger-soft');
    padding: spacing('2xs') spacing('xs');
    color: color('danger');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }
}
</style>
