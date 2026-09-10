<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import AccountProfilePanel from '~/components/organisms/AccountProfilePanel.vue'
import PasswordChangePanel from '~/components/organisms/PasswordChangePanel.vue'
import TelegramDeliveryPanel from '~/components/organisms/TelegramDeliveryPanel.vue'

// 頁面只做接線：三張卡各有各的 composable，互相不知道對方存在。
//
// 三份狀態而不是一份，是刻意的：一張卡讀不到資料，不該讓另外兩張看起來也壞了。
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { health, checking, errorMessage: healthErrorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()

const passwordChange = usePasswordChange()
const telegramDelivery = useTelegramDelivery()

// 這一頁只在瀏覽器這一側取得資料。伺服器算頁面時碰不到這台瀏覽器記著的身分，
// 在那裡問一次只會得到一個「請重新登入」，然後被丟掉。
onMounted(() => {
  void telegramDelivery.loadDeliverySetting()
})
</script>

<template>
  <ConsoleLayout
    title="設定"
    subtitle="這裡是關於你自己的東西：帳號、密碼，以及這台系統要怎麼找到你。"
  >
    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <template #status>
      <BackendStatusIndicator
        :health="health"
        :checking="checking"
        :error-message="healthErrorMessage"
        @recheck="checkBackendHealth"
      />
    </template>

    <template #account>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

    <div class="settings-page">
      <AccountProfilePanel :email="currentUser?.email ?? null" />

      <PasswordChangePanel
        :pending="passwordChange.pending.value"
        :error-message="passwordChange.errorMessage.value"
        :current-password-error="passwordChange.fieldErrors.value?.currentPassword ?? null"
        :new-password-error="passwordChange.fieldErrors.value?.newPassword ?? null"
        :new-password-confirmation-error="
          passwordChange.fieldErrors.value?.newPasswordConfirmation ?? null"
        @submit="passwordChange.submitPasswordChange"
        @edit="passwordChange.clearFeedback"
      />

      <TelegramDeliveryPanel
        v-model:bot-token="telegramDelivery.botToken.value"
        v-model:chat-id="telegramDelivery.chatId.value"
        v-model:message="telegramDelivery.message.value"
        :setting="telegramDelivery.setting.value"
        :loading="telegramDelivery.loading.value"
        :load-error-message="telegramDelivery.loadErrorMessage.value"
        :saving="telegramDelivery.saving.value"
        :save-error-message="telegramDelivery.saveErrorMessage.value"
        :message-error="telegramDelivery.messageError.value"
        :character-count="telegramDelivery.characterCount.value"
        :maximum-character-count="telegramDelivery.maximumCharacterCount.value"
        :sending="telegramDelivery.sending.value"
        :can-send-test-message="telegramDelivery.canSendTestMessage.value"
        :send-result-message="telegramDelivery.sendResultMessage.value"
        :send-succeeded="telegramDelivery.sendSucceeded.value"
        @save="telegramDelivery.saveDeliverySetting"
        @remove="telegramDelivery.removeDeliverySetting"
        @send-test-message="telegramDelivery.sendTestMessage"
      />
    </div>
  </ConsoleLayout>
</template>

<style scoped lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  gap: spacing('md');
  padding: spacing('md');

  // 一疊卡片而不是一整塊儀表，所以它自己捲，且不會寬到讓人橫著讀一行字。
  width: min(48rem, 100%);
  overflow-y: auto;
}
</style>
