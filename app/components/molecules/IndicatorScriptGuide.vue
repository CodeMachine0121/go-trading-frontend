<script setup lang="ts">
import type { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'
import { useI18n } from 'vue-i18n'

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

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <div class="indicator-script-guide">
    <section class="indicator-script-guide__section">
      <h3
        class="indicator-script-guide__heading"
        data-testid="script-input-heading"
      >
        {{ localize(guide.heading) }}
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
            {{ localize(field.label) }}
          </dd>
        </template>
      </dl>

      <!-- 最容易寫錯的幾件事都在這裡：它不是資料庫那張表。 -->
      <div class="indicator-script-guide__caveat">
        <i18n-t
          keypath="strategyScript.indicatorScriptGuide.shapeCaveat.title"
          tag="p"
          class="indicator-script-guide__caveat-title"
        >
          <template #emphasis>
            <strong>{{ t('strategyScript.indicatorScriptGuide.shapeCaveat.titleEmphasis') }}</strong>
          </template>
        </i18n-t>
        <ul class="indicator-script-guide__caveat-list">
          <i18n-t
            keypath="strategyScript.indicatorScriptGuide.shapeCaveat.noId"
            tag="li"
          >
            <template #id>
              <code>ID</code>
            </template>
          </i18n-t>
          <i18n-t
            keypath="strategyScript.indicatorScriptGuide.shapeCaveat.unixSeconds"
            tag="li"
          >
            <template #timeType>
              <code>time.Time</code>
            </template>
          </i18n-t>
          <li data-testid="script-value-type-note">
            {{ localize(guide.valueTypeNote) }}
          </li>
          <i18n-t
            keypath="strategyScript.indicatorScriptGuide.shapeCaveat.packages"
            tag="li"
          >
            <template #math>
              <code>math</code>
            </template>
            <template #sort>
              <code>sort</code>
            </template>
          </i18n-t>
          <i18n-t
            keypath="strategyScript.indicatorScriptGuide.shapeCaveat.pureComputation"
            tag="li"
          >
            <template #emphasis>
              <strong>{{ t('strategyScript.indicatorScriptGuide.shapeCaveat.pureComputationEmphasis') }}</strong>
            </template>
          </i18n-t>
          <i18n-t
            keypath="strategyScript.indicatorScriptGuide.shapeCaveat.noConcurrency"
            tag="li"
            data-testid="script-concurrency-note"
          >
            <template #go>
              <code>go</code>
            </template>
          </i18n-t>
          <li
            v-for="(note, noteIndex) in guide.notes"
            :key="noteIndex"
            data-testid="script-input-note"
          >
            {{ localize(note) }}
          </li>
        </ul>
      </div>
    </section>

    <section class="indicator-script-guide__section">
      <h3 class="indicator-script-guide__heading">
        {{ t('strategyScript.indicatorScriptGuide.parameters.heading') }}
      </h3>

      <ol class="indicator-script-guide__steps">
        <i18n-t
          keypath="strategyScript.indicatorScriptGuide.parameters.addStep"
          tag="li"
        >
          <template #emphasis>
            <strong>{{ t('strategyScript.indicatorScriptGuide.parameters.addStepEmphasis') }}</strong>
          </template>
        </i18n-t>
        <i18n-t
          keypath="strategyScript.indicatorScriptGuide.parameters.readStep"
          tag="li"
        >
          <template #emphasis>
            <strong>{{ t('strategyScript.indicatorScriptGuide.parameters.readStepEmphasis') }}</strong>
          </template>
        </i18n-t>
        <i18n-t
          keypath="strategyScript.indicatorScriptGuide.parameters.overrideStep"
          tag="li"
        >
          <template #emphasis>
            <strong>{{ t('strategyScript.indicatorScriptGuide.parameters.overrideStepEmphasis') }}</strong>
          </template>
        </i18n-t>
      </ol>

      <div
        v-for="access in parameterAccesses"
        :key="access.returnType"
        class="indicator-script-guide__kind"
        data-testid="script-parameter-access"
      >
        <p class="indicator-script-guide__kind-title">
          {{ localize(access.kindLabel) }}
          <span class="indicator-script-guide__type">{{ t('strategyScript.indicatorScriptGuide.parameters.returnType', { returnType: access.returnType }) }}</span>
        </p>
        <pre class="indicator-script-guide__code"><code>{{ localize(access.example) }}</code></pre>
        <p class="indicator-script-guide__kind-usage">
          {{ localize(access.usage) }}
        </p>
      </div>

      <div class="indicator-script-guide__caveat">
        <i18n-t
          keypath="strategyScript.indicatorScriptGuide.parameters.misnamedTitle"
          tag="p"
          class="indicator-script-guide__caveat-title"
        >
          <template #emphasis>
            <strong>{{ t('strategyScript.indicatorScriptGuide.parameters.misnamedTitleEmphasis') }}</strong>
          </template>
        </i18n-t>
        <ul class="indicator-script-guide__caveat-list">
          <li>{{ t('strategyScript.indicatorScriptGuide.parameters.misnamedReason') }}</li>
        </ul>
      </div>
    </section>

    <section class="indicator-script-guide__section">
      <h3 class="indicator-script-guide__heading">
        {{ t('strategyScript.indicatorScriptGuide.signal.heading') }}
      </h3>

      <i18n-t
        keypath="strategyScript.indicatorScriptGuide.signal.explanation"
        tag="p"
        class="indicator-script-guide__kind-usage"
      >
        <template #return>
          <code>return</code>
        </template>
      </i18n-t>

      <table class="indicator-script-guide__signals">
        <thead>
          <tr>
            <th scope="col">
              {{ t('strategyScript.indicatorScriptGuide.signal.returnedHeading') }}
            </th>
            <th scope="col">
              {{ t('strategyScript.indicatorScriptGuide.signal.meaningHeading') }}
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
              {{ localize(reading.meaning) }}
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
