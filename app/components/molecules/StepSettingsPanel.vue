<script setup lang="ts">
import AppModal from '~/components/atoms/AppModal.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'

// 分子：一張步驟卡被選中時，它的設定出現的地方。
//
// 寬螢幕上它**貼在那張卡旁邊**（右邊那一欄），卡與設定同時看得見；
// 窄螢幕上旁邊沒有位置，它從下方拉出一張紙。兩種擺法裝的是**同一份內容**——
// 由使用它的那張卡用 slot 填進來，所以設定只寫一次，不會有一邊忘了跟著改。
//
// 擺在哪一種由上面那一層決定（它問過現在這個寬度代表什麼），這裡不自己量寬度。
type StepSettingsPlacement = 'beside' | 'sheet'

const { open, title, placement } = defineProps<{
  open: boolean
  title: string
  placement: StepSettingsPlacement
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal
    v-if="placement === 'sheet'"
    :open="open"
    :title="title"
    @close="emit('close')"
  >
    <div class="step-settings-panel__content">
      <slot />
    </div>

    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>
  </AppModal>

  <AppPanel
    v-else-if="open"
    :title="title"
    class="step-settings-panel"
  >
    <div class="step-settings-panel__content">
      <slot />
    </div>

    <template
      v-if="$slots.actions"
      #footer
    >
      <div class="step-settings-panel__actions">
        <slot name="actions" />
      </div>
    </template>
  </AppPanel>
</template>

<style scoped lang="scss">
.step-settings-panel {
  // 卡片很長時設定跟著捲到眼前，而不是留在卡片頂端那一格。
  position: sticky;
  top: spacing('sm');

  &__content {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
