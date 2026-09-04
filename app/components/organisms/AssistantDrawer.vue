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
// 叫出它的那一顆鍵**不在這裡**（見 AssistantTriggerButton）：它可以被拖到畫面上
// 任何地方，而抽屜永遠靠右——一塊 420 像素的面板跟著一顆鍵到處跑，
// 會在半數位置把它自己推出視窗。兩者因此是兩個元件。
//
// 抽屜本身不貼齊視窗邊緣，而是**浮在畫面上的一塊圓角卡片**。貼齊邊緣的直角面板
// 看起來像介面的一部分（於是使用者會找它的關閉在哪、會以為它一直都在），
// 浮起來的圓角卡片一眼就知道是暫時叫出來的東西。
//
// 它掛在 app.vue 而不是塞進 ConsoleLayout：樣板**不得綁任何資料**，
// 而這一塊要顯示對話。叫出它的鍵因此長在它自己身上（畫面右下的浮動鍵），
// 這也讓四個既有畫面一行都不必改。
//
// **開新對話與回到舊對話都在這裡辦得到。** 清單不是常駐的第二欄（420 像素硬塞兩欄
// 的結果是兩邊都難用），而是**標頭按一下才蓋上來的一層**：開新對話在最上面、
// 歷史列在下面，這是窄面板裡的既有順序（Bard、Copilot、ChatGPT、Grok 都是這樣）。
// 挑了一段就把那一層收起來，因為挑完要看的是對話本身。
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
}>()

const draft = defineModel<string>('draft', { required: true })

const emit = defineEmits<{
  closeDrawer: []
  send: [question: string]
  retry: []
  startNew: []
  selectConversation: [id: number]
  openHistory: []
}>()

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
      aria-label="行情助手"
      data-testid="assistant-drawer-panel"
    >
      <header class="assistant-drawer__head">
        <span class="assistant-drawer__title">
          <span
            class="assistant-drawer__mark"
            aria-hidden="true"
          >
            <AppIcon
              name="robot"
              size="small"
            />
          </span>
          行情助手
        </span>

        <span class="assistant-drawer__actions">
          <AppButton
            variant="ghost"
            size="small"
            shape="circle"
            label="開新對話"
            data-testid="assistant-drawer-start-new"
            @click="startNewConversation()"
          >
            <AppIcon
              name="new"
              size="small"
            />
          </AppButton>

          <AppButton
            variant="ghost"
            size="small"
            shape="circle"
            :label="historyOpen ? '收起歷史對話' : '歷史對話'"
            data-testid="assistant-drawer-history-toggle"
            @click="toggleHistory()"
          >
            <AppIcon
              name="library"
              size="small"
            />
          </AppButton>

          <!-- 展開是抽屜裡換對話的唯一去處：清單在整頁那邊 -->
          <NuxtLink
            to="/chat"
            class="assistant-drawer__expand"
            title="展開成整頁"
            aria-label="展開成整頁"
            data-testid="assistant-drawer-expand"
          >
            <AppIcon
              name="expand"
              size="small"
            />
          </NuxtLink>

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
// 抽屜的寬度是一次性的尺寸，不是顏色／間距／字級那幾種一定要有 token 的值。
// 420 像素放得下有小標與條列的回答，又不至於遮住半張圖。
$drawer-width: 420px;

// 浮起來的卡片與視窗邊緣之間留一圈，讓它看得出是「疊在上面」而不是「介面的一部分」。
$drawer-inset: 0.75rem;

.assistant-drawer {
  &__panel {
    display: flex;
    position: fixed;
    top: $drawer-inset;
    right: $drawer-inset;
    bottom: $drawer-inset;
    flex-direction: column;
    z-index: z-index('modal');
    box-shadow: shadow('lg');
    border: 1px solid color('border-strong');
    border-radius: radius('2xl');
    background-color: color('surface');
    width: $drawer-width;
    max-width: calc(100vw - #{$drawer-inset} * 2);

    // 圓角要吃到裡面的標題列與輸入區，否則它們的直角會戳出卡片的邊。
    overflow: hidden;
  }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: spacing('xs');
    border-bottom: 1px solid color('border');
    background-color: color('surface-raised');
    padding: spacing('xs') spacing('sm');
  }

  &__title {
    display: inline-flex;
    align-items: center;
    gap: spacing('xs');
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  // 標題旁那顆頭像與對話串裡回答的頭像是同一個圓，所以一眼看得出是同一位。
  &__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: radius('pill');
    background-color: color('primary-soft');
    width: 1.5rem;
    height: 1.5rem;
    color: color('primary');
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: spacing('xs');
  }

  &__expand {
    display: inline-flex;
    align-items: center;
    border-radius: radius('pill');
    padding: spacing('xs');
    color: color('text-muted');

    @include focus-ring;

    &:hover {
      background-color: color('surface-muted');
      color: color('text-strong');
    }
  }

  // 那一層歷史蓋掉對話，而不是擠在它旁邊：420 像素放不下兩欄。
  // 它自己捲動，所以圓角卡片的邊不會被列表撐開。
  &__history {
    flex: 1;
    border: 0;
    border-radius: 0;
    min-height: 0;
  }

  &__composer {
    border-top: 1px solid color('border');
    padding: spacing('sm');
  }
}
</style>
