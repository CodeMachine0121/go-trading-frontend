<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：任何畫面都叫得出來的助手抽屜。
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
  openDrawer: []
  closeDrawer: []
  send: [question: string]
  retry: []
}>()
</script>

<template>
  <div class="assistant-drawer">
    <AppButton
      v-if="!open"
      variant="primary"
      label="問助手"
      class="assistant-drawer__trigger"
      data-testid="assistant-drawer-trigger"
      @click="emit('openDrawer')"
    >
      <AppIcon name="assistant" />
      問助手
    </AppButton>

    <aside
      v-if="open"
      class="assistant-drawer__panel"
      aria-label="行情助手"
      data-testid="assistant-drawer-panel"
    >
      <header class="assistant-drawer__head">
        <span class="assistant-drawer__title">
          <AppIcon
            name="assistant"
            size="small"
          />
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

.assistant-drawer {
  &__trigger {
    position: fixed;
    right: spacing('md');
    bottom: spacing('md');
    z-index: z-index('modal');
    box-shadow: shadow('lg');
  }

  &__panel {
    display: flex;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;
    z-index: z-index('modal');
    box-shadow: shadow('lg');
    border-left: 1px solid color('border-strong');
    background-color: color('surface');
    width: $drawer-width;
    max-width: 100vw;
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

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: spacing('xs');
  }

  &__expand {
    display: inline-flex;
    align-items: center;
    border-radius: radius('sm');
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
