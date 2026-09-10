<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'

// 有機體：設定畫面上「帳號」那一張卡。
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
  <AppPanel title="帳號">
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
  </AppPanel>
</template>

<style scoped lang="scss">
.account-profile-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  margin: 0;

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
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('sm');
    align-items: baseline;
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    color: color('text');
  }

  &__masked {
    letter-spacing: 0.2em;
  }

  &__note {
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
