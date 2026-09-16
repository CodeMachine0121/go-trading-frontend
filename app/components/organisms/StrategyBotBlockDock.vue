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
// 三件事讓它出來，因為使用者會從三個不同的地方想要它：
//   1. 滑鼠碰到右緣——手已經往那邊去了
//   2. 按那個把手——他知道自己要什麼，不想靠滑過去
//   3. 點了一個空位——那一刻他要的就是「有什麼可以放進去」
const { drawer, dragActive, holeSelected } = defineProps<{
  drawer: ConditionBlockDrawerDto
  /** 畫面上正有東西被拖著。 */
  dragActive: boolean
  /** 使用者現在選著一個空位。 */
  holeSelected: boolean
}>()

const emit = defineEmits<{
  pick: [option: ConditionBlockOptionDto]
  dragStart: [option: ConditionBlockOptionDto]
  dragEnd: []
}>()

/** 滑鼠現在在右緣或抽屜上。 */
const hovering = ref(false)
/** 使用者按了把手，要它留著。留著的就不會因為滑鼠移開而收掉。 */
const pinned = ref(false)

/**
 * 現在開著沒有。
 *
 * **拖到一半一定開著**，而且這一條不是可有可無的：抽屜靠滑過去打開的話，
 * 使用者從裡面拖一塊出來的那一瞬間，滑鼠就離開了它——抽屜收掉，
 * 拖著的那一塊連同它一起消失。手上還抓著東西的時候把它收走，是最難解釋的一種畫面。
 *
 * **選著一個空位時也一定開著**：那一刻他要的就是「有什麼可以放進去」，
 * 而他剛剛點的那個空位可能在畫面的另一頭，離右緣很遠。
 */
const open = computed(() => hovering.value || pinned.value || dragActive || holeSelected)

/**
 * 按把手是「留著／收起來」，不是「打開／關閉」。
 *
 * 滑過去就會開的東西，再給它一顆「打開」的按鈕是沒有意義的——它多半已經開著了。
 * 那顆鍵真正在回答的是「別再自己跑掉」。
 */
function togglePinned() {
  pinned.value = !pinned.value
}

// 釘住之後要收掉，除了再按一次把手，鍵盤也要有一條路。
function onEscape() {
  pinned.value = false
  hovering.value = false
}
</script>

<template>
  <div
    class="block-dock"
    :class="{ 'block-dock--open': open }"
    @keydown.esc="onEscape"
  >
    <!--
      右緣那條看不見的感應帶。它與把手分開，因為它們回答的是不同的事：
      這條是「手已經往那邊去了」，把手是「我現在就要它，而且要它留著」。
    -->
    <div
      class="block-dock__edge"
      data-testid="block-dock-edge"
      @mouseenter="hovering = true"
    />

    <button
      type="button"
      class="block-dock__handle"
      :aria-expanded="open"
      aria-controls="block-dock-panel"
      :title="pinned ? '讓積木抽屜自己收起來' : '把積木抽屜留著'"
      data-testid="block-dock-handle"
      @click="togglePinned"
      @mouseenter="hovering = true"
    >
      <span
        class="block-dock__handle-mark"
        aria-hidden="true"
      >{{ pinned ? '📌' : '🧩' }}</span>
      <span class="block-dock__handle-text">積木</span>
    </button>

    <div
      id="block-dock-panel"
      class="block-dock__panel"
      data-testid="block-dock-panel"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >
      <StrategyBotBlockDrawer
        :drawer="drawer"
        @pick="option => emit('pick', option)"
        @drag-start="option => emit('dragStart', option)"
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
