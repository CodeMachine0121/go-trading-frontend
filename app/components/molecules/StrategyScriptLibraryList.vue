<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'

// 分子：留著的每一支策略腳本，一支一列。
//
// 同一份清單出現在兩個地方：寬螢幕上它是工作台最左邊常駐的那一欄，
// 窄螢幕上它收在一個蓋上來的對話框裡（StrategyScriptLibraryDialog）。
// 兩處是同一個 UI 概念，所以只有這一個元件——長在哪裡由使用端決定。
//
// 連不上後端與一支都沒有是兩件事：後者說「還沒有任何策略腳本」，
// 前者要說連不上。把連線失敗顯示成空清單，會讓人以為自己什麼都沒存過。
const {
  strategyScripts,
  adoptedStrategyScripts,
  errorMessage = null,
  activeStrategyScriptId = null,
  activeAdoptedStrategyScriptId = null,
} = defineProps<{
  /** 自己寫的那些。它們帶著算式，所以載得進來、也刪得掉。 */
  strategyScripts: StrategyScriptDto[]
  /**
   * 從市集加入的那些。它們**沒有算式**：挑它進工作區是唯讀的，
   * 這一列上也沒有任何會改動它的動作——只有「從我的清單移除」。
   */
  adoptedStrategyScripts: PublishedStrategyScriptDto[]
  errorMessage?: string | null
  activeStrategyScriptId?: number | null
  /** 工作區裡正在用（唯讀）的那一支加入的。 */
  activeAdoptedStrategyScriptId?: number | null
}>()

const emit = defineEmits<{
  /** 挑這一支來用。自己的與加入的走同一條路——換不換得動工作區由收下的地方決定。 */
  load: [id: number]
  remove: [id: number]
  deleteAdopted: [id: number]
}>()
</script>

<template>
  <div class="strategy-script-library-list">
    <p
      v-if="errorMessage"
      class="strategy-script-library-list__message strategy-script-library-list__message--error"
      data-testid="strategy-script-library-error"
    >
      {{ errorMessage }}
    </p>

    <p
      v-else-if="strategyScripts.length === 0 && adoptedStrategyScripts.length === 0"
      class="strategy-script-library-list__message"
      data-testid="strategy-script-library-empty"
    >
      還沒有任何策略腳本。到 Marketplace 看看別人分享了什麼，或自己存一支。
    </p>

    <template v-if="strategyScripts.length > 0">
      <h3 class="strategy-script-library-list__section">
        我的策略腳本
      </h3>

      <ul class="strategy-script-library-list__rows">
        <li
          v-for="strategyScript in strategyScripts"
          :key="strategyScript.id"
          class="strategy-script-library-list__row"
          :class="{ 'strategy-script-library-list__row--active': strategyScript.id === activeStrategyScriptId }"
          data-testid="strategy-script-library-row"
        >
          <!-- 整列都按得到：一份清單是用來挑的，不是用來瞄準列尾那顆小鍵的。 -->
          <button
            type="button"
            class="strategy-script-library-list__pick"
            :aria-label="`載入「${strategyScript.name}」`"
            :aria-current="strategyScript.id === activeStrategyScriptId ? 'true' : undefined"
            :data-testid="`strategy-script-library-load-${strategyScript.id}`"
            @click="emit('load', strategyScript.id)"
          >
            <span class="strategy-script-library-list__heading">
              <span class="strategy-script-library-list__name">{{ strategyScript.name }}</span>
              <AppBadge
                v-if="strategyScript.id === activeStrategyScriptId"
                variant="accent"
              >
                使用中
              </AppBadge>
              <!--
                分享與收回在編輯器那一排（想分享的幾乎總是眼前那一支），
                但「這一支在外面」仍然是這份清單該說的事：不說的話，要知道自己分享過哪幾支，
                就只能一支一支載進來看那顆按鈕。
              -->
              <AppBadge
                v-if="strategyScript.published"
                variant="success"
                :data-testid="`strategy-script-library-shared-${strategyScript.id}`"
              >
                已分享
              </AppBadge>
            </span>
            <span
              v-if="strategyScript.description"
              class="strategy-script-library-list__detail"
            >{{ strategyScript.description }}</span>
          </button>

          <AppButton
            variant="danger-ghost"
            size="small"
            class="strategy-script-library-list__action"
            :label="`刪除「${strategyScript.name}」`"
            :data-testid="`strategy-script-library-delete-${strategyScript.id}`"
            @click="emit('remove', strategyScript.id)"
          >
            <AppIcon
              name="delete"
              size="small"
            />
          </AppButton>
        </li>
      </ul>
    </template>

    <!--
      加入來的那一段自成一節，而不是混進上面那一份：它們能做的事完全不同，
      混在一起就得靠每一列自己解釋為什麼少了幾顆按鈕。
    -->
    <template v-if="adoptedStrategyScripts.length > 0">
      <h3
        class="strategy-script-library-list__section"
        data-testid="strategy-script-library-adopted-section"
      >
        我加入的
      </h3>

      <ul class="strategy-script-library-list__rows">
        <li
          v-for="adopted in adoptedStrategyScripts"
          :key="adopted.id"
          class="strategy-script-library-list__row"
          :class="{ 'strategy-script-library-list__row--active': adopted.id === activeAdoptedStrategyScriptId }"
          :data-testid="`strategy-script-library-adopted-row-${adopted.id}`"
        >
          <button
            type="button"
            class="strategy-script-library-list__pick"
            :aria-label="`使用「${adopted.name}」（唯讀）`"
            :aria-current="adopted.id === activeAdoptedStrategyScriptId ? 'true' : undefined"
            :data-testid="`strategy-script-library-adopted-load-${adopted.id}`"
            @click="emit('load', adopted.id)"
          >
            <span class="strategy-script-library-list__heading">
              <span class="strategy-script-library-list__name">{{ adopted.name }}</span>
              <AppBadge variant="info">
                市集取得
              </AppBadge>
            </span>
            <span class="strategy-script-library-list__detail">從市集加入</span>
          </button>

          <!--
            這一列**只有**「移除」。改名、刪除、分享一顆都不給——
            它沒有算式可以改，也不是我的東西。
          -->
          <AppButton
            variant="danger-ghost"
            size="small"
            class="strategy-script-library-list__action"
            :label="`刪掉「${adopted.name}」這份副本`"
            :data-testid="`strategy-script-library-delete-adopted-${adopted.id}`"
            @click="emit('deleteAdopted', adopted.id)"
          >
            移除
          </AppButton>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped lang="scss">
.strategy-script-library-list {
  display: flex;
  flex-direction: column;

  &__message {
    margin: 0;
    padding: spacing('sm') spacing('md');
    color: color('text-faint');
    font-size: font-size('sm');
    line-height: line-height('normal');

    &--error {
      color: color('danger');
    }
  }

  &__section {
    margin: 0;
    padding: spacing('sm') spacing('md') spacing('2xs');

    @include dense-label;
  }

  // 一份清單就畫成一份清單：一條一條以髮絲線隔開，不是一疊各自帶框的小卡。
  &__rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid color('border');

    // 使用中的那一支：底色淡淡一層，左緣一條強調色——掃過去第一眼就知道自己在哪一支上。
    &--active {
      box-shadow: inset 2px 0 0 color('primary');
      background-color: color('primary-soft');
    }
  }

  // 整列可按的那一套先上，再把這一列要的直式排法蓋回去——順序反過來的話，
  // mixin 會把這裡的 gap 與對齊又改回橫式的那一份。
  &__pick {
    @include pressable-row;

    flex: 1;
    flex-direction: column;
    gap: spacing('3xs');
    align-items: flex-start;
    padding: spacing('xs') spacing('md');
    min-width: 0;
    color: inherit;
    font: inherit;
  }

  &__heading {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    align-items: center;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__detail {
    display: block;
    overflow: hidden;
    max-width: 100%;
    color: color('text-faint');
    font-size: font-size('2xs');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__action {
    flex: none;
    margin-right: spacing('xs');
  }
}
</style>
