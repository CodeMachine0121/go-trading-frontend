<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'

// 原子：全站唯一的對話框。疊在畫面上、把注意力收在一件事上——
// 清單、取名、再問一次三處共用它，不各自長出一個。
// 它不認識任何領域概念，內容一律由使用端以插槽給。
//
// **窄螢幕上它是一張從底部升起的紙，不是一個浮在正中間的框。**
// 手機上沒有一個 app 把對話框擺在螢幕正中間，理由很實際：正中間那個位置
// 拇指構不到，而一個要按「儲存」的東西不該逼使用者換手。從底部升起的紙
// 把動作留在拇指的行程裡，上緣那條握把則說出「這張紙可以推回去」。
//
// 哪一種樣子**由樣式決定**，不由程式決定：兩者的差別純粹是位置、圓角與寬度，
// 沒有任何一段行為不同。唯一多出來的行為是往下拖那條握把等同關閉，
// 而那條握把在寬螢幕上根本畫不出來。
const { open, title } = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{ close: [] }>()

/**
 * 這張紙現在被拖了多少（往下為正）。
 *
 * 只在拖的過程中有值——放手之後它要嘛回到零、要嘛整張紙已經關掉了。
 * **只往下推得動**這條規則寫在下面那一個 `> 0` 上，只有那一處：
 * 在這裡再夾一次零，兩處就會有一處是多餘的，而多餘的那一處壞了也沒有人會發現。
 */
const draggedBy = ref(0)

/** 拖到這裡放手就是關掉。再短就會誤關，再長就推不動。 */
const DISMISS_DISTANCE_PIXELS = 96

function onHandlePointerDown(event: PointerEvent) {
  const startedAt = event.clientY
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)

  function onMove(moveEvent: PointerEvent) {
    draggedBy.value = moveEvent.clientY - startedAt
  }

  function onUp() {
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onUp)

    const pushedFarEnough = draggedBy.value >= DISMISS_DISTANCE_PIXELS
    draggedBy.value = 0

    if (pushedFarEnough) {
      emit('close')
    }
  }

  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onUp)
}

// Esc 關掉是對話框的基本禮貌，但它是全域鍵盤事件——只在開著的時候聽，
// 否則三個對話框會同時搶同一個按鍵。
//
// **`immediate` 是必要的**：一個一掛上去就已經開著的對話框，`open` 從頭到尾沒有
// 「變動」過，於是那個監聽器永遠掛不上去，而那張紙按 Esc 關不掉。
// 每一個對話框都從關著開始的時候，這個漏洞看不出來；窄螢幕上那張「更多」
// 是連同 `open` 一起被渲染出來的，它就掉進去了。
//
// 這兩段都不必防伺服器端：watcher 的 `immediate` 在伺服器端也會跑，但那裡沒有
// `document`——所以它擺在 onMounted 之後才有意義。見下面那一行。
watch(() => open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', closeOnEscape)
  }
  else {
    document.removeEventListener('keydown', closeOnEscape)
  }
})

// 沒有這一段的話，開著的時候被拆掉就會留下一個對著已消失元件喊話的監聽器。
onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEscape)
})

// 一掛上去就已經開著的那一種：`open` 沒有變動過，所以上面那個 watcher 不會跑。
// 這裡補上它——在瀏覽器這一側，因為伺服器端沒有 `document`。
onMounted(() => {
  if (open) {
    document.addEventListener('keydown', closeOnEscape)
  }
})

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="open"
    class="app-modal"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- 點在對話框以外的地方等同關閉，這是使用者對「疊上來的東西」既有的預期。 -->
    <div
      class="app-modal__backdrop"
      @click="emit('close')"
    />

    <div
      class="app-modal__panel"
      :class="{ 'app-modal__panel--dragging': draggedBy > 0 }"
      :style="draggedBy > 0 ? { transform: `translateY(${draggedBy}px)` } : undefined"
    >
      <!--
        上緣那條握把。它是窄螢幕上「這張紙推得回去」的唯一說明——
        一張沒有握把的紙看起來是釘死在那裡的。寬螢幕上它不畫（見樣式）。

        `> 0` 就是「只往下推得動」：往上拖沒有意義，而讓紙跟著往上跑
        會把標題頂出畫面。
      -->
      <div
        class="app-modal__handle"
        data-testid="modal-handle"
        @pointerdown="onHandlePointerDown"
      >
        <span class="app-modal__grip" />
      </div>

      <!-- 對話框的頭尾與面板的頭尾是同一條窄帶：疊上來的東西也是這個操作台的一部分。 -->
      <header class="app-modal__header">
        <h2 class="app-modal__title">
          {{ title }}
        </h2>
        <button
          class="app-modal__close"
          type="button"
          aria-label="關閉"
          title="關閉"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </header>

      <div class="app-modal__body">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="app-modal__actions"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-modal {
  position: fixed;
  z-index: z-index('modal');
  inset: 0;
  display: flex;

  // 窄螢幕：紙從底部升起，所以它靠下、左右貼齊。
  align-items: flex-end;
  justify-content: center;
  padding: 0;

  @include respond-to('md') {
    align-items: center;
    padding: spacing('lg');
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: color('backdrop');
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    transition: transform duration('fast') ease;
    box-shadow: shadow('lg');

    // 貼著畫面底緣的那一張紙只有上面兩個角是圓的——下面兩個角在畫面外，
    // 畫了也看不到，而一圈完整的圓角會讓它看起來是浮著而不是升上來。
    border: 1px solid color('border-strong');
    border-bottom: none;
    border-radius: radius('2xl') radius('2xl') 0 0;

    // 疊在面板之上的東西比面板亮一階——深色介面的「浮起來」是這樣講的。
    background-color: color('surface-overlay');
    width: 100%;

    // 不吃滿整個螢幕：上面要露出一段底下的畫面，人才知道自己只是疊了一層，
    // 沒有換到別的地方去。
    max-height: 88vh;
    overflow: hidden;

    @include respond-to('md') {
      border: 1px solid color('border-strong');
      border-radius: radius('lg');
      width: min(38rem, 100%);
      max-height: 100%;
    }

    // 手指還按著的時候不要有過場：那會讓紙追在手指後面跑。
    &--dragging {
      transition: none;
    }
  }

  // 握把整條都是熱區（上下留白也算），因為它要用拇指推。
  &__handle {
    display: flex;
    flex: none;
    justify-content: center;
    cursor: grab;
    padding: spacing('xs') 0 spacing('3xs');

    // 往下推不是捲動，別讓瀏覽器把這個手勢接走。
    touch-action: none;

    @include respond-to('md') {
      display: none;
    }
  }

  &__grip {
    border-radius: radius('pill');
    background-color: color('border-strong');
    width: 2.25rem;
    height: 0.25rem;
  }

  &__header {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    padding: 0 spacing('2xs') spacing('2xs') spacing('md');
    min-height: 2.25rem;

    @include respond-to('md') {
      border-bottom: 1px solid color('border');
      background-color: color('surface-muted');
      padding: spacing('2xs') spacing('2xs') spacing('2xs') spacing('sm');
    }
  }

  // 窄螢幕上這張紙的標題是**一句給人讀的話**，不是一個欄位名：
  // 它此刻是整個畫面唯一的主題，用面板頭那種小而暗的標籤講它太小聲了。
  // 寬螢幕上它退回原本的樣子——那裡它只是眾多面板其中一塊的頭。
  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('md');

    @include respond-to('md') {
      @include dense-label;
    }
  }

  &__close {
    display: inline-flex;
    flex: none;
    border: none;
    border-radius: radius('sm');
    background: none;
    cursor: pointer;
    padding: spacing('3xs');
    color: color('text-faint');

    @include focus-ring;
    @include tap-target;

    &:hover {
      background-color: color('surface');
      color: color('text-strong');
    }
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: spacing('md');
    min-height: 0;
    padding: spacing('md');
    overflow-y: auto;
  }

  // 動作釘在紙的底部、一條一條佔滿整寬：拇指的行程就在那裡，
  // 而一顆佔滿整寬的鍵不必瞄準。
  //
  // **順序就是 DOM 的順序**，不倒過來。每一個對話框都把「取消」寫在前面、
  // 主要動作寫在後面，所以直向排下來時主要動作本來就落在最底下、離拇指最近。
  // 倒過來排會讓那顆會弄丟東西的鍵跑到最上面，而且鍵盤的行進順序會與
  // 眼睛看到的順序相反——那是兩個都不該付的代價，換來的是零。
  //
  // 「佔滿整寬」不必伸手去改那幾顆按鈕：直向排列時它們是 flex 的子項，
  // 橫向本來就會被拉開。動別人家的 class 才是要避免的那件事。
  &__actions {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: spacing('xs');
    border-top: 1px solid color('border');
    padding: spacing('sm') spacing('md');

    @include safe-area-bottom(spacing('sm'));

    @include respond-to('md') {
      flex-direction: row;
      justify-content: flex-end;
      background-color: color('surface-muted');
      padding: spacing('xs') spacing('sm');
    }
  }
}
</style>
