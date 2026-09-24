<script setup lang="ts">
import AppearanceToggle from '~/components/molecules/AppearanceToggle.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import AccountProfilePanel from '~/components/organisms/AccountProfilePanel.vue'
import PasswordChangePanel from '~/components/organisms/PasswordChangePanel.vue'
import TelegramDeliveryPanel from '~/components/organisms/TelegramDeliveryPanel.vue'

// 頁面只做接線：每一段各有各的 composable，互相不知道對方存在。
//
// 幾份狀態而不是一份，是刻意的：一段讀不到資料，不該讓其他段看起來也壞了。
definePageMeta({
  layout: 'console',
  consoleTitle: '設定',
  consoleSubtitle: '這裡是關於你自己的東西：帳號、密碼，以及這台系統要怎麼找到你。',
})

const { currentUser, signOut } = useUserSession()
const passwordChange = usePasswordChange()
const telegramDelivery = useTelegramDelivery()

// 顯示那一段：時區與外觀。頂列上也有這兩個（窄螢幕上頂列收掉了它們），
// 兩處取用的是同一份共用狀態，所以在頂列選了深色，這裡就是深色。
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { appearance, selectAppearance } = useAppearance()

/** 左邊那一條段落導覽：只在寬螢幕上出現，點一下捲到那一段。 */
const SECTIONS = [
  { anchor: 'settings-account', label: '帳號' },
  { anchor: 'settings-password', label: '密碼' },
  { anchor: 'settings-telegram', label: 'Telegram 投遞' },
  { anchor: 'settings-display', label: '顯示' },
] as const

// 這一頁掛載之後才取得資料：身分記在這台瀏覽器裡，而這一份設定是屬於那個人的。
onMounted(() => {
  void telegramDelivery.loadDeliverySetting()
})
</script>

<template>
  <div class="settings-page">
    <nav
      class="settings-page__nav"
      aria-label="設定段落"
    >
      <a
        v-for="section in SECTIONS"
        :key="section.anchor"
        :href="`#${section.anchor}`"
        class="settings-page__nav-link"
      >{{ section.label }}</a>
    </nav>

    <div class="settings-page__stack">
      <AccountProfilePanel
        id="settings-account"
        :email="currentUser?.email ?? null"
        :activated="currentUser?.isEnabled ?? false"
        @sign-out="signOut"
      />

      <PasswordChangePanel
        id="settings-password"
        :pending="passwordChange.pending.value"
        :error-message="passwordChange.errorMessage.value"
        :current-password-error="passwordChange.fieldErrors.value?.currentPassword ?? null"
        :new-password-error="passwordChange.fieldErrors.value?.newPassword ?? null"
        :new-password-confirmation-error="
          passwordChange.fieldErrors.value?.newPasswordConfirmation ?? null"
        @submit="passwordChange.submitPasswordChange"
        @edit="passwordChange.clearFeedback"
      />

      <div
        id="settings-telegram"
        class="settings-page__group"
      >
        <TelegramDeliveryPanel
          v-model:bot-token="telegramDelivery.botToken.value"
          v-model:chat-id="telegramDelivery.chatId.value"
          v-model:message="telegramDelivery.message.value"
          :setting="telegramDelivery.setting.value"
          :loading="telegramDelivery.loading.value"
          :load-error-message="telegramDelivery.loadErrorMessage.value"
          :form-visible="telegramDelivery.formVisible.value"
          :editing="telegramDelivery.editing.value"
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
          @start-editing="telegramDelivery.startEditing"
          @cancel-editing="telegramDelivery.cancelEditing"
          @send-test-message="telegramDelivery.sendTestMessage"
        />
      </div>

      <SettingsSection
        id="settings-display"
        title="顯示"
        description="這個介面怎麼顯示。只記在這台瀏覽器裡。"
      >
        <div class="settings-page__row">
          <div class="settings-page__row-label">
            <span>顯示時區</span>
            <span class="settings-page__row-hint">只影響畫面上的時間；送往後端一律是世界標準時間</span>
          </div>
          <TimeZoneField
            class="settings-page__row-control"
            :model-value="selectedTimeZone.identifier"
            :selectable-time-zones="selectableTimeZones"
            @update:model-value="selectTimeZone"
          />
        </div>

        <div class="settings-page__row">
          <div class="settings-page__row-label">
            <span>外觀</span>
            <span class="settings-page__row-hint">預設跟隨系統</span>
          </div>
          <AppearanceToggle
            v-if="appearance"
            class="settings-page__row-control"
            variant="labelled"
            :appearance="appearance"
            @select="selectAppearance"
          />
        </div>
      </SettingsSection>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  // 這一頁不是一整塊儀表，是一張要讀的紙——寬螢幕上左邊一條段落導覽，
  // 右邊一欄卡片，卡片的寬度訂在「一個表單好填的寬度」而不是「螢幕有多寬」。
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: spacing('lg');
  width: 100%;

  @include respond-to('lg') {
    grid-template-columns: 11rem minmax(0, 46rem);
  }

  &__nav {
    display: none;

    @include respond-to('lg') {
      display: flex;
      position: sticky;
      top: spacing('md');
      flex-direction: column;
      gap: spacing('3xs');
      align-self: start;
    }
  }

  &__nav-link {
    border-radius: radius('sm');
    padding: spacing('2xs') spacing('xs');
    color: color('text-muted');
    font-size: font-size('sm');
    text-decoration: none;

    @include focus-ring;

    &:hover {
      background-color: color('surface-muted');
      color: color('text-strong');
    }
  }

  &__stack {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    min-width: 0;

    // 點段落導覽捲過去時，那一段的標題不能躲在黏在頂端的頂列底下。
    > * {
      scroll-margin-top: calc(#{spacing('2xl')} * 2.5);
    }
  }

  // Telegram 那兩段（設定與試送）是一組，靠得比段落之間近一點。
  &__group {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  // 顯示那一段的一列：標籤與說明在左，控制項在右；窄螢幕上疊起來。
  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('xs');
    align-items: center;

    @include respond-to('md') {
      grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
      gap: spacing('md');
    }
  }

  &__row-label {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    color: color('text');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__row-hint {
    color: color('text-faint');
    font-weight: font-weight('regular');
    font-size: font-size('2xs');
  }

  &__row-control {
    justify-self: start;
    max-width: 20rem;
  }
}
</style>
