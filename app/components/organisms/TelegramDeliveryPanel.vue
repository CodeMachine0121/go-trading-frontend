<script setup lang="ts">
import type { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import FormField from '~/components/molecules/FormField.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'

// 有機體：設定畫面上與 Telegram 有關的**兩段**。
//
// 兩段而不是一段：說出「要送到哪裡」與「試著送一則看看」是兩件事，
// 之前把它們塞進同一張卡，中間只好拿一條分隔線硬切開——而一條分隔線正是
// 「這裡其實是兩段」最誠實的自白。它們仍然住在同一個元件裡，因為第二段能不能按
// 完全取決於第一段設好了沒。
//
// 這裡不寫任何規則：訊息的長度由 TestMessageDomain 說了算，四種送不出去的說法由
// 領域備好，這裡只畫。
const {
  setting = null,
  loading = false,
  loadErrorMessage = null,
  saving = false,
  saveErrorMessage = null,
  messageError = null,
  characterCount = 0,
  maximumCharacterCount = 0,
  sending = false,
  canSendTestMessage = false,
  sendResultMessage = null,
  sendSucceeded = false,
} = defineProps<{
  setting?: TelegramDeliveryDto | null
  loading?: boolean
  loadErrorMessage?: string | null
  saving?: boolean
  saveErrorMessage?: string | null
  messageError?: string | null
  characterCount?: number
  maximumCharacterCount?: number
  sending?: boolean
  canSendTestMessage?: boolean
  sendResultMessage?: string | null
  sendSucceeded?: boolean
}>()

const emit = defineEmits<{ save: [], remove: [], sendTestMessage: [] }>()

const botToken = defineModel<string>('botToken', { required: true })
const chatId = defineModel<string>('chatId', { required: true })
const message = defineModel<string>('message', { required: true })

/**
 * 「移除設定」按下之後先問一次。
 *
 * 手滑掉的話，要回到現在這個狀態得重新貼一整串金鑰——它已經拿不回來了。
 * 這個布林住在這裡：對話開著沒開著不影響任何其他東西。
 */
const removeConfirmationOpen = ref(false)

const configured = computed(() => setting?.configured ?? false)
const savable = computed(() => !saving && botToken.value.trim() !== '' && chatId.value.trim() !== '')
const saveLabel = computed(() => saving ? '儲存中…' : (configured.value ? '更換設定' : '儲存設定'))
const sendLabel = computed(() => sending ? '送出中…' : '送出測試訊息')

function confirmRemoval(): void {
  removeConfirmationOpen.value = false
  emit('remove')
}
</script>

<template>
  <SettingsSection
    title="Telegram 投遞"
    description="留下一組機器人金鑰與一個聊天室代號，這台系統就送得出訊息到你的 Telegram。"
  >
    <!--
      目前是什麼狀態，一行講完。
      之前這裡是一張兩列的對照表，而那兩列講的正好是下面兩格輸入框裡的東西——
      同一個聊天室代號在同一個畫面上出現兩次。現在它只說輸入框說不出來的那一件事：
      連上了沒，以及存著的是哪一組金鑰。
    -->
    <p
      v-if="loading"
      class="telegram-delivery-panel__state"
      data-testid="telegram-loading"
    >
      <AppBadge variant="neutral">
        讀取中
      </AppBadge>
      <span>正在問後端目前的設定…</span>
    </p>
    <AppAlert
      v-else-if="loadErrorMessage"
      tone="danger"
      data-testid="telegram-load-error"
    >
      {{ loadErrorMessage }}
    </AppAlert>
    <p
      v-else-if="!configured"
      class="telegram-delivery-panel__state"
      data-testid="telegram-unconfigured"
    >
      <AppBadge variant="neutral">
        還沒有設定
      </AppBadge>
      <span>填好下面兩格並儲存，就能試送一則訊息。</span>
    </p>
    <p
      v-else
      class="telegram-delivery-panel__state"
      data-testid="telegram-summary"
    >
      <AppBadge variant="success">
        已設定
      </AppBadge>
      <span>{{ setting?.summary }}</span>
    </p>

    <FormField
      label="機器人金鑰"
      hint="存進去之後就拿不回來了，畫面只留得下最後四個字。要更換請重新填入整串。"
    >
      <AppInput
        v-model="botToken"
        type="password"
        autocomplete="off"
        spellcheck="false"
        data-testid="bot-token-input"
      />
    </FormField>

    <FormField
      class="telegram-delivery-panel__field--narrow"
      label="聊天室代號"
      hint="數字的聊天室代號，或以 @ 開頭的頻道名稱。"
    >
      <AppInput
        v-model="chatId"
        autocapitalize="off"
        spellcheck="false"
        data-testid="chat-id-input"
      />
    </FormField>

    <AppAlert
      v-if="saveErrorMessage"
      tone="danger"
      data-testid="telegram-save-error"
    >
      {{ saveErrorMessage }}
    </AppAlert>

    <!--
      移除擺在最左邊、而且是安靜的那一種；儲存擺在最右邊、是實心的那一顆。
      兩顆都畫成實心色塊的話，一整段裡最搶眼的會是那顆會弄丟東西的。
    -->
    <div class="telegram-delivery-panel__actions">
      <AppButton
        v-if="configured"
        variant="danger-ghost"
        :disabled="saving"
        data-testid="telegram-remove"
        @click="removeConfirmationOpen = true"
      >
        移除設定
      </AppButton>
      <AppButton
        variant="primary"
        class="telegram-delivery-panel__save"
        :disabled="!savable"
        data-testid="telegram-save"
        @click="emit('save')"
      >
        {{ saveLabel }}
      </AppButton>
    </div>

    <ConfirmDialog
      :open="removeConfirmationOpen"
      title="移除 Telegram 設定"
      message="移除之後這台系統就找不到你了。要再用的話，得重新填入整串機器人金鑰——它已經拿不回來了。"
      confirm-label="移除"
      variant="danger"
      @confirm="confirmRemoval"
      @cancel="removeConfirmationOpen = false"
    />
  </SettingsSection>

  <SettingsSection
    title="試送一則訊息"
    description="按一下，看它有沒有真的出現在你的 Telegram。送不出去時會說是哪一件事出了問題。"
  >
    <FormField
      label="測試訊息"
      :error-message="messageError"
    >
      <template #default>
        <AppTextarea
          v-model="message"
          :invalid="messageError !== null"
          data-testid="test-message-input"
        />
      </template>
    </FormField>

    <p class="telegram-delivery-panel__counter">
      {{ characterCount }} / {{ maximumCharacterCount }} 個字
    </p>

    <p
      v-if="!configured"
      class="telegram-delivery-panel__note"
      data-testid="test-message-blocked"
    >
      先完成上面的 Telegram 設定，才送得出測試訊息。
    </p>

    <AppAlert
      v-if="sendResultMessage"
      :tone="sendSucceeded ? 'success' : 'danger'"
      data-testid="test-message-result"
    >
      {{ sendResultMessage }}
    </AppAlert>

    <!--
      這一顆刻意不是實心藍的。實心的強調色只留給「這一段要按的那一顆」，而試送
      **不改變任何東西**——它是一次檢查，不是一個決定。整頁三顆亮藍色，
      等於沒有主要動作。
    -->
    <div class="telegram-delivery-panel__actions">
      <AppButton
        variant="secondary"
        class="telegram-delivery-panel__save"
        :disabled="!canSendTestMessage"
        data-testid="test-message-send"
        @click="emit('sendTestMessage')"
      >
        {{ sendLabel }}
      </AppButton>
    </div>
  </SettingsSection>
</template>

<style scoped lang="scss">
.telegram-delivery-panel {
  // 狀態那一行：一個牌子加一句話，貼在段落最上面。
  // 它讀起來要像一盞燈，不像一列資料——所以沒有標籤欄，也沒有框。
  &__state {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('xs');
    align-items: baseline;
    margin: 0;
    color: color('text-muted');
    line-height: line-height('normal');
    font-size: font-size('sm');
  }

  // 只有聊天室代號自己收窄——它是幾個數字，給它一整欄的寬度，
  // 旁邊那一片空白看起來就像忘了填東西。其餘欄位跟著整欄走。
  &__field--narrow {
    max-width: 16rem;
  }

  // 字數貼在輸入框正下方、靠右——它講的是「還能打多少」，
  // 那件事只有在看著那一格的時候才有意義。
  &__counter {
    margin: 0;
    margin-top: calc(-1 * spacing('xs'));
    text-align: right;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-variant-numeric: tabular-nums;
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('2xs');
  }

  // 危險的那一顆在最左邊，主要的那一顆在最右邊，中間隔開。
  // 並排在一起時，手指與眼睛都太容易走錯一顆。
  //
  // 整列的右緣跟欄位切齊，不是跟整頁切齊：按鈕與它送出的那些格子要落在同一條線上，
  // 眼睛才不用重新找。
  &__actions {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }

  &__save {
    margin-left: auto;
  }
}
</style>
