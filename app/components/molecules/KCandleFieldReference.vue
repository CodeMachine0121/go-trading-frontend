<script setup lang="ts">
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'

/**
 * 分子：算式收到的每一根 K 線有哪些欄位。
 *
 * 寫算式的時候要查的就是這件事——`candle.` 後面能接什麼。它擺在編輯區底下，
 * 因為那正是問這個問題的時刻；查一次要開文件或翻後端程式碼的話，多半就會憑印象亂猜。
 *
 * **它是收起來的。** 這份清單是「想不起來的時候翻一下」，不是「一直看著」——
 * 攤開來擺著會讓它跟編輯區搶同一塊版面，而使用者九成的時間並不在查它。
 *
 * 清單由 Application 給（它與外框描述的是同一份沙箱契約），這裡一個欄位名都不自己寫。
 */
defineProps<{ fields: KCandleFieldDto[] }>()
</script>

<template>
  <details class="k-candle-field-reference">
    <summary class="k-candle-field-reference__summary">
      每一根 K 線有什麼
      <code class="k-candle-field-reference__signature">data []indicator.KCandle</code>
    </summary>

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
      算式只能做<strong>純運算</strong>，碰不到檔案、網路與時間。
    </p>
  </details>
</template>

<style scoped lang="scss">
.k-candle-field-reference {
  flex: none;
  border: 1px solid color('border');
  border-radius: radius('sm');

  &__summary {
    display: flex;
    gap: spacing('sm');
    align-items: baseline;
    cursor: pointer;
    padding: spacing('2xs') spacing('sm');
    color: color('text-muted');
    font-size: font-size('2xs');

    @include focus-ring;
  }

  &[open] &__summary {
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
  }

  // 收合把手上那一段是外框裡真正的那一行——照抄就對得上編輯區。
  &__signature {
    color: color('text-faint');

    @include numeric;
  }

  &__fields {
    display: grid;
    padding: spacing('sm') spacing('sm') 0;

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
    padding: spacing('sm');
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
