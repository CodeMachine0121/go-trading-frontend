<script setup lang="ts">
import SettingsSection from '~/components/molecules/SettingsSection.vue'

// 有機體：設定畫面上「帳號」那一段。
//
// 它只顯示，什麼都不做。密碼那一格畫的是一排點而**不是密碼**——這個系統從來沒有
// 留著密碼，畫面自然也拿不出來。旁邊那句話因此是必要的而不是客套：
// 留一個空格或一句「無法取得」，看起來就像畫面壞了。
defineProps<{
  email: string | null
}>()

/** 遮住的位數是固定的。跟著真實長度走，等於把密碼有幾個字說出去。 */
const MASKED_PASSWORD = '••••••••'
</script>

<template>
  <SettingsSection
    title="帳號"
    description="你用來登入的那組身分。電子郵件就是帳號本身，目前不能更換。"
  >
    <dl class="account-profile-panel">
      <div class="account-profile-panel__row">
        <dt class="account-profile-panel__label">
          電子郵件
        </dt>
        <dd
          class="account-profile-panel__value"
          data-testid="account-email"
        >
          {{ email ?? '—' }}
        </dd>
      </div>

      <div class="account-profile-panel__row">
        <dt class="account-profile-panel__label">
          密碼
        </dt>
        <dd class="account-profile-panel__value">
          <span
            class="account-profile-panel__masked"
            data-testid="account-password-mask"
          >{{ MASKED_PASSWORD }}</span>
          <span class="account-profile-panel__note">
            密碼不會顯示，只能更換——系統從來沒有留著它。
          </span>
        </dd>
      </div>
    </dl>
  </SettingsSection>
</template>

<style scoped lang="scss">
// 兩列唯讀資料。它刻意長得**不像表單**：沒有框、沒有底色，
// 因為這一段沒有任何東西可以動，而看起來可以填的東西會讓人一直想去點它。
.account-profile-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  margin: 0;

  &__row {
    display: grid;
    gap: spacing('3xs');
  }

  &__label {
    @include dense-label;
  }

  &__value {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    color: color('text');
    font-size: font-size('sm');
  }

  // 那一排點與電子郵件對齊在同一個節奏上，所以它用等寬字：
  // 比例字型下八個點會擠成一團，看起來像一個汙漬而不是一組被遮住的字。
  &__masked {
    letter-spacing: 0.3em;
    font-family: font-family('mono');
  }

  &__note {
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('2xs');
  }
}
</style>
