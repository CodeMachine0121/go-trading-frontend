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
// 兩段而不是一段：說出「要送到哪裡」與「試著送一則看看」是兩件事，之前把它們塞進
// 同一張卡，中間只好拿一條分隔線硬切開——而一條分隔線正是「這裡其實是兩段」最誠實
// 的自白。它們仍然住在同一個元件裡，因為第二段能不能按完全取決於第一段設好了沒。
//
// 已經連上之後，那兩格是**收起來的**：一份存好的憑證應該讀起來像一列紀錄
// （這是什麼、認得出是哪一組、可以拿它做什麼），不是一張永遠攤在那裡、而且金鑰欄
// 永遠空著的表單——空著的密碼框擺在「已連線」下面，看起來像設定掉了。
//
// 這裡不寫任何規則：訊息的長度由 TestMessageDomain 說了算，四種送不出去的說法由
// 領域備好，這裡只畫。
const {
  setting = null,
  loading = false,
  loadErrorMessage = null,
  formVisible = true,
  editing = false,
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
  /** 那兩格現在攤開著嗎。還沒設定過時一律攤開，設定過之後只在要更換時攤開。 */
  formVisible?: boolean
  /** 攤開的原因是「要換一組」而不是「還沒設定過」——差別在於能不能取消。 */
  editing?: boolean
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

const emit = defineEmits<{
  save: []
  remove: []
  startEditing: []
  cancelEditing: []
  sendTestMessage: []
}>()

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
const saveLabel = computed(() => saving ? '儲存中…' : (editing ? '更換設定' : '儲存設定'))
const sendLabel = computed(() => sending ? '送出中…' : '送出測試訊息')

function confirmRemoval(): void {
  removeConfirmationOpen.value = false
  emit('remove')
}
</script>

<template>
  <SettingsSection
    title="Telegram 投遞"
    description="留下一組機器人金鑰與一個聊天室代號，這台系統就送得出訊息到你的 Telegram。金鑰存進去之後拿不回來，只看得到最後四個字。"
  >
    <p
      v-if="loading"
      class="telegram-delivery-panel__state"
      data-testid="telegram-loading"
    >
      讀取目前的設定…
    </p>

    <AppAlert
      v-else-if="loadErrorMessage"
      tone="danger"
      data-testid="telegram-load-error"
    >
      {{ loadErrorMessage }}
    </AppAlert>

    <!--
      存好的那一組讀起來像一列紀錄：認得出是哪一組、送去哪裡，以及可以拿它做什麼。
      它不重複下面任何東西，因為下面那兩格這時候是收起來的。
    -->
    <div
      v-else-if="configured && !formVisible"
      class="telegram-delivery-panel__connection"
      data-testid="telegram-summary"
    >
      <div class="telegram-delivery-panel__connection-facts">
        <AppBadge variant="success">
          已連線
        </AppBadge>
        <span class="telegram-delivery-panel__secret">{{ setting?.summary }}</span>
        <span class="telegram-delivery-panel__destination">送往聊天室 {{ setting?.chatId }}</span>
      </div>

      <!--
        會弄丟東西的那一顆是安靜的，而且與「更換」隔開。兩顆長得一樣重的話，
        一整列裡最先被眼睛抓到的會是那顆刪東西的。
      -->
      <div class="telegram-delivery-panel__connection-actions">
        <AppButton
          variant="danger-ghost"
          size="small"
          :disabled="saving"
          data-testid="telegram-remove"
          @click="removeConfirmationOpen = true"
        >
          移除
        </AppButton>
        <AppButton
          variant="secondary"
          size="small"
          :disabled="saving"
          data-testid="telegram-edit"
          @click="emit('startEditing')"
        >
          更換金鑰
        </AppButton>
      </div>
    </div>

    <!--
      還沒設定過要明說，而且不能長得像錯誤——它是這一段的正常起點，不是出了什麼事。
    -->
    <p
      v-if="!loading && !loadErrorMessage && !configured"
      class="telegram-delivery-panel__state"
      data-testid="telegram-unconfigured"
    >
      還沒有設定。填好下面兩格並儲存，就能試送一則訊息。
    </p>

    <template v-if="formVisible">
      <FormField
        label="機器人金鑰"
        hint="要更換請填入整串——存進去之後就拿不回來了，畫面只留得下最後四個字。"
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
        label="聊天室代號"
        hint="數字的聊天室代號，或以 @ 開頭的頻道名稱。"
      >
        <AppInput
          v-model="chatId"
          class="telegram-delivery-panel__chat-id"
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

      <div class="telegram-delivery-panel__actions">
        <AppButton
          v-if="editing"
          variant="ghost"
          data-testid="telegram-cancel"
          @click="emit('cancelEditing')"
        >
          取消
        </AppButton>
        <AppButton
          variant="primary"
          class="telegram-delivery-panel__primary"
          :disabled="!savable"
          data-testid="telegram-save"
          @click="emit('save')"
        >
          {{ saveLabel }}
        </AppButton>
      </div>
    </template>

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
      <AppTextarea
        v-model="message"
        :invalid="messageError !== null"
        data-testid="test-message-input"
      />
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
      **不改變任何東西**——它是一次檢查，不是一個決定。
    -->
    <div class="telegram-delivery-panel__actions">
      <AppButton
        variant="secondary"
        class="telegram-delivery-panel__primary"
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
  &__state {
    margin: 0;
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('xs');
  }

  // 存好的那一組：一列內凹的紀錄。它不長得像輸入框，因為它不能填；
  // 也不長得像卡片，因為它住在一張卡裡面。
  &__connection {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('sm');
    align-items: center;
    justify-content: space-between;
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface-muted');
    padding: spacing('sm') spacing('md');
  }

  &__connection-facts {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('sm');
    align-items: center;
    min-width: 0;
  }

  // 金鑰結尾用等寬字：它是一串要被「認出來」而不是「讀出來」的字元，
  // 比例字型會讓 1234 與 l234 長得一樣。
  &__secret {
    color: color('text-strong');
    font-size: font-size('sm');
    font-family: font-family('mono');
  }

  &__destination {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__connection-actions {
    display: flex;
    gap: spacing('2xs');
    align-items: center;
  }

  // 一個聊天室代號是幾個數字。給它一整張卡的寬度，旁邊那片空白會看起來像忘了填。
  //
  // 寬度掛在輸入框本身而不是整個欄位上：掛在欄位上的話，底下那句說明也跟著收窄，
  // 於是一句短短的提示被硬折成兩行。
  &__chat-id {
    max-width: 14rem;
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

  &__actions {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }

  &__primary {
    margin-left: auto;
  }
}
</style>
