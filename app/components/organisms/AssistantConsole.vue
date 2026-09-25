<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'
import AssistantConversationList from '~/components/organisms/AssistantConversationList.vue'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：助手整頁——左邊一欄歷史對話，右邊那一段對話與輸入。
//
// 它與抽屜看到的是**同一段對話**（同一份共用狀態，由接線那一層給），
// 差別只在這裡多一欄清單、寬得多。
//
// 窄螢幕上那一欄不見了，收到一顆鍵後面：390 的寬度分成兩欄之後，
// 一則帶小標與條列的回答會被擠成一條細長的柱子，而清單那一欄也窄到讀不出
// 一段對話的開頭在說什麼——兩邊都難用，不如把寬度全給對話。
// 挑了一段就把它收起來，因為挑完要看的是對話本身。
const { conversations, layoutDensity } = defineProps<{
  conversations: readonly ConversationSummaryDto[]
  activeConversationId: number | null
  conversationsErrorMessage: string | null
  messages: readonly ConversationMessageDto[]
  pending: boolean
  rejectionMessage: string | null
  suggestedPrompts: readonly string[]
  timeZone: TimeZoneDto
  resolvingPendingRevisionId?: number | null
  pendingRevisionErrors?: Readonly<Record<number, string>>
  /** 現在這個寬度代表什麼。這裡用到的是「助手是不是佔滿整個畫面」。 */
  layoutDensity: LayoutDensityDto
}>()

const draft = defineModel<string>('draft', { required: true })

const emit = defineEmits<{
  confirmPendingRevision: [id: number]
  rejectPendingRevision: [id: number]
  send: [question: string]
  retry: []
  startNew: []
  selectConversation: [id: number]
  reload: []
}>()

/**
 * 歷史對話那一欄現在攤開著沒有。
 *
 * 只在窄螢幕上才有意義——寬螢幕上那一欄一直都在，這個值不影響任何東西。
 */
const conversationListOpen = ref(false)

function selectConversation(id: number) {
  conversationListOpen.value = false
  emit('selectConversation', id)
}

function startNewConversation() {
  conversationListOpen.value = false
  emit('startNew')
}
</script>

<template>
  <div class="assistant-console">
    <!--
      窄螢幕上叫出那一欄的唯一入口。它**只在那時候才畫出來**：
      寬螢幕上清單一直都在，一顆把已經看得到的東西「打開」的鍵只會讓人困惑。

      刻意不標 aria-controls：收起來的時候那一欄**整塊不在** DOM 裡（不是藏起來），
      而一個指向不存在的東西的 aria-controls，輔助科技跟不過去，比不說更糟。
    -->
    <AppButton
      v-if="layoutDensity.assistantCoversScreen"
      variant="ghost"
      size="small"
      class="assistant-console__history-toggle"
      :aria-expanded="conversationListOpen"
      data-testid="toggle-conversation-list"
      @click="conversationListOpen = !conversationListOpen"
    >
      {{ conversationListOpen ? '收起歷史對話' : `歷史對話（${conversations.length}）` }}
    </AppButton>

    <AssistantConversationList
      v-if="!layoutDensity.assistantCoversScreen || conversationListOpen"
      class="assistant-console__list"
      :conversations="conversations"
      :active-conversation-id="activeConversationId"
      :error-message="conversationsErrorMessage"
      :time-zone="timeZone"
      @select="selectConversation"
      @start-new="startNewConversation"
      @reload="emit('reload')"
    />

    <section class="assistant-console__conversation">
      <AssistantConversationThread
        :messages="messages"
        :pending="pending"
        :rejection-message="rejectionMessage"
        :suggested-prompts="suggestedPrompts"
        :time-zone="timeZone"
        :resolving-pending-revision-id="resolvingPendingRevisionId"
        :pending-revision-errors="pendingRevisionErrors"
        @retry="emit('retry')"
        @select-prompt="prompt => emit('send', prompt)"
        @confirm-pending-revision="id => emit('confirmPendingRevision', id)"
        @reject-pending-revision="id => emit('rejectPendingRevision', id)"
      />

      <div class="assistant-console__composer">
        <AssistantComposer
          v-model="draft"
          :pending="pending"
          autofocus
          @send="emit('send', draft)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
// 清單欄的寬度是一次性的尺寸：夠放一個時刻與一句「幾則訊息」，其餘的寬度全留給對話。
$list-width: 16rem;

.assistant-console {
  // 窄螢幕：疊成一欄——那顆鍵、攤開時的清單、然後是對話。
  //
  // **欄數由樣式決定，不由程式決定。** 掛載以前量不到視窗，所以第一次畫出來的
  // 一律是寬螢幕那一版；欄數若跟著程式那個答案走，手機在補正之前會先看到
  // 一個擠成兩欄的畫面。程式那個答案只管一件事：**清單要不要收在一顆鍵後面**。
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  // 各自捲動，不讓整頁一起捲——輸入框必須一直在原地。
  min-height: 0;
  height: 100%;

  @include respond-to('md') {
    display: grid;
    grid-template-columns: $list-width minmax(0, 1fr);
    gap: spacing('md');
  }

  // 這顆鍵只活在窄螢幕那一版（flex column），所以用 align-self 讓它不撐滿一整條。
  &__history-toggle {
    align-self: start;
  }

  // 攤開的那一欄在窄螢幕上不該把對話擠成一條縫：它自己有高度上限，捲動在它裡面。
  &__list {
    min-height: 0;
    max-height: 40vh;

    @include respond-to('md') {
      max-height: none;
    }
  }

  &__conversation {
    display: flex;
    flex: 1;
    flex-direction: column;
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    min-height: 0;
    overflow: hidden;
  }

  &__composer {
    flex: none;
    padding: 0 spacing('md') spacing('md');
  }
}
</style>
