<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'

/**
 * 分子：算式收到的每一根 K 線有哪些欄位。
 *
 * 寫算式的時候要查的就是這件事——`candle.` 後面能接什麼。它擺在編輯區旁邊，
 * 因為那正是問這個問題的時刻；查一次要開文件或翻後端程式碼的話，多半就會憑印象亂猜。
 *
 * 清單由 Application 給（它與外框描述的是同一份沙箱契約），這裡一個欄位名都不自己寫。
 */
defineProps<{ fields: KCandleFieldDto[] }>()
</script>

<template>
  <AppPanel
    title="每一根 K 線有什麼"
    class="k-candle-field-reference"
  >
    <template #meta>
      <code class="k-candle-field-reference__signature">data []indicator.KCandle</code>
    </template>

    <dl class="k-candle-field-reference__fields">
      <template
        v-for="field in fields"
        :key="field.name"
      >
        <dt
          class="k-candle-field-reference__name"
          data-testid="k-candle-field"
        >
          {{ field.name }}
        </dt>
        <dd class="k-candle-field-reference__meaning">
          <span class="k-candle-field-reference__type">{{ field.type }}</span>
          {{ field.label }}
        </dd>
      </template>
    </dl>

    <!-- 最容易寫錯的三件事都在這裡：它不是資料庫那張表。 -->
    <p class="k-candle-field-reference__note">
      這是<strong>算式看得到的</strong>形狀，不是資料庫那張表：沒有 <code>ID</code>；
      時間是 Unix 秒的整數，不是 <code>time.Time</code>；價量一律是 <code>float64</code>，
      直接算就好。沙箱只開放 <code>math</code> 與 <code>sort</code>，外框已經幫你匯入。
    </p>
  </AppPanel>
</template>

<style scoped lang="scss">
.k-candle-field-reference {
  flex: none;

  // 標題列上那一段是外框裡真正的那一行——照抄就對得上編輯區。
  &__signature {
    @include numeric;
  }

  &__fields {
    display: grid;

    // 欄位名要多寬由最長的那一個決定（TakerBuyQuoteVolume），剩下的寬度給意思。
    gap: spacing('3xs') spacing('sm');
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
  }

  &__name {
    color: color('text-strong');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__meaning {
    display: flex;
    gap: spacing('2xs');
    align-items: baseline;
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  &__type {
    flex: none;
    color: color('text-faint');

    @include numeric;
  }

  &__note {
    margin: 0;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');

    code {
      color: color('text-muted');

      @include numeric;
    }

    strong {
      color: color('text-muted');
      font-weight: font-weight('medium');
    }
  }
}
</style>
