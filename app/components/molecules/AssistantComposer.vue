<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'

// 分子：輸入區。抽屜與整頁**共用這一個**——兩個地方的差別是寬度，不是行為。
//
// 外形是一整個內凹的框，輸入框與送出鍵都住在裡面——框只有這一個，
// 焦點亮起來的是整個框。框的底下一行說出按鍵的慣例（Enter 送出、Shift+Enter 換行），
// 送出鍵在同一行的右邊。
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

const { t } = useI18n()

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
        bare
        :placeholder="t('assistant.composer.placeholder')"
        :aria-label="t('assistant.composer.inputLabel')"
        data-testid="assistant-composer-input"
        @keydown="onKeydown"
      />

      <div class="assistant-composer__bar">
        <span class="assistant-composer__hint">{{ t('assistant.composer.keyboardHint') }}</span>

        <AppButton
          type="submit"
          size="small"
          :disabled="!canSend"
          :label="t('assistant.composer.send')"
          class="assistant-composer__send"
          data-testid="assistant-composer-send"
        >
          <AppIcon
            name="send"
            size="small"
          />
          {{ t('assistant.composer.send') }}
        </AppButton>
      </div>
    </div>

    <p class="assistant-composer__disclaimer">
      {{ t('assistant.composer.disclaimer') }}
    </p>
  </form>
</template>

<style scoped lang="scss">
.assistant-composer {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    transition: border-color duration('fast') ease;
    border: 1px solid color('border-strong');
    border-radius: radius('md');
    background-color: color('surface-raised');
    padding: spacing('xs');

    &:focus-within {
      border-color: color('primary');
    }
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: spacing('xs');
  }

  &__hint {
    flex: 1;
    min-width: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__send {
    flex-shrink: 0;
  }

  &__disclaimer {
    margin: 0 spacing('3xs');
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
