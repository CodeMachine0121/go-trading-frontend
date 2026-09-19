<script setup lang="ts">
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'

// 分子：挑一支存好的策略腳本，旁邊擺上對這一支能做的事。
//
// 這裡刻意不用 FormField。它把標籤、控制項與說明整包在一個 <label> 裡，
// 而**點 <label> 內的任何地方，瀏覽器都會把那一下轉給它包住的第一個控制項**——
// 動作按鈕放進去，按「策略腳本清單」會變成按到「儲存」。
// 因此 <label> 只包住選單，動作是它的兄弟。
//
// 動作與選單同屬一列且底部對齊，所以它們永遠與選單切齊；
// 擺在整個欄位外面的話，會對齊到說明文字那一行，看起來比選單低一截。
//
// 一支都沒有時，選單換成一句話而不是留一個空選單——空選單看起來像壞掉。
// 但動作**仍然要在**：那正是使用者要按「另存為新策略腳本」存下第一支的時候。
const { strategyScripts, activeStrategyScriptId = null } = defineProps<{
  strategyScripts: ChartApplicableStrategyScriptDto[]
  activeStrategyScriptId?: number | null
}>()

const emit = defineEmits<{ select: [id: number] }>()

/** 選單本身永遠顯示目前使用中的那一支；換掉它是 select 事件的結果，不是選單自己的狀態。 */
const selectedValue = computed(() => (activeStrategyScriptId === null ? '' : String(activeStrategyScriptId)))

/**
 * 一支都還沒有的時候要說一句——空的選單看起來像壞了。
 *
 * 有策略腳本之後就不說了：「挑一支會把它帶進來」是選單本來就會做的事，
 * 而一句永遠掛在那裡、每次都讀到的話，讀的人很快就會學會不讀它。
 */
const hint = computed(() => (strategyScripts.length === 0
  ? '寫好算式之後按「另存為新策略腳本」就會留下第一支。'
  : null))

function selectStrategyScript(value: string) {
  if (value !== '') {
    emit('select', Number(value))
  }
}
</script>

<template>
  <div class="strategy-script-picker">
    <div class="strategy-script-picker__row">
      <label class="strategy-script-picker__field">
        <span class="strategy-script-picker__label">策略腳本</span>

        <p
          v-if="strategyScripts.length === 0"
          class="strategy-script-picker__empty"
          data-testid="strategy-script-picker-empty"
        >
          還沒有任何策略腳本
        </p>

        <AppSelect
          v-else
          :model-value="selectedValue"
          data-testid="strategy-script-picker-select"
          @update:model-value="selectStrategyScript"
        >
          <option value="">
            未使用任何策略腳本
          </option>
          <option
            v-for="strategyScript in strategyScripts"
            :key="strategyScript.id"
            :value="String(strategyScript.id)"
          >
            {{ strategyScript.name }}
          </option>
        </AppSelect>
      </label>

      <div class="strategy-script-picker__actions">
        <slot name="actions" />
      </div>
    </div>

    <p
      v-if="hint"
      class="strategy-script-picker__hint"
    >
      {{ hint }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.strategy-script-picker {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');

  // 旁邊那幾顆鍵的字不折行，所以它們不會縮——窄螢幕上它們會把選單擠成
  // 一欄六個像素寬（一行一個字）。讓這一列換行：選單自己一行、鍵接在下面。
  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');

    // 底部對齊：欄位那一欄的最後一樣東西就是選單，所以動作剛好與它切齊。
    align-items: flex-end;
  }

  &__field {
    display: flex;

    // 基準寬度不是 auto 而是一個「還讀得出來」的寬度：低於它就換行，
    // 而不是繼續把選單壓扁。
    flex: 1 1 12rem;
    flex-direction: column;
    gap: spacing('3xs');

    // 選項一長就把動作擠出去，除非允許這一欄縮到比內容窄。
    min-width: 0;
    max-width: 24rem;
  }

  &__label {
    @include dense-label;
  }

  &__empty {
    margin: 0;
    border: 1px dashed color('border-strong');
    border-radius: radius('sm');
    padding: spacing('xs');
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__actions {
    display: flex;
    flex: none;
    gap: spacing('2xs');
  }

  &__hint {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
