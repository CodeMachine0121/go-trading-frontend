<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
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
    <section class="bot-form__section">
      <h3 class="bot-form__section-title">
        這台機器人
      </h3>

      <!--
        由上往下是使用者心裡的順序：這台叫什麼、照哪一套規則、盯哪裡、多久看一次。
        寬螢幕上兩兩並排，順序不變。
      -->
      <div class="bot-form__grid">
        <FormField label="機器人名稱">
          <AppInput
            v-model="form.name.value"
            type="text"
            placeholder="早盤突破"
            data-testid="bot-name-input"
          />
        </FormField>

        <FormField label="用哪一份交易策略">
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
            還沒有任何{{ page.tradingStrategyLabel }}。
            <NuxtLink to="/trading-strategies/new">
              先去拼一份
            </NuxtLink>
            {{ page.tradingStrategyCreateHint }}，機器人才知道要照什麼判斷。
          </AppAlert>
        </FormField>

        <!--
          合約機器人從合約標的清單挑，而且只列合約追蹤名單上的：同一個名字在兩條線上是兩個商品，
          而交易服務只讓合約機器人盯正在追蹤的合約。
        -->
        <ContractSymbolField
          v-if="page.picksContractTradingSymbol"
          v-model="form.symbol.value"
          :trading-symbol-application="tradingSymbolApplication"
          watched-only
          :keeps-selection="editing !== null"
        />
        <FormField
          v-else
          label="盯哪一個交易標的"
        >
          <SymbolField
            v-model="form.symbol.value"
            :trading-symbol-application="tradingSymbolApplication"
          />
        </FormField>

        <FormField label="每隔幾分鐘">
          <AppInput
            v-model="form.triggerIntervalText.value"
            type="number"
            inputmode="numeric"
            placeholder="5"
            data-testid="bot-interval-input"
          />
        </FormField>
      </div>
    </section>

    <!--
      一個問句而不是一個標題：使用者要決定的是「要不要」，不是「填什麼」。
      收著就是不建議部位——使用者看得到的就是他要送的。
    -->
    <section
      class="bot-form__section bot-form__plan"
      :class="{ 'bot-form__plan--open': form.suggestsPosition.value }"
    >
      <label class="bot-form__plan-toggle">
        <input
          v-model="form.suggestsPosition.value"
          class="bot-form__plan-checkbox"
          type="checkbox"
          data-testid="bot-position-plan-toggle"
        >
        <span>要不要順便算部位？訊息會多講押多少、停損與停利</span>
      </label>

      <div
        v-if="form.suggestsPosition.value"
        class="bot-form__grid bot-form__grid--dense"
        data-testid="bot-position-plan-fields"
      >
        <!-- 只有合約機器人有：現貨沒有人借錢給你。 -->
        <FormField
          v-if="form.takesLeverage"
          label="槓桿倍數（留空就是一倍）"
        >
          <AppInput
            v-model="form.leverageText.value"
            type="number"
            inputmode="decimal"
            placeholder="1"
            data-testid="bot-position-leverage-input"
          />
        </FormField>

        <FormField label="部位資金">
          <AppInput
            v-model="form.capitalText.value"
            type="number"
            inputmode="decimal"
            placeholder="50000"
            data-testid="bot-position-capital-input"
          />
        </FormField>

        <FormField label="每次開倉押多少">
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
        </FormField>

        <!-- 只有全押不必填，而那件事是既有那個模型答的，不是這裡記的。 -->
        <FormField
          v-if="form.sizingRequiresValue.value"
          label="押多少的數字"
        >
          <AppInput
            v-model="form.sizingValueText.value"
            type="number"
            inputmode="decimal"
            data-testid="bot-position-sizing-value-input"
          />
        </FormField>

        <FormField label="停損距離（百分點，留空就不設）">
          <AppInput
            v-model="form.stopLossText.value"
            type="number"
            inputmode="decimal"
            placeholder="3"
            data-testid="bot-position-stop-loss-input"
          />
        </FormField>

        <FormField label="停利距離（百分點，留空就不設）">
          <AppInput
            v-model="form.takeProfitText.value"
            type="number"
            inputmode="decimal"
            placeholder="5"
            data-testid="bot-position-take-profit-input"
          />
        </FormField>
      </div>
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

    <!-- 手機上兩顆鍵各佔一半、貼在拇指區；寬螢幕上靠右。 -->
    <div class="bot-form__actions">
      <AppButton
        type="button"
        variant="secondary"
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

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('md');
  }

  &__section-title {
    margin: 0;

    @include dense-label;
  }

  &__grid {
    display: grid;
    gap: spacing('sm');

    @include respond-to('md') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    // 部位那幾格是短數字，寬螢幕上排三欄還讀得清楚；窄的時候自己折行。
    &--dense {
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }
  }

  // 收著的時候它只是一句問句，不該長得跟上面那塊必答的一樣重。
  &__plan {
    border-style: dashed;
    background-color: transparent;

    &--open {
      border-style: solid;
      background-color: color('surface');
    }
  }

  &__plan-toggle {
    display: flex;
    align-items: center;
    gap: spacing('xs');
    cursor: pointer;
    color: color('text');
    font-size: font-size('sm');

    @include tap-target;
  }

  &__plan-checkbox {
    flex-shrink: 0;
    margin: 0;
    accent-color: color('primary');
    width: spacing('md');
    height: spacing('md');
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: spacing('xs');

    @include respond-to('md') {
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
