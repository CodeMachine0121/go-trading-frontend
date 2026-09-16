<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import StrategyBotConditionEditor from '~/components/molecules/StrategyBotConditionEditor.vue'
import StrategyBotSignalSourceFields from '~/components/molecules/StrategyBotSignalSourceFields.vue'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的那一張表單。
//
// 三段有順序，而且順序不能顛倒：**第三段的下拉選單是由第二段填出來的**。
// 這也是「打不出錯誤的代號」的實作方式——選單裡沒有的東西選不到。
const { open, editing, strategyOptions, saving, failureMessage } = defineProps<{
  open: boolean
  /** 有值就是改那一台，沒有就是新的一台。 */
  editing: StrategyBotDto | null
  strategyOptions: readonly { value: number, label: string }[]
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  saving: boolean
  /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
  failureMessage: string
}>()

const emit = defineEmits<{
  close: []
  save: [writeDto: StrategyBotWriteDto]
}>()

const form = useStrategyBotForm(
  () => editing,
  () => strategyOptions,
)

watch(() => open, (isOpen) => {
  if (isOpen) {
    form.reset()
  }
})

function onSave() {
  const writeDto = form.toWriteDto()
  if (writeDto !== null) {
    emit('save', writeDto)
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="editing === null ? '拼一台機器人' : `改一改「${editing.name}」`"
    @close="emit('close')"
  >
    <div class="strategy-bot-form">
      <!-- 第一段：這台機器人是什麼。 -->
      <section class="strategy-bot-form__section">
        <h3 class="strategy-bot-form__heading">
          這台機器人是什麼
        </h3>

        <div class="strategy-bot-form__line">
          <AppInput
            v-model="form.name.value"
            type="text"
            placeholder="機器人名稱"
            data-testid="bot-name-input"
          />
          <AppInput
            v-model="form.symbol.value"
            type="text"
            placeholder="交易標的（例如 BTCUSDT）"
            data-testid="bot-symbol-input"
          />
          <AppInput
            v-model="form.triggerIntervalText.value"
            type="number"
            inputmode="numeric"
            placeholder="每隔幾分鐘"
            data-testid="bot-interval-input"
          />
        </div>
      </section>

      <!-- 第二段：它要聽哪幾支。第三段的選單由這一段填出來。 -->
      <section class="strategy-bot-form__section">
        <h3 class="strategy-bot-form__heading">
          它要聽哪幾支策略
        </h3>

        <StrategyBotSignalSourceFields
          :sources="form.signalSources.value"
          :strategy-options="strategyOptions"
          :interval-options="form.intervalOptions"
          :parameter-names-by-strategy-id="parameterNamesByStrategyId"
          :can-add="form.canAddSignalSource.value"
          :removal-blocked-reasons="form.signalSourceRemovalBlockedReasons.value"
          @add="form.addSignalSource"
          @remove="form.removeSignalSource"
          @change-label="form.changeSignalSourceLabel"
          @change-strategy="form.changeSignalSourceStrategy"
          @change-interval="form.changeSignalSourceInterval"
          @change-parameter-value="form.changeSignalSourceParameterValue"
        />
      </section>

      <!-- 第三段：什麼算買、什麼算賣。 -->
      <section
        v-for="side in form.conditionSides"
        :key="side.key"
        class="strategy-bot-form__section"
      >
        <h3 class="strategy-bot-form__heading">
          {{ side.heading }}
        </h3>

        <div
          v-if="side.condition.value === null"
          class="strategy-bot-form__start"
        >
          <p class="strategy-bot-form__hint">
            還沒有條件。先放一句比對，之後隨時可以把它包成群組。
          </p>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="form.signalSources.value.length === 0"
            :data-testid="`${side.key}-condition-start`"
            @click="side.start()"
          >
            ＋ 放第一句
          </AppButton>
        </div>

        <StrategyBotConditionEditor
          v-else
          :condition="side.condition.value"
          :source-labels="form.sourceLabels.value"
          :signal-options="form.signalOptions"
          :can-add="side.canAdd"
          :removable-node-ids="side.removableNodeIds.value"
          @add-comparison="side.addComparison"
          @add-group="side.addGroup"
          @change-operator="side.changeOperator"
          @change-comparison="side.changeComparison"
          @wrap-in-group="side.wrapInGroup"
          @remove="side.remove"
        />
      </section>

      <AppAlert
        v-if="form.rejection.value !== null"
        tone="warning"
        data-testid="bot-form-rejection"
      >
        {{ form.rejection.value }}
      </AppAlert>

      <AppAlert
        v-else-if="failureMessage !== ''"
        tone="danger"
        data-testid="bot-form-failure"
      >
        {{ failureMessage }}
      </AppAlert>
    </div>

    <template #actions>
      <AppButton
        type="button"
        variant="ghost"
        @click="emit('close')"
      >
        取消
      </AppButton>
      <AppButton
        type="button"
        :disabled="saving || form.rejection.value !== null"
        data-testid="bot-form-save"
        @click="onSave"
      >
        {{ saving ? '儲存中…' : '儲存' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.strategy-bot-form {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('sm');
    font-weight: font-weight('semibold');
  }

  &__line {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
  }

  &__start {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: spacing('xs');
  }

  &__hint {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }
}
</style>
