<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import SettingsSection from '~/components/molecules/SettingsSection.vue'

// 有機體：設定畫面上「帳號」那一段——是誰、開通了沒，以及離開。
//
// 密碼那一格畫的是一排點而**不是密碼**——這個系統從來沒有留著密碼，畫面自然也拿不出來。
// 描述裡那句話因此是必要的而不是客套：留一個空格或一句「無法取得」，看起來就像畫面壞了。
//
// 登出也在這一段：窄螢幕上沒有側欄，側欄底下那顆登出鍵在那裡看不到，
// 而設定是「關於我自己」的那一個去處。
const { email, activated = false } = defineProps<{
  email: string | null
  /** 這個帳號被放行了沒。 */
  activated?: boolean
}>()

const emit = defineEmits<{ signOut: [] }>()

/** 遮住的位數是固定的。跟著真實長度走，等於把密碼有幾個字說出去。 */
const MASKED_PASSWORD = '••••••••'
</script>

<template>
  <SettingsSection
    title="帳號"
    description="你用來登入的那組身分。電子郵件就是帳號本身，目前不能更換；密碼不會顯示，只能更換——系統從來沒有留著它。"
  >
    <dl class="account-profile-panel">
      <div class="account-profile-panel__row">
        <dt class="account-profile-panel__label">
          電子郵件
        </dt>
        <dd class="account-profile-panel__value account-profile-panel__value--inline">
          <span data-testid="account-email">{{ email ?? '—' }}</span>
          <AppBadge
            v-if="activated"
            variant="success"
            data-testid="account-activated"
          >
            已開通
          </AppBadge>
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
        </dd>
      </div>

      <div class="account-profile-panel__row">
        <dt class="account-profile-panel__label">
          登出
        </dt>
        <dd class="account-profile-panel__value">
          <AppButton
            variant="secondary"
            size="small"
            data-testid="account-sign-out"
            @click="emit('signOut')"
          >
            <AppIcon
              name="sign-out"
              size="small"
            />
            登出
          </AppButton>
        </dd>
      </div>
    </dl>
  </SettingsSection>
</template>

<style scoped lang="scss">
.account-profile-panel {
  display: flex;
  flex-direction: column;
  margin: calc(-1 * spacing('sm')) 0;

  // 標籤在左、值在右，一列一條髮絲線。它刻意長得**不像表單**：
  // 沒有框、沒有底色，因為這一段除了登出沒有任何東西可以動。
  &__row {
    display: grid;

    // 窄螢幕上標籤在上、值在下：並排的話，一個電子郵件會被折成三行。
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('3xs');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding: spacing('sm') 0;

    @include respond-to('md') {
      grid-template-columns: minmax(0, 10rem) minmax(0, 1fr);
      gap: spacing('md');
    }

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    color: color('text');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__value {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    color: color('text-strong');
    font-size: font-size('sm');

    &--inline {
      display: flex;
      flex-wrap: wrap;
      gap: spacing('xs');
      align-items: center;
    }
  }

  // 等寬字：比例字型下八個點會擠成一團，看起來像一個汙漬而不是一組被遮住的字。
  &__masked {
    letter-spacing: 0.3em;
    font-family: font-family('mono');
  }
}
</style>
