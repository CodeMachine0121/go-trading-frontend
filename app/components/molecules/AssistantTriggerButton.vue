<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

// 分子：叫出 AI-Assistant 的那一枚晶片。
//
// **一枚圓角方塊**，浮在畫面右下（或使用者把它拖去的任何地方）：漸層底、
// 一顆四角星、底下一行 `AI`，外面一圈柔光。
//
// 它以前是一顆圓的機器人頭，而那顆頭有兩個問題：側欄上緊鄰的另一個去處
// （策略機器人）真的就是一台機器，兩者只差外面那一圈環；而一個正圓浮在
// 一整片方角的面板上，讀起來像有人把一顆球忘在畫面上。四角星說的是另一件事，
// 圓角方塊與底下那些面板是同一種語言。
//
// **它可以被拖走**，因為它會遮住東西——而遮住什麼取決於使用者正在看哪一張圖，
// 那是只有他知道的事。位置記在這台裝置上，下次打開還在那裡。
//
// 這裡只負責「按下去了」與「往哪裡畫」：拖曳中的 pointer 事件掛在 window 上
// （手一快就會離開這一枚），那是接線那一層的事。
const { position, size, dragging = false } = defineProps<{
  position: AssistantTriggerPositionDto
  /**
   * 這一枚多大（像素）。
   *
   * 它從外面來而不是寫在下面的樣式裡，因為**夾回看得見的範圍**那條規則也要用到
   * 同一個數字。兩邊各寫一份的話，它靠邊時會露出去一點或差一點，
   * 而那種差距沒有人會想到要去查。
   */
  size: number
  dragging?: boolean
}>()

const emit = defineEmits<{
  dragStart: [pointerX: number, pointerY: number]
}>()

/** 按下就交給接線那一層去接 window 上的移動與放下。 */
function onPointerDown(event: PointerEvent): void {
  emit('dragStart', event.clientX, event.clientY)
}

const placement = computed(() => ({
  right: `${position.right}px`,
  bottom: `${position.bottom}px`,
  width: `${size}px`,
  height: `${size}px`,
}))
</script>

<template>
  <AppButton
    variant="accent"
    size="large"
    shape="squircle"
    label="問 AI-Assistant（可拖曳擺放）"
    class="assistant-trigger-button"
    :class="{ 'assistant-trigger-button--dragging': dragging }"
    :style="placement"
    data-testid="assistant-drawer-trigger"
    @pointerdown="onPointerDown"
  >
    <span class="assistant-trigger-button__mark">
      <AppIcon
        name="sparkle"
        size="medium"
      />
      <!--
        那兩個字母是給**第一次看到它的人**的：一顆四角星在別的產品上也可能是
        「加到最愛」或「這裡有新東西」。兩個字母就足以把它釘死在一個意思上，
        而且它們小到不會與那顆星爭。
      -->
      <span
        class="assistant-trigger-button__wordmark"
        aria-hidden="true"
      >AI</span>
    </span>
  </AppButton>
</template>

<style scoped lang="scss">
.assistant-trigger-button {
  position: fixed;
  z-index: z-index('modal');

  // 一看就知道它可以被拿起來。拖曳中換成握著的手。
  cursor: grab;

  // 拖曳中不要選到底下的文字，也不要讓瀏覽器接手成捲動手勢。
  touch-action: none;
  user-select: none;

  // 停在上面時稍微抬起來一點。那一下與光暈變強是同一句話的兩半：
  // 它離畫面更遠了，所以更亮、影子更散。
  transition: transform duration('fast') ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  // 拿在手上時不抬起來——它已經在手上了，再抬一次讀起來像它掙脫了游標。
  &--dragging {
    cursor: grabbing;
    transform: none;
  }

  // 星與字疊成一落，而不是並排：這一枚是正方形的，橫著擺會讓兩樣東西
  // 各自只分到一半的寬度，那顆星就縮成一個小點了。
  &__mark {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    align-items: center;
    justify-content: center;
  }

  &__wordmark {
    letter-spacing: 0.08em;
    line-height: line-height('tight');
    font-weight: font-weight('bold');
    font-size: font-size('2xs');
    font-family: font-family('mono');
  }
}
</style>
