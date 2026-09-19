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
  /** 現在這個寬度代表什麼。這裡用到的是「助手是不是佔滿整個畫面」。 */
  layoutDensity: LayoutDensityDto
}>()

const draft = defineModel<string>('draft', { required: true })

const emit = defineEmits<{
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
  <div
    class="assistant-console"
    :class="{ 'assistant-console--narrow': layoutDensity.assistantCoversScreen }"
  >
    <!--
      窄螢幕上叫出那一欄的唯一入口。它**只在那時候才畫出來**：
      寬螢幕上清單一直都在，一顆把已經看得到的東西「打開」的鍵只會讓人困惑。
    -->
    <AppButton
      v-if="layoutDensity.assistantCoversScreen"
      variant="ghost"
      size="small"
      class="assistant-console__history-toggle"
      :aria-expanded="conversationListOpen"
      aria-controls="assistant-conversation-list"
      data-testid="toggle-conversation-list"
      @click="conversationListOpen = !conversationListOpen"
    >
      {{ conversationListOpen ? '收起歷史對話' : `歷史對話（${conversations.length}）` }}
    </AppButton>

    <AssistantConversationList
      v-if="!layoutDensity.assistantCoversScreen || conversationListOpen"
      id="assistant-conversation-list"
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
        @retry="emit('retry')"
        @select-prompt="prompt => emit('send', prompt)"
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
  display: grid;
  grid-template-columns: $list-width minmax(0, 1fr);

  // 兩塊圓角的面板之間留一道縫，而不是靠一條直線把它們切開——
  // 直線讀起來是「同一張表格的兩欄」，留縫讀起來是「兩塊各自的東西」。
  gap: spacing('sm');

  // 兩欄各自捲動，不讓整頁一起捲——輸入框必須一直在原地。
  min-height: 0;
  height: 100%;

  // 窄螢幕：疊成一欄——那顆鍵、攤開時的清單、然後是對話。
  // 用 flex 而不是把格子改成三列：清單在不在是會變的，而一個會變的格子數
  // 要在兩個地方（有幾列、誰佔哪一列）同時說對才不會錯位。
  &--narrow {
    display: flex;
    flex-direction: column;
  }

  &__history-toggle {
    justify-self: start;
  }

  &__list {
    min-height: 0;
  }

  // 攤開的那一欄在窄螢幕上不該把對話擠成一條縫：它自己有高度上限，捲動在它裡面。
  &--narrow &__list {
    max-height: 40vh;
  }

  &__conversation {
    display: flex;
    flex: 1;
    flex-direction: column;
    border: 1px solid color('border');
    border-radius: radius('2xl');
    background-color: color('surface');
    min-height: 0;

    // 圓角要吃到裡面捲動的對話串，否則它的直角會戳出面板的邊。
    overflow: hidden;
  }

  &__composer {
    border-top: 1px solid color('border');
    padding: spacing('sm') spacing('md');
  }
}
</style>
