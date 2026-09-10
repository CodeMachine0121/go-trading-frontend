<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

// 分子：留著的每一支策略，逐列可以載入或刪除。
//
// 它是覆蓋在畫面上的，不是另一頁——換頁的話，編輯器裡寫到一半的內容
// 要嘛丟失、要嘛得額外做一套狀態保存。
//
// 連不上後端與一支都沒有是兩件事：後者說「還沒有任何策略」，
// 前者要說連不上。把連線失敗顯示成空清單，會讓人以為自己什麼都沒存過。
const {
  open,
  strategies,
  adoptedStrategies,
  errorMessage = null,
  activeStrategyId = null,
} = defineProps<{
  open: boolean
  /** 自己寫的那些。它們帶著算式，所以每一種動作都做得到。 */
  strategies: StrategyDto[]
  /**
   * 從市集加入的那些。它們**沒有算式**，所以這裡連「載入」都不提供——
   * 那不是擋下來，是沒有東西可以載。
   */
  adoptedStrategies: PublishedStrategyDto[]
  errorMessage?: string | null
  activeStrategyId?: number | null
}>()

const emit = defineEmits<{
  load: [id: number]
  remove: [id: number]
  publish: [id: number]
  withdraw: [id: number]
  abandon: [id: number]
  close: []
}>()
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
      v-else-if="strategies.length === 0 && adoptedStrategies.length === 0"
      class="strategy-library__empty"
      data-testid="strategy-library-empty"
    >
      還沒有任何策略。到策略市集看看別人分享了什麼，或自己存一支。
    </p>

    <h3
      v-if="strategies.length > 0"
      class="strategy-library__section"
    >
      我的策略
    </h3>

    <ul
      v-if="strategies.length > 0"
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
          <!--
            發佈與收回是同一顆位置的兩個方向，字由「它現在在不在市集上」決定。
            兩顆並排會有一顆永遠按不動，而看的人得自己判斷是哪一顆。
          -->
          <AppButton
            v-if="!strategy.published"
            variant="secondary"
            size="small"
            :label="`把「${strategy.name}」分享到市集`"
            :data-testid="`strategy-library-publish-${strategy.id}`"
            @click="emit('publish', strategy.id)"
          >
            分享
          </AppButton>
          <AppButton
            v-else
            variant="secondary"
            size="small"
            :label="`把「${strategy.name}」從市集收回`"
            :data-testid="`strategy-library-withdraw-${strategy.id}`"
            @click="emit('withdraw', strategy.id)"
          >
            收回
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

    <!--
      加入來的那一段自成一節，而不是混進上面那一份：它們能做的事完全不同，
      混在一起就得靠每一列自己解釋為什麼少了幾顆按鈕。
    -->
    <h3
      v-if="adoptedStrategies.length > 0"
      class="strategy-library__section"
      data-testid="strategy-library-adopted-section"
    >
      我加入的
    </h3>

    <ul
      v-if="adoptedStrategies.length > 0"
      class="strategy-library__list"
    >
      <li
        v-for="adopted in adoptedStrategies"
        :key="adopted.id"
        class="strategy-library__row"
        :data-testid="`strategy-library-adopted-row-${adopted.id}`"
      >
        <span class="strategy-library__name">
          {{ adopted.name }}
          <span class="strategy-library__sharer">{{ adopted.publisherEmail }} 分享</span>
        </span>

        <span class="strategy-library__actions">
          <!--
            這一列**只有**「移除」。載入、改名、刪除、分享一顆都不給——
            它沒有算式可以載，也不是我的東西。
          -->
          <AppButton
            variant="danger"
            size="small"
            :label="`把「${adopted.name}」從我的清單移除`"
            :data-testid="`strategy-library-abandon-${adopted.id}`"
            @click="emit('abandon', adopted.id)"
          >
            移除
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

  &__section {
    margin: spacing('sm') 0 spacing('2xs');
    color: color('text-faint');
    font-weight: font-weight('medium');
    font-size: font-size('2xs');
  }

  &__sharer {
    margin-left: spacing('2xs');
    color: color('text-faint');
    font-size: font-size('2xs');
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
