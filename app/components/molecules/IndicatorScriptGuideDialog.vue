<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'

/**
 * 分子：寫算式時會查的兩件事——**每一根 K 線有什麼**，以及**參數怎麼讀**。
 *
 * 兩件事收在同一個對話框裡，因為使用者去查它們的時機是同一個：
 * 手停在編輯區、想不起來該打什麼的那一刻。分成兩個地方會讓人先猜要開哪一個。
 *
 * **它是打開來看的，不是攤在版面上的。** 這兩份清單是「想不起來翻一下」，
 * 不是「一直看著」；常駐在畫面上只會跟編輯區搶同一塊寬度，
 * 而使用者九成的時間並不在查它們。
 *
 * 兩份清單都由 Application 給——它們與外框描述的是同一份沙箱契約，
 * 這裡一個欄位名、一行範例都不自己寫。
 */
defineProps<{
  open: boolean
  fields: readonly KCandleFieldDto[]
  parameterAccesses: readonly ScriptParameterAccessDto[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    title="算式裡可以用什麼"
    @close="emit('close')"
  >
    <div class="indicator-script-guide-dialog">
      <section class="indicator-script-guide-dialog__section">
        <h3 class="indicator-script-guide-dialog__heading">
          每一根 K 線有什麼
          <code class="indicator-script-guide-dialog__signature">data []indicator.KCandle</code>
        </h3>

        <dl class="indicator-script-guide-dialog__fields">
          <template
            v-for="field in fields"
            :key="field.name"
          >
            <dt
              class="indicator-script-guide-dialog__name"
              data-testid="k-candle-field"
            >
              {{ field.name }}
            </dt>
            <dd class="indicator-script-guide-dialog__meaning">
              <span class="indicator-script-guide-dialog__type">{{ field.type }}</span>
              {{ field.label }}
            </dd>
          </template>
        </dl>

        <!-- 最容易寫錯的三件事都在這裡：它不是資料庫那張表。 -->
        <p class="indicator-script-guide-dialog__note">
          這是<strong>算式看得到的</strong>形狀，不是資料庫那張表：沒有 <code>ID</code>；
          時間是 Unix 秒的整數，不是 <code>time.Time</code>；價量一律是 <code>float64</code>，
          直接算就好。沙箱只開放 <code>math</code> 與 <code>sort</code>，外框已經幫你匯入。
          算式只能做<strong>純運算</strong>，碰不到檔案、網路與時間。
        </p>
      </section>

      <section class="indicator-script-guide-dialog__section">
        <h3 class="indicator-script-guide-dialog__heading">
          參數怎麼設、怎麼讀
        </h3>

        <ol class="indicator-script-guide-dialog__steps">
          <li>
            在下面那一區按<strong>新增參數</strong>，替它取一個名字，挑一種種類，填一個預設值。
          </li>
          <li>
            在算式裡用<strong>同一個名字</strong>把它讀出來。
          </li>
          <li>
            參數跟著策略一起存；在 K 線圖表上套用這支策略時，可以替<strong>那一次</strong>另外調一個值，
            而這裡填的預設值不會被動到。
          </li>
        </ol>

        <dl class="indicator-script-guide-dialog__fields">
          <template
            v-for="access in parameterAccesses"
            :key="access.call"
          >
            <dt
              class="indicator-script-guide-dialog__name"
              data-testid="script-parameter-access"
            >
              {{ access.call }}
            </dt>
            <dd class="indicator-script-guide-dialog__meaning">
              <span class="indicator-script-guide-dialog__type">{{ access.returnType }}</span>
              {{ access.kindLabel }}——{{ access.usage }}
            </dd>
          </template>
        </dl>

        <p class="indicator-script-guide-dialog__note">
          名字打錯時這一次計算會<strong>失敗並指名</strong>是哪一個名字對不上，
          而不是安靜地拿到零——零是一個合法的數字，看起來會像算式寫錯，而錯的其實是名字。
        </p>
      </section>
    </div>

    <template #actions>
      <AppButton @click="emit('close')">
        知道了
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.indicator-script-guide-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__heading {
    display: flex;
    gap: spacing('sm');
    align-items: baseline;
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  // 標題旁那一段是外框裡真正的那一行——照抄就對得上編輯區。
  &__signature {
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__fields {
    display: grid;

    // 名字要多寬由最長的那一個決定，剩下的寬度給意思。
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

  &__steps {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding-left: spacing('md');
    color: color('text-muted');
    font-size: font-size('2xs');
    line-height: line-height('normal');

    strong {
      color: color('text-strong');
      font-weight: font-weight('medium');
    }
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
