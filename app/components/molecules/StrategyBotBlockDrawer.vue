<script setup lang="ts">
import type { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import type { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'

// 分子：積木抽屜——這一刻拼得出來的每一塊。
//
// 它住在畫面右緣的抽屜裡（見 StrategyBotBlockDock），所以是**直的**：
// 一欄一欄往下排。橫著排的版本待在版面裡，而待在版面裡的東西會被樹推走——
// 條件愈拼愈長，抽屜就愈往下掉，偏偏它是拼的時候每一步都要用到的。
//
// 放不進去的那幾塊仍然列出來，只是按不下去並說得出原因。整個拿掉的話，
// 使用者看到的是一個東西變少了的抽屜，而不知道是自己碰到了上限。
//
// 它**一個判斷都不做**：哪一塊按得下去、按不下去那句話是什麼，都在收到的形狀裡了。
const { drawer } = defineProps<{ drawer: ConditionBlockDrawerDto }>()

const emit = defineEmits<{
  pick: [option: ConditionBlockOptionDto]
  dragStart: [option: ConditionBlockOptionDto]
  dragEnd: []
}>()

/**
 * 每一塊都拖得動，**包括現在按不下去的那幾塊**。
 *
 * 兩件事不一樣：按得下去問的是「使用者剛剛點的那個空位收不收它」，而拖是從這裡開始、
 * 到某個空位才知道結果的。拖之前先擋，等於要求使用者先點一個空位才拖得起來——
 * 而拖拉存在的理由正是不必先點。放不放得下由落點說，它問的是同一個方法。
 *
 * 瀏覽器的拖放通道要有東西才認得這是一次拖曳，但**沒有人會去讀它**——
 * 拖著的是哪一塊由工作台自己記著。字串要變回一塊積木得有人認得那個格式，
 * 而那個方向沒有來源物件可以掛。
 */
function onDragStart(event: DragEvent, option: ConditionBlockOptionDto) {
  event.dataTransfer?.setData('text/plain', option.label)
  emit('dragStart', option)
}

/**
 * 按不下去的那幾塊在這裡擋，而不是靠 `disabled`。
 *
 * **一顆 `disabled` 的按鈕在 DOM 裡收不到任何事件——包括拖曳。** 用它的話，
 * 一塊「現在點不下去」的積木會連拖都拖不動，而拖拉存在的理由正是不必先點一個空位。
 * 所以那件事寫在 `aria-disabled` 與這個判斷裡：讀螢幕的人照樣聽得到它現在不能按，
 * 手上拖著它的人照樣拖得動。
 */
function onPick(option: ConditionBlockOptionDto) {
  if (option.enabled) {
    emit('pick', option)
  }
}
</script>

<template>
  <section
    class="block-drawer"
    data-testid="block-drawer"
  >
    <header class="block-drawer__head">
      <h3 class="block-drawer__heading">
        積木抽屜
      </h3>
      <p
        v-if="drawer.hint !== ''"
        class="block-drawer__hint"
        data-testid="block-drawer-hint"
      >
        {{ drawer.hint }}
      </p>
    </header>

    <div class="block-drawer__groups">
      <!--
        兩類分開列，因為它們是兩種東西：比對是「讀哪一個來源」，群組是「怎麼合併」。
        混成一排的話，來源多起來時群組那兩塊會被推到看不見的地方，
        而群組是每拼一層都要用到的。
      -->
      <div
        v-for="section in [
          { key: 'comparisons', label: '比對', options: drawer.comparisons },
          { key: 'groups', label: '群組', options: drawer.groups },
        ]"
        :key="section.key"
        class="block-drawer__section"
      >
        <span class="block-drawer__section-label">{{ section.label }}</span>

        <ul
          v-if="section.options.length > 0"
          class="block-drawer__blocks"
        >
          <li
            v-for="option in section.options"
            :key="option.key"
          >
            <button
              type="button"
              class="block-drawer__block"
              :class="[
                `block-drawer__block--${section.key}`,
                { 'block-drawer__block--unavailable': !option.enabled },
              ]"
              :aria-disabled="!option.enabled"
              :title="option.enabled ? undefined : option.disabledReason"
              :draggable="true"
              :data-testid="`block-${option.key}`"
              @click="onPick(option)"
              @dragstart="onDragStart($event, option)"
              @dragend="emit('dragEnd')"
            >
              {{ option.label }}
            </button>
          </li>
        </ul>

        <!--
          空著的分類要說一句。一個什麼都沒有的分類看起來像壞了，
          不像「你還沒給我材料」。
        -->
        <p
          v-else
          class="block-drawer__empty"
          data-testid="block-drawer-empty"
        >
          還沒有
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.block-drawer {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('xs') spacing('sm');

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: spacing('2xs') spacing('xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('xs');
    font-weight: font-weight('semibold');
  }

  &__hint {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  // 直的：這個抽屜是一欄，不是一條。
  flex: 1;
  overflow-y: auto;

  &__groups {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    min-width: 0;
  }

  &__section-label {
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  &__blocks {
    display: flex;

    // 一塊一行：積木上寫的是代號加一句話，擠成兩欄之後每一塊都得換行，
    // 而換了行的積木看起來像兩塊。
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__block {
    border: 1px solid color('border');
    text-align: left;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    cursor: grab;
    padding: spacing('3xs') spacing('2xs');
    color: color('text');
    font-size: font-size('2xs');
    font-family: inherit;

    &:not(&--unavailable):hover {
      border-color: color('primary');
      color: color('text-strong');
    }

    // 兩類的邊各給一個顏色：拖到一半時，落點旁邊那個顏色就說得出自己接的是哪一種。
    &--comparisons {
      border-left: 2px solid color('info');
    }

    &--groups {
      border-left: 2px solid color('primary');
    }

    // 按不下去用 aria-disabled 標，不用 disabled 屬性：後者連拖曳都收不到，
    // 而這幾塊必須拖得動。
    &--unavailable {
      opacity: 0.45;
    }
  }

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }
}
</style>
