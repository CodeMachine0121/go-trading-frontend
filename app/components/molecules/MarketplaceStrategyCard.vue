<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

// 分子：市集上的一張卡，以及它唯一那顆動作按鈕。
//
// 一張卡只有一顆按鈕，而那顆按鈕的字由「這一支現在是什麼狀態」決定：還沒收下的是「加入」，
// 收下過的是「移除」，自己分享出去的**一顆都不給**——自己的策略本來就在自己清單裡，
// 給一顆按不出任何變化的按鈕比不給更糟。
//
// 卡上沒有算式，而那不是這裡藏起來的：交進來的那個形狀根本沒有算式這一欄。
const { strategy, mine, adopted, busy = false } = defineProps<{
  strategy: PublishedStrategyDto
  /** 這一支是不是自己分享出去的。是的話不給加入或移除。 */
  mine: boolean
  /** 這一支已經在自己的清單上了嗎。 */
  adopted: boolean
  busy?: boolean
}>()

const emit = defineEmits<{ adopt: [id: number], abandon: [id: number] }>()

/** 算出來的是哪一種值，用看得懂的話說。畫不成線的那幾種要先講，使用者才不會白套一次。 */
const RESULT_TYPE_LABELS: Readonly<Record<string, string>> = {
  float: '一個數字',
  floatList: '一串數字',
  bool: '一個是非',
  boolList: '一串是非',
  signal: '一個買賣信號',
}

const resultTypeLabel = computed(() => RESULT_TYPE_LABELS[strategy.resultType] ?? strategy.resultType)
</script>

<template>
  <li
    class="marketplace-strategy-card"
    :data-testid="`marketplace-strategy-${strategy.id}`"
  >
    <header class="marketplace-strategy-card__header">
      <h3 class="marketplace-strategy-card__name">
        {{ strategy.name }}
      </h3>

      <AppBadge
        v-if="mine"
        variant="info"
        :data-testid="`marketplace-strategy-mine-${strategy.id}`"
      >
        我分享的
      </AppBadge>
      <AppBadge
        v-else-if="adopted"
        variant="success"
        :data-testid="`marketplace-strategy-adopted-${strategy.id}`"
      >
        已加入
      </AppBadge>
    </header>

    <!--
      沒寫說明時說一句話，而不是留一塊空白：算式看不到的時候，一塊空白會讓人以為卡壞了。
    -->
    <p class="marketplace-strategy-card__description">
      {{ strategy.description === '' ? '分享的人沒有寫說明。' : strategy.description }}
    </p>

    <dl class="marketplace-strategy-card__facts">
      <div>
        <dt>分享者</dt>
        <dd>{{ strategy.publisherEmail }}</dd>
      </div>
      <div>
        <dt>算出來的是</dt>
        <dd>{{ resultTypeLabel }}</dd>
      </div>
      <div>
        <dt>可調的旋鈕</dt>
        <dd>
          {{ strategy.parameters.length === 0
            ? '沒有旋鈕'
            : strategy.parameters.map(parameter => parameter.name).join('、') }}
        </dd>
      </div>
    </dl>

    <!--
      畫不成線的先講。等使用者加進來、套到圖上、然後失敗才知道，是最貴的一種說法。
    -->
    <p
      v-if="!strategy.drawableOnChart"
      class="marketplace-strategy-card__caveat"
      :data-testid="`marketplace-strategy-undrawable-${strategy.id}`"
    >
      這一種值畫不成線，它可以拿去算，但擺不到 K 線圖上。
    </p>

    <footer class="marketplace-strategy-card__actions">
      <AppButton
        v-if="!mine && !adopted"
        variant="primary"
        size="small"
        :disabled="busy"
        :data-testid="`marketplace-adopt-${strategy.id}`"
        @click="emit('adopt', strategy.id)"
      >
        加入
      </AppButton>

      <AppButton
        v-else-if="!mine"
        variant="danger"
        size="small"
        :disabled="busy"
        :data-testid="`marketplace-abandon-${strategy.id}`"
        @click="emit('abandon', strategy.id)"
      >
        移除
      </AppButton>

      <p
        v-else
        class="marketplace-strategy-card__own"
      >
        自己的策略本來就在你的清單裡。
      </p>
    </footer>
  </li>
</template>

<style scoped lang="scss">
.marketplace-strategy-card {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  padding: spacing('md');
  border: 1px solid color('border');
  border-radius: radius('md');
  background: color('surface');

  &__header {
    display: flex;
    align-items: center;
    gap: spacing('sm');
  }

  &__name {
    margin: 0;
    font-size: font-size('sm');
  }

  &__description {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('sm') spacing('md');
    margin: 0;

    dt {
      color: color('text-faint');
      font-size: font-size('2xs');
    }

    dd {
      margin: 0;
      font-size: font-size('xs');
    }
  }

  &__caveat {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }

  &__own {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
