<script setup lang="ts">
import StrategyBotBlockDrawer from '~/components/molecules/StrategyBotBlockDrawer.vue'
import type { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import type { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'

// 有機體：貼在畫面右緣、隨叫隨到的積木抽屜。
//
// 它從版面裡搬出來，是因為它待在版面裡就會**被樹推走**：條件愈拼愈長，
// 抽屜就愈往下掉，而它正是拼的時候每一步都要用到的東西。貼在邊緣之後，
// 它與樹有多長無關。
//
// **它只有一條規則：人在上面就開著，離開就收起來。** 沒有釘住、沒有任何一種
// 「因為某件事所以強制開著」。這一條是一路試出來的：每多一個撐開它的理由，
// 就多一個「那個理由消失時誰負責放手」的問題，而漏掉任何一個，
// 使用者看到的就是一個收不回去的抽屜。
const { drawer } = defineProps<{ drawer: ConditionBlockDrawerDto }>()

const emit = defineEmits<{
  pick: [option: ConditionBlockOptionDto]
  dragStart: [option: ConditionBlockOptionDto]
  dragEnd: []
}>()

/** 人現在在這上面。開或不開，就只看這一個。 */
const inUse = ref(false)

/**
 * 開始拖的那一刻就當人已經離開了。
 *
 * **拖曳期間瀏覽器不發 mouseleave**，所以抽屜自己看不到使用者把積木帶走。
 * 這裡補的是那一則沒有送到的消息，不是一條新規則——而且收起來更好：
 * 手上抓著積木時，要看的是**要放到哪裡**，不是抽屜裡還有什麼。
 */
function onDragStart(option: ConditionBlockOptionDto) {
  inUse.value = false
  emit('dragStart', option)
}
</script>

<template>
  <div
    class="block-dock"
    :class="{ 'block-dock--open': inUse }"
  >
    <!--
      右緣那條看不見的感應帶：手往那邊去，抽屜就出來。
    -->
    <div
      class="block-dock__edge"
      data-testid="block-dock-edge"
      @mouseenter="inUse = true"
    />

    <!--
      把手只是一個看得見的提示：那邊有東西。它不是開關——按下去留著的話，
      就又回到「誰負責把它收起來」那個問題。
      它仍然是一顆按鈕，因為用鍵盤的人沒有滑鼠可以滑過去：對他們來說，
      焦點停在上面就是「人在上面」。
    -->
    <button
      type="button"
      class="block-dock__handle"
      :aria-expanded="inUse"
      aria-controls="block-dock-panel"
      data-testid="block-dock-handle"
      @mouseenter="inUse = true"
      @focus="inUse = true"
    >
      <span
        class="block-dock__handle-mark"
        aria-hidden="true"
      >🧩</span>
      <span class="block-dock__handle-text">積木</span>
    </button>

    <div
      id="block-dock-panel"
      class="block-dock__panel"
      data-testid="block-dock-panel"
      @mouseenter="inUse = true"
      @mouseleave="inUse = false"
      @focusout="inUse = false"
    >
      <StrategyBotBlockDrawer
        :drawer="drawer"
        @pick="option => emit('pick', option)"
        @drag-start="onDragStart"
        @drag-end="emit('dragEnd')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.block-dock {
  &__edge {
    position: fixed;

    // 一條窄到不會擋住任何東西、寬到手掃過去碰得到的帶子。
    top: 0;
    right: 0;
    bottom: 0;
    z-index: z-index('dock');
    width: spacing('sm');
  }

  &__handle {
    display: flex;
    position: fixed;
    top: 50%;

    // 把手永遠露在外面，抽屜開了就跟著它一起往左讓開。
    right: 0;
    flex-direction: column;
    align-items: center;
    gap: spacing('3xs');
    transform: translateY(-50%);
    z-index: calc(#{z-index('dock')} + 1);
    transition: right duration('normal') ease;
    border: 1px solid color('border');
    border-right: none;
    border-radius: radius('sm') 0 0 radius('sm');
    background-color: color('surface-overlay');
    cursor: pointer;
    padding: spacing('xs') spacing('3xs');
    color: color('text-muted');
    font-size: font-size('2xs');
    font-family: inherit;

    &:hover {
      border-color: color('primary');
      color: color('text-strong');
    }
  }

  &__handle-text {
    // 直著寫，因為把手是直的——橫著寫會讓它變成一塊寬得擋住畫面的東西。
    writing-mode: vertical-rl;
    letter-spacing: 0.1em;
  }

  &__handle-mark {
    font-size: font-size('xs');
    line-height: 1;
  }

  &__panel {
    display: flex;
    position: fixed;
    top: spacing('sm');
    right: 0;
    bottom: spacing('sm');
    z-index: z-index('dock');
    transform: translateX(100%);
    transition: transform duration('normal') ease;

    // 它浮在畫面上，所以自己要有底色——透出底下那一頁的抽屜看起來像壞掉，
    // 不像一塊面板。
    border-left: 1px solid color('border');
    border-radius: radius('md') 0 0 radius('md');
    background-color: color('surface-overlay');
    box-shadow: shadow('lg');
    width: min(320px, 90vw);

    // 收起來的時候不該還攔得到滑鼠——它整片蓋在畫面右側。
    pointer-events: none;
    overflow-y: auto;
  }

  &--open &__panel {
    transform: translateX(0);
    pointer-events: auto;
  }

  &--open &__handle {
    right: min(320px, 90vw);
  }

  // 關掉動畫的人只要它出現與消失，不要它滑。
  @media (prefers-reduced-motion: reduce) {
    &__panel,
    &__handle {
      transition: none;
    }
  }
}
</style>
