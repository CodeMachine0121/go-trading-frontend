<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

// 分子：叫出助手的那一顆鍵。
//
// **一顆圓形的機器人頭**，浮在畫面右下（或使用者把它拖去的任何地方）。
// 圓形不只是好看：一個隨時都在、疊在所有內容之上的東西，方形會像有人把一塊東西
// 忘在畫面上；圓的才讀得出「這是一顆可以按的鍵」。這也是浮動助手的既有慣例。
//
// **它可以被拖走**，因為它會遮住東西——而遮住什麼取決於使用者正在看哪一張圖，
// 那是只有他知道的事。位置記在這台裝置上，下次打開還在那裡。
//
// 這裡只負責「按下去了」與「往哪裡畫」：拖曳中的 pointer 事件掛在 window 上
// （手一快就會離開這顆鍵），那是接線那一層的事。
const { position, size, dragging = false } = defineProps<{
  position: AssistantTriggerPositionDto
  /**
   * 這顆鍵多大（像素）。
   *
   * 它從外面來而不是寫在下面的樣式裡，因為**夾回看得見的範圍**那條規則也要用到
   * 同一個數字。兩邊各寫一份的話，那顆鍵靠邊時會露出去一點或差一點，
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
    variant="primary"
    size="large"
    shape="circle"
    label="問助手（可拖曳擺放）"
    class="assistant-trigger-button"
    :class="{ 'assistant-trigger-button--dragging': dragging }"
    :style="placement"
    data-testid="assistant-drawer-trigger"
    @pointerdown="onPointerDown"
  >
    <AppIcon
      name="robot"
      size="large"
    />
  </AppButton>
</template>

<style scoped lang="scss">
.assistant-trigger-button {
  position: fixed;
  z-index: z-index('modal');
  box-shadow: shadow('md');

  // 一看就知道它可以被拿起來。拖曳中換成握著的手，並讓陰影變深——
  // 那是「它現在離畫面更遠了」的意思。
  cursor: grab;

  // 拖曳中不要選到底下的文字，也不要讓瀏覽器接手成捲動手勢。
  touch-action: none;
  user-select: none;

  &:hover:not(:disabled) {
    box-shadow: shadow('lg');
  }

  &--dragging {
    box-shadow: shadow('lg');
    cursor: grabbing;
  }
}
</style>
