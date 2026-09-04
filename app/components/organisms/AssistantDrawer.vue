<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
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
// **它不放對話清單。** 420 像素硬塞兩欄的結果是兩邊都難用，而換對話是低頻動作——
// 標頭的展開帶著同一段對話跳到整頁，在那裡換。
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
}>()

const draft = defineModel<string>('draft', { required: true })

const emit = defineEmits<{
  closeDrawer: []
  send: [question: string]
  retry: []
}>()
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

      <AssistantConversationThread
        :messages="messages"
        :pending="pending"
        :rejection-message="rejectionMessage"
        :suggested-prompts="suggestedPrompts"
        :time-zone="timeZone"
        @retry="emit('retry')"
        @select-prompt="prompt => emit('send', prompt)"
      />

      <div class="assistant-drawer__composer">
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

  &__composer {
    border-top: 1px solid color('border');
    padding: spacing('sm');
  }
}
</style>
