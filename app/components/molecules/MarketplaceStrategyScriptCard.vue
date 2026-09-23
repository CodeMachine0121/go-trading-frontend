<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'

// 分子：市集上的一張卡，以及它唯一那顆動作按鈕。
//
// 一張卡只有一顆按鈕，而那顆按鈕的字由「這一支現在是什麼狀態」決定：還沒收下的是「加入」，
// 收下過的是「移除」，自己分享出去的**一顆都不給**——自己的策略腳本本來就在自己清單裡，
// 給一顆按不出任何變化的按鈕比不給更糟。
//
// 卡上沒有算式，而那不是這裡藏起來的：交進來的那個形狀根本沒有算式這一欄。
const { row, busy = false } = defineProps<{
  /**
   * 這一列：那一支策略腳本，加上它對現在這個人是什麼。
   *
   * 收的是一列而不是「一支策略腳本加兩個布林」，因為那兩個布林會互相影響——
   * 自己分享的那一支不管有沒有收下過都不給按鈕。讓使用端各自組合這三個值，
   * 就是把那條規則交給每一個使用端各自記一次。
   */
  row: MarketplaceListingRowDto
  busy?: boolean
}>()

const emit = defineEmits<{ adopt: [id: number], abandon: [id: number] }>()

const strategyScript = computed(() => row.strategyScript)
</script>

<template>
  <li
    class="marketplace-strategy-script-card"
    :data-testid="`marketplace-strategy-script-${strategyScript.id}`"
  >
    <header class="marketplace-strategy-script-card__header">
      <h3 class="marketplace-strategy-script-card__name">
        {{ strategyScript.name }}
      </h3>

      <AppBadge
        v-if="row.mine"
        variant="info"
        :data-testid="`marketplace-strategy-script-mine-${strategyScript.id}`"
      >
        我分享的
      </AppBadge>
      <AppBadge
        v-else-if="row.adopted"
        variant="success"
        :data-testid="`marketplace-strategy-script-adopted-${strategyScript.id}`"
      >
        已加入
      </AppBadge>
    </header>

    <!--
      沒寫說明時說一句話，而不是留一塊空白：算式看不到的時候，一塊空白會讓人以為卡壞了。
    -->
    <p class="marketplace-strategy-script-card__description">
      {{ strategyScript.description === '' ? '分享的人沒有寫說明。' : strategyScript.description }}
    </p>

    <dl class="marketplace-strategy-script-card__facts">
      <div>
        <dt>分享者</dt>
        <dd>{{ strategyScript.publisherEmail }}</dd>
      </div>
      <div>
        <dt>算出來的是</dt>
        <dd>{{ strategyScript.resultTypeLabel }}</dd>
      </div>
      <!-- 吃哪一種行情決定它能在哪一頁跑：加入之後，它只出現在那一種的策略腳本畫面上。 -->
      <div>
        <dt>吃的行情</dt>
        <dd data-testid="marketplace-market-data-kind">
          {{ strategyScript.marketDataKindLabel }}
        </dd>
      </div>
      <div>
        <dt>可調的旋鈕</dt>
        <dd>
          {{ strategyScript.parameters.length === 0
            ? '沒有旋鈕'
            : strategyScript.parameters.map(parameter => parameter.name).join('、') }}
        </dd>
      </div>
    </dl>

    <!--
      畫不成線的先講。等使用者加進來、套到圖上、然後失敗才知道，是最貴的一種說法。
    -->
    <p
      v-if="!strategyScript.drawableOnChart"
      class="marketplace-strategy-script-card__caveat"
      :data-testid="`marketplace-strategy-script-undrawable-${strategyScript.id}`"
    >
      這一種值畫不成線，它可以拿去算，但擺不到 K 線圖上。
    </p>

    <footer class="marketplace-strategy-script-card__actions">
      <AppButton
        v-if="!row.mine && !row.adopted"
        variant="primary"
        size="small"
        :disabled="busy"
        :data-testid="`marketplace-adopt-${strategyScript.id}`"
        @click="emit('adopt', strategyScript.id)"
      >
        加入
      </AppButton>

      <AppButton
        v-else-if="!row.mine"
        variant="danger"
        size="small"
        :disabled="busy"
        :data-testid="`marketplace-abandon-${strategyScript.id}`"
        @click="emit('abandon', strategyScript.id)"
      >
        移除
      </AppButton>

      <p
        v-else
        class="marketplace-strategy-script-card__own"
      >
        自己的策略腳本本來就在你的清單裡。
      </p>
    </footer>
  </li>
</template>

<style scoped lang="scss">
.marketplace-strategy-script-card {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  padding: spacing('md');
  border: 1px solid color('border');
  border-radius: radius('md');
  background: color('surface');

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs') spacing('sm');
    align-items: center;
  }

  // 卡片的名字是它的身分，要比卡片裡其他字大一階、亮一階——
  // 與說明同一個字級的話，整張卡片讀起來是一段文字而不是一個東西。
  &__name {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('md');
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
