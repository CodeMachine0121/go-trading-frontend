<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import StrategyParameterList from '~/components/molecules/StrategyParameterList.vue'
import type { StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'

/**
 * 分子：宣告這支算式有哪些旋鈕。
 *
 * **它是打開來改的，不是攤在編輯區旁邊的。** 宣告旋鈕是偶爾做一次的事——
 * 寫算式的時候做一次，之後幾十次執行都不會再動它。把它常駐在編輯區底下，
 * 等於讓一件偶爾做的事一直佔著寫程式的地方，而兩塊擠在同一個框裡誰也擺不好。
 *
 * 它一個業務判斷都不做：每一格長什麼樣、哪裡不對，全部由上面傳進來。
 */
defineProps<{
  open: boolean
  fields: readonly StrategyParameterFieldDto[]
  kindOptions: readonly { value: StrategyParameterKind, label: string }[]
  errorMessage: string | null
}>()

const emit = defineEmits<{
  close: []
  add: []
  remove: [index: number]
  rename: [index: number, name: string]
  changeKind: [index: number, kind: StrategyParameterKind]
  changeValue: [index: number, value: number]
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="參數"
    @close="emit('close')"
  >
    <div class="strategy-parameter-dialog">
      <p class="strategy-parameter-dialog__lead">
        算式以名字取用它們，它們跟著這支策略一起存。
        在 K 線圖表上套用時可以替那一次另外調一個值，這裡填的預設值不會被動到。
      </p>

      <StrategyParameterList
        :fields="fields"
        :kind-options="kindOptions"
        @add="emit('add')"
        @remove="index => emit('remove', index)"
        @rename="(index, name) => emit('rename', index, name)"
        @change-kind="(index, kind) => emit('changeKind', index, kind)"
        @change-value="(index, value) => emit('changeValue', index, value)"
      />

      <AppAlert
        v-if="errorMessage"
        tone="danger"
        data-testid="parameters-alert"
      >
        {{ errorMessage }}
      </AppAlert>
    </div>

    <template #actions>
      <AppButton
        data-testid="close-parameters-button"
        @click="emit('close')"
      >
        完成
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-parameter-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  min-width: 30rem;

  &__lead {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
