<script setup lang="ts">
import type { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'

/**
 * 分子：寫算式時會查的三件事——**每一根 K 線有什麼**、**參數怎麼讀**，
 * 以及「一個信號」種類之下能回傳什麼。
 *
 * 它只是那份說明本身，不管自己擺在哪裡：寬螢幕上它收在一顆 ⓘ 後面的對話框裡
 * （IndicatorScriptGuideDialog），手機上它是編輯器「說明」那一段。
 * 兩處讀的是同一份，所以只有這一個元件。
 *
 * 清單都由 Application 給——它們與預填的算式描述的是同一份沙箱契約，
 * 這裡一個欄位名、一行範例都不自己寫。
 */
defineProps<{
  /**
   * 算式收到的每一格長什麼樣：進入點、標題、欄位與提醒，一整份由領域依這一頁的行情種類交來。
   * 這個元件不知道有幾種行情——它只把交來的那一份畫出來。
   */
  guide: ScriptInputGuideDto
  parameterAccesses: readonly ScriptParameterAccessDto[]
  /** 「一個信號」種類之下，算式能回傳的三個值。 */
  signalReadings: readonly SignalReadingDto[]
}>()
</script>

<template>
  <div class="indicator-script-guide">
    <section class="indicator-script-guide__section">
      <h3
        class="indicator-script-guide__heading"
        data-testid="script-input-heading"
      >
        {{ guide.heading }}
      </h3>

      <pre
        class="indicator-script-guide__code"
        data-testid="script-entry-point"
      ><code>{{ guide.entryPoint }}</code></pre>

      <dl class="indicator-script-guide__fields">
        <template
          v-for="field in guide.fields"
          :key="field.name"
        >
          <dt
            class="indicator-script-guide__name"
            data-testid="k-candle-field"
          >
            {{ field.name }}
          </dt>
          <dd class="indicator-script-guide__type">
            {{ field.type }}
          </dd>
          <dd class="indicator-script-guide__meaning">
            {{ field.label }}
          </dd>
        </template>
      </dl>

      <!-- 最容易寫錯的幾件事都在這裡：它不是資料庫那張表。 -->
      <div class="indicator-script-guide__caveat">
        <p class="indicator-script-guide__caveat-title">
          這是<strong>算式看得到的</strong>形狀，不是資料庫那張表
        </p>
        <ul class="indicator-script-guide__caveat-list">
          <li>沒有 <code>ID</code>。</li>
          <li>時間是 Unix 秒的整數，不是 <code>time.Time</code>。</li>
          <li data-testid="script-value-type-note">
            {{ guide.valueTypeNote }}
          </li>
          <li>只開放 <code>math</code> 與 <code>sort</code>，開新的空白算式時已經先幫你匯入。</li>
          <li>只能做<strong>純運算</strong>，碰不到檔案、網路與時間。</li>
          <li
            v-for="note in guide.notes"
            :key="note"
            data-testid="script-input-note"
          >
            {{ note }}
          </li>
        </ul>
      </div>
    </section>

    <section class="indicator-script-guide__section">
      <h3 class="indicator-script-guide__heading">
        參數怎麼設、怎麼讀
      </h3>

      <ol class="indicator-script-guide__steps">
        <li>在「參數」那一區按<strong>新增參數</strong>，取一個名字、挑一種種類、填一個預設值。</li>
        <li>在算式裡用<strong>同一個名字</strong>把它讀出來。</li>
        <li>
          參數跟著策略腳本一起存。在 K 線圖表上套用這支策略腳本時，可以替<strong>那一次</strong>
          另外調一個值，而這裡填的預設值不會被動到。
        </li>
      </ol>

      <div
        v-for="access in parameterAccesses"
        :key="access.kindLabel"
        class="indicator-script-guide__kind"
        data-testid="script-parameter-access"
      >
        <p class="indicator-script-guide__kind-title">
          {{ access.kindLabel }}
          <span class="indicator-script-guide__type">讀出來是 {{ access.returnType }}</span>
        </p>
        <pre class="indicator-script-guide__code"><code>{{ access.example }}</code></pre>
        <p class="indicator-script-guide__kind-usage">
          {{ access.usage }}
        </p>
      </div>

      <div class="indicator-script-guide__caveat">
        <p class="indicator-script-guide__caveat-title">
          名字打錯時會<strong>失敗並指名</strong>，不會安靜地拿到零
        </p>
        <ul class="indicator-script-guide__caveat-list">
          <li>零是一個合法的數字，看起來會像算式寫錯，而錯的其實是名字。</li>
        </ul>
      </div>
    </section>

    <section class="indicator-script-guide__section">
      <h3 class="indicator-script-guide__heading">
        說出這一棒的意見（種類選「一個信號」時）
      </h3>

      <p class="indicator-script-guide__kind-usage">
        指標值種類挑「一個信號」時，進入點回傳一個訊號。用系統提供的三個值選一個
        <code>return</code> 出去，沒有第四種、也不能自己組一個。回測讀的就是它。
      </p>

      <table class="indicator-script-guide__signals">
        <thead>
          <tr>
            <th scope="col">
              算式回傳
            </th>
            <th scope="col">
              意思
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="reading in signalReadings"
            :key="reading.value"
            data-testid="signal-reading-row"
          >
            <td class="indicator-script-guide__name">
              {{ reading.value }}
            </td>
            <td class="indicator-script-guide__meaning">
              {{ reading.meaning }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped lang="scss">
.indicator-script-guide {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  // 程式碼一律照抄得走，所以它長得像編輯區裡的字，不像段落裡的字。
  &__code {
    margin: 0;
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('background');
    padding: spacing('2xs') spacing('xs');
    overflow-x: auto;
    color: color('text-strong');
    font-size: font-size('2xs');
    line-height: line-height('relaxed');

    @include numeric;
  }

  // 名字、型別、意思各一欄，三欄各自對齊——十個欄位掃過去才看得出規律。
  &__fields {
    display: grid;
    gap: spacing('3xs') spacing('sm');
    grid-template-columns: auto auto minmax(0, 1fr);
    margin: 0;
  }

  &__name {
    color: color('text-strong');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__type {
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__meaning {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  &__signals {
    border-collapse: collapse;
    width: 100%;
    font-size: font-size('2xs');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('3xs') spacing('xs');
      text-align: left;
      vertical-align: top;
    }

    th {
      color: color('text-faint');
      font-weight: font-weight('medium');
    }
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
  }

  // 一種參數一塊：標題說它讀出來是什麼，接著是照抄得走的那兩行，最後一句說它做什麼。
  &__kind {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border-left: 2px solid color('border-strong');
    padding-left: spacing('sm');
  }

  &__kind-title {
    display: flex;
    gap: spacing('xs');
    align-items: baseline;
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('2xs');
  }

  &__kind-usage {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  // 「這裡最容易寫錯」自成一塊，才不會跟上面那些照抄得走的東西混在一起。
  &__caveat {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('xs') spacing('sm');
  }

  &__caveat-title {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  &__caveat-list {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    padding-left: spacing('sm');
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  strong {
    color: color('text-strong');
    font-weight: font-weight('medium');
  }

  code {
    color: color('text-muted');

    @include numeric;
  }
}
</style>
