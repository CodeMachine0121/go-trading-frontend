<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'

// 分子：問一個策略的名稱與說明。
//
// 另存為新策略與替現有的那一支改名共用它——兩者問的是同一件事，
// 差別只在標題與一開始框裡有沒有字。做成兩個元件，只會讓「名稱被佔用時怎麼辦」
// 有兩個地方要維護。
//
// 名稱被佔用時**不關閉、不清空**——讓使用者當場改一個字再送一次，
// 而不是把他剛打的名字丟掉重來。
const {
  open,
  title,
  hint,
  initialName = '',
  initialDescription = '',
  errorMessage = null,
  submitting = false,
} = defineProps<{
  open: boolean
  title: string
  hint: string
  /** 打開時框裡先放什麼。改名時放現在的名字，另存時留空。 */
  initialName?: string
  /** 說明那一格打開時先放什麼。**可以留空**——沒有說明是一個合法的答案。 */
  initialDescription?: string
  errorMessage?: string | null
  submitting?: boolean
}>()

const emit = defineEmits<{ submit: [name: string, description: string], cancel: [] }>()

const name = ref(initialName)
const description = ref(initialDescription)
const missingNameMessage = ref<string | null>(null)

// 每次打開都重新從「這一次該有的起點」開始；上一次留下的字對這一次沒有意義。
watch(() => open, (isOpen) => {
  if (isOpen) {
    name.value = initialName
    description.value = initialDescription
    missingNameMessage.value = null
  }
})

function submitName() {
  const trimmedName = name.value.trim()
  if (trimmedName === '') {
    missingNameMessage.value = '請填寫策略名稱'
    return
  }

  missingNameMessage.value = null
  // 說明不在這裡驗長度：那是後端的規則，抄一份下來，等那邊改了這邊沒跟著改，
  // 畫面就會擋掉其實存得下的東西。
  emit('submit', trimmedName, description.value)
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    @close="emit('cancel')"
  >
    <form
      class="strategy-name-dialog"
      @submit.prevent="submitName"
    >
      <FormField
        label="策略名稱"
        :hint="hint"
        :error-message="missingNameMessage ?? errorMessage"
      >
        <AppInput
          v-model="name"
          :invalid="Boolean(missingNameMessage ?? errorMessage)"
          data-testid="strategy-name-input"
          placeholder="例如：二十根均線"
        />
      </FormField>

      <!--
        說明在名稱下面而不是另一個對話框：兩者一起被想到（「這是什麼、它做什麼」），
        分成兩步只會讓大部分人跳過第二步——而分享出去之後，那一步是別人唯一的介紹。
      -->
      <FormField
        label="說明（選填）"
        hint="這支策略在做什麼。分享到市集之後，別人看不到算式，只看得到這一段。"
      >
        <AppTextarea
          v-model="description"
          data-testid="strategy-description-input"
          placeholder="例如：用五分鐘 K 線抓短線轉折"
        />
      </FormField>
    </form>

    <template #actions>
      <AppButton
        variant="secondary"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <AppButton
        :disabled="submitting"
        data-testid="strategy-name-submit"
        @click="submitName"
      >
        {{ submitting ? '儲存中…' : '儲存' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-name-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
}
</style>
