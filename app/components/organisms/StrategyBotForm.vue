<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import type { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { useStrategyBotForm } from '~/composables/use-strategy-bot-form'

// 有機體：拼一台機器人的那一張表單。
//
// 它**不知道自己是在新增還是在改**——收到一台機器人（或 null），交出一份要存的東西。
//
// 只有四格，而那正是這一版做的事：規則搬去交易策略自己的頁面了，
// 這裡只剩「哪一台機器、照哪一套規則、盯哪裡、多久看一次」。
// 開一台機器是填四格就走的事；拼規則是坐下來調半小時的事。
// 兩件事綁在同一張表單上，代價是同一套規則想盯第二個市場只能從頭再拼一次。
//
// 建議部位那五格**收在一個問句底下、預設收著**，就是為了守住上面那句話：
// 五個常駐欄位會把「填四格就走」變成「填九格才走」，
// 而多數人在開一台機器人的那一刻還沒決定要押多少。
// 那個區塊的開合不只是顯示——**收著就是不建議部位**，
// 因為使用者看得到的就是他要送的。
const { editing, page, tradingStrategyOptions, saving, failureMessage } = defineProps<{
  /** 有值就是改那一台，沒有就是新的一台。 */
  editing: StrategyBotDto | null
  /** 這一頁拼的是哪一種機器人：標的從哪一份清單挑、收不收槓桿。 */
  page: StrategyBotPageDto
  tradingSymbolApplication: TradingSymbolApplication
  /** 自己的每一份交易策略，依名稱排。**空的是一種狀態**，不是一個空選單。 */
  tradingStrategyOptions: readonly { value: number, label: string }[]
  saving: boolean
  /** 後端說的那一句。這一側擋下來的那幾種走 form.rejection。 */
  failureMessage: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [writeDto: StrategyBotWriteDto]
  /** 這一頁被改過了沒有——離開前要不要問，由上面那一層決定。 */
  dirtyChange: [dirty: boolean]
}>()

const form = useStrategyBotForm(() => editing, page)

form.reset()

/**
 * 這一頁被改過了沒有。
 *
 * 比的是**現在要送出去的那一份**與**剛打開時的那一份**，而不是「有沒有碰過鍵盤」：
 * 打了一個字再刪掉，什麼都沒改，不該為此攔人一次。
 */
const pristine = JSON.stringify(form.toWriteDto() ?? form.rejection.value)
watchEffect(() => {
  emit('dirtyChange', JSON.stringify(form.toWriteDto() ?? form.rejection.value) !== pristine)
})

function onSave() {
  const writeDto = form.toWriteDto()
  if (writeDto !== null) {
    emit('save', writeDto)
  }
}
</script>

<template>
  <div class="bot-form">
    <label class="bot-form__field">
      <span class="bot-form__field-name">機器人名稱</span>
      <AppInput
        v-model="form.name.value"
        type="text"
        placeholder="早盤突破"
        data-testid="bot-name-input"
      />
    </label>

    <!--
      挑規則擺在名稱底下、市場上面，因為那是使用者心裡的順序：
      這台叫什麼、照哪一套規則、盯哪裡、多久看一次。
    -->
    <label class="bot-form__field">
      <span class="bot-form__field-name">用哪一份交易策略</span>
      <AppSelect
        v-if="tradingStrategyOptions.length > 0"
        :model-value="String(form.tradingStrategyId.value)"
        data-testid="bot-trading-strategy-select"
        @update:model-value="form.tradingStrategyId.value = Number($event)"
      >
        <!-- 沒挑的那一格是一個選項，不是一個空白：一個看起來已經挑好的選單，
             會讓人在被擋下來時不知道哪裡不對。 -->
        <option value="0">
          挑一份
        </option>
        <option
          v-for="tradingStrategyOption in tradingStrategyOptions"
          :key="tradingStrategyOption.value"
          :value="String(tradingStrategyOption.value)"
        >
          {{ tradingStrategyOption.label }}
        </option>
      </AppSelect>
      <!--
        一份都沒有時給的不是一個空選單。在一個挑不到東西的選單前面發呆，
        是最沒有用的那一種畫面——所以這裡直接給出下一步在哪裡。
      -->
      <AppAlert
        v-else
        tone="info"
        data-testid="bot-no-trading-strategies"
      >
        還沒有任何交易策略。
        <NuxtLink to="/trading-strategies/new">
          先去拼一份
        </NuxtLink>
        ，機器人才知道要照什麼判斷。
      </AppAlert>
    </label>

    <!--
      合約機器人從合約標的清單挑，而且只列合約追蹤名單上的：同一個名字在兩條線上是兩個商品，
      而交易服務只讓合約機器人盯正在追蹤的合約。
    -->
    <ContractSymbolField
      v-if="page.picksContractTradingSymbol"
      v-model="form.symbol.value"
      :trading-symbol-application="tradingSymbolApplication"
      watched-only
    />
    <label
      v-else
      class="bot-form__field"
    >
      <span class="bot-form__field-name">盯哪一個交易標的</span>
      <SymbolField
        v-model="form.symbol.value"
        :trading-symbol-application="tradingSymbolApplication"
      />
    </label>

    <label class="bot-form__field">
      <span class="bot-form__field-name">每隔幾分鐘</span>
      <AppInput
        v-model="form.triggerIntervalText.value"
        type="number"
        inputmode="numeric"
        placeholder="5"
        data-testid="bot-interval-input"
      />
    </label>

    <!--
      一個問句而不是一個標題：使用者要決定的是「要不要」，不是「填什麼」。
    -->
    <div class="bot-form__plan">
      <label class="bot-form__plan-toggle">
        <input
          v-model="form.suggestsPosition.value"
          type="checkbox"
          data-testid="bot-position-plan-toggle"
        >
        <span>要不要順便算部位？訊息會多講押多少、停損與停利</span>
      </label>

      <div
        v-if="form.suggestsPosition.value"
        class="bot-form__plan-fields"
        data-testid="bot-position-plan-fields"
      >
        <!-- 只有合約機器人有：現貨沒有人借錢給你。 -->
        <label
          v-if="form.takesLeverage"
          class="bot-form__field"
        >
          <span class="bot-form__field-name">槓桿倍數（留空就是一倍）</span>
          <AppInput
            v-model="form.leverageText.value"
            type="number"
            inputmode="decimal"
            placeholder="1"
            data-testid="bot-position-leverage-input"
          />
        </label>

        <label class="bot-form__field">
          <span class="bot-form__field-name">部位資金</span>
          <AppInput
            v-model="form.capitalText.value"
            type="number"
            inputmode="decimal"
            placeholder="50000"
            data-testid="bot-position-capital-input"
          />
        </label>

        <label class="bot-form__field">
          <span class="bot-form__field-name">每次開倉押多少</span>
          <AppSelect
            v-model="form.sizingMode.value"
            data-testid="bot-position-sizing-mode-select"
          >
            <option
              v-for="modeOption in form.sizingModeOptions"
              :key="modeOption.value"
              :value="modeOption.value"
            >
              {{ modeOption.label }}
            </option>
          </AppSelect>
        </label>

        <!-- 只有全押不必填，而那件事是既有那個模型答的，不是這裡記的。 -->
        <label
          v-if="form.sizingRequiresValue.value"
          class="bot-form__field"
        >
          <span class="bot-form__field-name">押多少的數字</span>
          <AppInput
            v-model="form.sizingValueText.value"
            type="number"
            inputmode="decimal"
            data-testid="bot-position-sizing-value-input"
          />
        </label>

        <label class="bot-form__field">
          <span class="bot-form__field-name">停損距離（百分點，留空就不設）</span>
          <AppInput
            v-model="form.stopLossText.value"
            type="number"
            inputmode="decimal"
            placeholder="3"
            data-testid="bot-position-stop-loss-input"
          />
        </label>

        <label class="bot-form__field">
          <span class="bot-form__field-name">停利距離（百分點，留空就不設）</span>
          <AppInput
            v-model="form.takeProfitText.value"
            type="number"
            inputmode="decimal"
            placeholder="5"
            data-testid="bot-position-take-profit-input"
          />
        </label>
      </div>
    </div>

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

    <div class="bot-form__actions">
      <AppButton
        type="button"
        variant="ghost"
        @click="emit('cancel')"
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
    </div>
  </div>
</template>

<style scoped lang="scss">
.bot-form {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('sm');

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__field-name {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__plan {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');

    // 與四格之間畫一條線：上面那四格是必答的，這一段是選答的。
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }

  &__plan-toggle {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
    color: color('text-muted');
    font-size: font-size('2xs');
    cursor: pointer;
  }

  &__plan-fields {
    // 窄的時候自己折行，而不是把五格擠成一條。
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: spacing('2xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
