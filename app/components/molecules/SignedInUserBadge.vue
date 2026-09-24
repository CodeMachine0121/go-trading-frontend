<script setup lang="ts">
import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

// 分子：側欄底下那一行——現在是誰在用，旁邊一顆離開。
//
// 它只收 DTO、只往上 emit，資料由頁面餵進來（拿資料是 page 的事）。
defineProps<{
  user: SignedInUserDto
}>()

defineEmits<{ signOut: [] }>()
</script>

<template>
  <div class="signed-in-user-badge">
    <!-- 電子郵件常常比側欄還寬，所以截斷；停在上面看得到全文。 -->
    <span
      class="signed-in-user-badge__email"
      :title="user.email"
      data-testid="signed-in-email"
    >{{ user.email }}</span>

    <AppButton
      variant="ghost"
      size="small"
      label="登出"
      data-testid="sign-out"
      @click="$emit('signOut')"
    >
      <AppIcon
        name="sign-out"
        size="small"
      />
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.signed-in-user-badge {
  display: flex;
  gap: spacing('2xs');
  align-items: center;
  justify-content: space-between;
  min-width: 0;

  // 這一行刻意不套 dense-label：那個 mixin 會把字全部轉成大寫，而電子郵件
  // 是一個要被照著讀的位址，不是一個欄位名。大寫過的位址看起來像另一個位址。
  &__email {
    min-width: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-family: font-family('mono');
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
