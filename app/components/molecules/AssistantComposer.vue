<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'

// 分子：輸入區。抽屜與整頁**共用這一個**——兩個地方的差別是寬度，不是行為。
//
// 送出鍵的可按與否接的是「這一句送不送得出去」，那個判定在 domain。
// 這裡不自己判斷空白：判斷寫兩份的話，畫面與後端會在某一天對空白有不同的看法。
//
// 等待中一切送出動作都鎖住，包含 Enter。少了這一道，使用者在那可能長達兩分鐘的
// 等待裡多按一次 Enter 就是多花一次錢。
const { pending = false, autofocus = false } = defineProps<{
  pending?: boolean
  autofocus?: boolean
}>()

const draft = defineModel<string>({ required: true })

const emit = defineEmits<{ send: [] }>()

const textarea = useTemplateRef<{ focus: () => void }>('textarea')

const canSend = computed(() => !pending && draft.value.trim() !== '')

function send(): void {
  if (!canSend.value) {
    return
  }

  emit('send')
}

/** Enter 送出、Shift+Enter 換行——這是聊天輸入框的既有慣例，不必再教。 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  send()
}

/** 回答回來就把焦點還回來，好接著問下一句。 */
watch(() => pending, (isPending, wasPending) => {
  if (wasPending && !isPending) {
    textarea.value?.focus()
  }
})

onMounted(() => {
  if (autofocus) {
    textarea.value?.focus()
  }
})
</script>

<template>
  <form
    class="assistant-composer"
    @submit.prevent="send"
  >
    <div class="assistant-composer__field">
      <AppTextarea
        ref="textarea"
        v-model="draft"
        :disabled="pending"
        placeholder="問一句行情，例如：BTCUSDT 最近一天每小時的走勢如何？"
        aria-label="問助手"
        data-testid="assistant-composer-input"
        @keydown="onKeydown"
      />

      <AppButton
        type="submit"
        size="small"
        :disabled="!canSend"
        label="送出"
        class="assistant-composer__send"
        data-testid="assistant-composer-send"
      >
        送出
      </AppButton>
    </div>

    <p class="assistant-composer__disclaimer">
      助手可能會出錯。牽涉到下單決策的數字，請自行覆核。
    </p>
  </form>
</template>

<style scoped lang="scss">
.assistant-composer {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__field {
    display: flex;
    align-items: flex-end;
    gap: spacing('xs');
  }

  &__send {
    flex-shrink: 0;
  }

  &__disclaimer {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }
}
</style>
