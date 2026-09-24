<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'
import AssistantConversationList from '~/components/organisms/AssistantConversationList.vue'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：任何畫面都叫得出來的助手抽屜。
//
// 叫出它的是頂列右上的助手鍵（見 layouts/console），不在這裡；抽屜本身貼齊視窗右緣、
// 上下通到底，左緣那條邊拉得動寬度。窄螢幕上它蓋滿整個畫面。
//
// 它掛在 app.vue 而不是塞進 ConsoleLayout：樣板**不得綁任何資料**，而這一塊要顯示對話。
//
// **開新對話與回到舊對話都在這裡辦得到。** 清單不是常駐的第二欄（420 像素硬塞兩欄
// 的結果是兩邊都難用），而是**標頭按一下才蓋上來的一層**。挑了一段就把那一層收起來，
// 因為挑完要看的是對話本身。要看清單與對話並排，按「展開」到整頁。
//
// 對話串與輸入區都是與整頁共用的那兩個元件，所以兩邊不可能講不同的話。
// 資料一律由上往下傳、事件由下往上 emit——拿資料是接線那一層的事。
const { open, messages, pending, rejectionMessage, suggestedPrompts, timeZone } = defineProps<{
  open: boolean
  messages: readonly ConversationMessageDto[]
  pending: boolean
  rejectionMessage: string | null
  suggestedPrompts: readonly string[]
  timeZone: TimeZoneDto
  conversations: readonly ConversationSummaryDto[]
  activeConversationId: number | null
  conversationsErrorMessage: string | null
  /**
   * 抽屜多寬（像素）。
   *
   * 它從外面來而不是寫在下面的樣式裡，因為**夾回還能用的範圍**那條規則也要用到
   * 同一個數字。兩邊各寫一份的話，使用者拉到某個寬度時畫出來的會是另一個。
   */
  width: number
  /** 正在被拉動嗎。拉動中要把那條邊標出來，也不要讓文字被選到。 */
  resizing?: boolean
  /**
   * 這個寬度下，助手蓋滿整個畫面。
   *
   * 那時候「多寬」這個問題不存在——記著的寬度留著不動（回到寬螢幕時
   * 仍然是他上次拉的那一個），只是這一次不採用它。那條拉動的邊也不畫：
   * 拖寬本來就是滑鼠的動作，而在一塊已經蓋滿畫面的東西上它更是沒有意義。
   */
  coversScreen: boolean
}>()

const draft = defineModel<string>('draft', { required: true })

const emit = defineEmits<{
  closeDrawer: []
  send: [question: string]
  retry: []
  startNew: []
  selectConversation: [id: number]
  openHistory: []
  resizeStart: [pointerX: number]
}>()

/** 抓住那條邊就交給接線那一層去接 window 上的移動與放手。 */
function onResizePointerDown(event: PointerEvent): void {
  emit('resizeStart', event.clientX)
}

/**
 * 那一層歷史蓋上來了沒有。
 *
 * 它是純粹的畫面開關，只活在這一次打開抽屜的期間，所以是本地狀態——
 * 收起抽屜再打開時回到對話本身，那是使用者要看的東西。
 */
const historyOpen = ref(false)

/** 打開歷史時才去讀清單：沒有人翻歷史的時候，那是一次白打的請求。 */
function toggleHistory(): void {
  historyOpen.value = !historyOpen.value

  if (historyOpen.value) {
    emit('openHistory')
  }
}

/** 挑了一段就把那一層收起來——挑完要看的是對話。 */
function selectConversation(id: number): void {
  historyOpen.value = false
  emit('selectConversation', id)
}

/** 開了新的一段也一樣收起來，然後那個空對話就在眼前等著被問。 */
function startNewConversation(): void {
  historyOpen.value = false
  emit('startNew')
}

/** 抽屜整個收起來時，下次打開先看到對話而不是上次翻到一半的歷史。 */
watch(() => open, (isOpen) => {
  if (!isOpen) {
    historyOpen.value = false
  }
})
</script>

<template>
  <div class="assistant-drawer">
    <aside
      v-if="open"
      class="assistant-drawer__panel"
      aria-label="AI-Assistant"
      data-testid="assistant-drawer-panel"
      :style="coversScreen ? undefined : { width: `${width}px` }"
      :class="{
        'assistant-drawer__panel--resizing': resizing,
        'assistant-drawer__panel--full': coversScreen,
      }"
    >
      <!--
        抓著左邊那條邊就能改寬度。抽屜靠右，所以會動的是左邊那一條；
        往左拉是變寬。它是分隔線也是把手，所以用 separator 的語意。
      -->
      <div
        v-if="!coversScreen"
        class="assistant-drawer__resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="調整助手寬度"
        data-testid="assistant-drawer-resize-handle"
        @pointerdown="onResizePointerDown"
      />

      <header class="assistant-drawer__head">
        <span class="assistant-drawer__title">
          <AppIcon
            name="sparkle"
            size="small"
            class="assistant-drawer__mark"
          />
          AI-Assistant
        </span>

        <span class="assistant-drawer__actions">
          <AppButton
            variant="ghost"
            size="small"
            :label="historyOpen ? '收起歷史對話' : '歷史對話'"
            :aria-pressed="historyOpen"
            data-testid="assistant-drawer-history-toggle"
            @click="toggleHistory()"
          >
            <AppIcon
              name="menu"
              size="small"
            />
          </AppButton>

          <AppButton
            variant="ghost"
            size="small"
            label="開新對話"
            data-testid="assistant-drawer-start-new"
            @click="startNewConversation()"
          >
            <AppIcon
              name="plus"
              size="small"
            />
          </AppButton>

          <!-- 展開到整頁：清單與對話並排的地方 -->
          <AppButton
            to="/chat"
            variant="ghost"
            size="small"
            label="展開成整頁"
            data-testid="assistant-drawer-expand"
          >
            <AppIcon
              name="expand"
              size="small"
            />
          </AppButton>

          <AppButton
            variant="ghost"
            size="small"
            label="收起助手"
            data-testid="assistant-drawer-close"
            @click="emit('closeDrawer')"
          >
            <AppIcon
              name="close"
              size="small"
            />
          </AppButton>
        </span>
      </header>

      <AssistantConversationList
        v-if="historyOpen"
        class="assistant-drawer__history"
        :conversations="conversations"
        :active-conversation-id="activeConversationId"
        :error-message="conversationsErrorMessage"
        :time-zone="timeZone"
        :show-start-new="false"
        @select="selectConversation"
        @reload="emit('openHistory')"
      />

      <AssistantConversationThread
        v-else
        :messages="messages"
        :pending="pending"
        :rejection-message="rejectionMessage"
        :suggested-prompts="suggestedPrompts"
        :time-zone="timeZone"
        @retry="emit('retry')"
        @select-prompt="prompt => emit('send', prompt)"
      />

      <div
        v-if="!historyOpen"
        class="assistant-drawer__composer"
      >
        <AssistantComposer
          v-model="draft"
          :pending="pending"
          autofocus
          @send="emit('send', draft)"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped lang="scss">
// 那條邊要細到不佔版面，又寬到抓得住。
$resize-handle-width: 6px;

.assistant-drawer {
  &__panel {
    display: flex;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;

    // 頂列與底部分頁是 dock 那一層；抽屜要疊在它們之上，又不能蓋過提示訊息。
    z-index: z-index('dock');
    box-shadow: shadow('lg');
    border-left: 1px solid color('border');
    background-color: color('surface');

    // 寬度由外面給（見 props 上那段），這裡只保證它不會比視窗還寬。
    max-width: 100vw;

    &--resizing {
      // 拉動中不要選到裡面的文字，也不要讓游標一離開那條邊就變回箭頭。
      cursor: col-resize;
      user-select: none;
    }

    // 蓋滿整個畫面：它就是現在唯一在的東西。
    &--full {
      left: 0;
      border-left: 0;
      box-shadow: none;
      width: auto;

      @include safe-area-bottom;
    }
  }

  // 那條邊只有拉動這一個用途，所以它自己就是熱區：騎在左緣上、上下通到底。
  &__resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(#{$resize-handle-width} / -2);
    z-index: 1;
    width: $resize-handle-width;
    cursor: col-resize;

    // 拉動不是捲動手勢，觸控時不要讓瀏覽器接手。
    touch-action: none;

    &:hover,
    &:active {
      background-color: color('primary');
    }
  }

  &__head {
    display: flex;
    flex: none;
    align-items: center;
    gap: spacing('xs');
    border-bottom: 1px solid color('border');
    padding: spacing('xs') spacing('xs') spacing('xs') spacing('md');
  }

  &__title {
    display: inline-flex;
    flex: 1;
    align-items: center;
    gap: spacing('xs');
    min-width: 0;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
  }

  &__mark {
    color: color('primary');
  }

  &__actions {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: spacing('3xs');
  }

  // 那一層歷史蓋掉對話，而不是擠在它旁邊：420 像素放不下兩欄。
  &__history {
    flex: 1;
    border: 0;
    border-radius: 0;
    min-height: 0;
  }

  &__composer {
    flex: none;
    padding: 0 spacing('md') spacing('md');
  }
}
</style>
