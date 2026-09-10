<script setup lang="ts">
import type { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import FormField from '~/components/molecules/FormField.vue'

// 有機體：設定畫面上「Telegram 投遞」那一張卡。
//
// 兩件事共用一張卡，因為它們是同一件事的兩半：說出要送到哪裡，然後確認那條路真的通。
// 分成兩張卡的話，「還沒設定所以送不了」這個關係得靠使用者自己看出來。
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
  <AppPanel title="Telegram 投遞">
    <div class="telegram-delivery-panel">
      <p class="telegram-delivery-panel__caption">
        留下一組機器人金鑰與一個聊天室代號，這台系統就送得出訊息到你的 Telegram。
        目前它只送你自己按下去的那一則測試訊息。
      </p>

      <!--
        讀取中與「還沒有設定」是兩種狀態，不能長得一樣：已經設定過的人若在讀取的
        那半秒被告知他沒有設定，他會以為設定不見了。
      -->
      <p
        v-if="loading"
        class="telegram-delivery-panel__status"
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
      <p
        v-else-if="!configured"
        class="telegram-delivery-panel__status"
        data-testid="telegram-unconfigured"
      >
        還沒有設定。填好下面兩格並儲存，就能試送一則訊息。
      </p>
      <dl
        v-else
        class="telegram-delivery-panel__summary"
        data-testid="telegram-summary"
      >
        <div class="telegram-delivery-panel__row">
          <dt class="telegram-delivery-panel__label">
            聊天室代號
          </dt>
          <dd class="telegram-delivery-panel__value">
            {{ setting?.chatId }}
          </dd>
        </div>
        <div class="telegram-delivery-panel__row">
          <dt class="telegram-delivery-panel__label">
            機器人金鑰
          </dt>
          <dd class="telegram-delivery-panel__value">
            {{ setting?.summary }}
          </dd>
        </div>
      </dl>

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

      <div class="telegram-delivery-panel__actions">
        <AppButton
          v-if="configured"
          variant="danger"
          :disabled="saving"
          data-testid="telegram-remove"
          @click="removeConfirmationOpen = true"
        >
          移除設定
        </AppButton>
        <AppButton
          variant="primary"
          :disabled="!savable"
          data-testid="telegram-save"
          @click="emit('save')"
        >
          {{ saveLabel }}
        </AppButton>
      </div>

      <hr class="telegram-delivery-panel__divider">

      <FormField
        label="測試訊息"
        :hint="`${characterCount} / ${maximumCharacterCount} 個字`"
        :error-message="messageError"
      >
        <AppTextarea
          v-model="message"
          :invalid="messageError !== null"
          data-testid="test-message-input"
        />
      </FormField>

      <p
        v-if="!configured"
        class="telegram-delivery-panel__status"
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

      <div class="telegram-delivery-panel__actions">
        <AppButton
          variant="secondary"
          :disabled="!canSendTestMessage"
          data-testid="test-message-send"
          @click="emit('sendTestMessage')"
        >
          {{ sendLabel }}
        </AppButton>
      </div>
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
  </AppPanel>
</template>

<style scoped lang="scss">
.telegram-delivery-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__caption,
  &__status {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__summary {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
  }

  &__row {
    display: grid;
    gap: spacing('3xs');

    @include respond-to('md') {
      grid-template-columns: 8rem minmax(0, 1fr);
      align-items: baseline;
    }
  }

  &__label {
    @include dense-label;
  }

  &__value {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    color: color('text');
  }

  &__divider {
    margin: spacing('2xs') 0;
    border: none;
    border-top: 1px solid color('border');
    width: 100%;
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
    justify-content: flex-end;
  }
}
</style>
