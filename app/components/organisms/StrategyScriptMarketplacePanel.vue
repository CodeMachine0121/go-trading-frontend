<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import MarketplaceStrategyScriptCard from '~/components/molecules/MarketplaceStrategyScriptCard.vue'
import type { StrategyScriptMarketplaceApplication } from '~/application/strategy-script-marketplace-application'
import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 有機體：市集這一頁的全部。
 *
 * 它只認識一個 application，而那一個交回來的每一列**已經知道它對現在這個人是什麼**——
 * 這一頁因此完全不必比對任何識別碼。那個判斷是規則，不是接線；放在這裡，
 * 它會在每一張卡上各算一次，而其中一次算錯就是一顆按不動的按鈕。
 */
const { strategyScriptMarketplaceApplication } = defineProps<{
  strategyScriptMarketplaceApplication: StrategyScriptMarketplaceApplication
}>()

const { t } = useI18n()
const { localize, translatedText } = useLocalizedText()

const listingRows = ref<MarketplaceListingRowDto[]>([])

/**
 * 使用者打的那一句搜尋的字。
 *
 * 它是這一頁的狀態，不是查詢條件：**不留存**（重新打開就是全部），
 * 而且**加入或移除之後留在框裡**——重讀清單不該把剛按過的那一張搖走。
 */
const searchQuery = ref('')

/**
 * 這一句話之後真的顯示出來的那幾列。
 *
 * 「是什麼意思」由 application 背後的規則回答，這裡只交出打的字與手上的清單。
 * 沒有打字時它就是全部，所以下面的模板不必為「有沒有在搜」各寫一條路。
 */
const visibleRows = computed(
  () => strategyScriptMarketplaceApplication.matchingRows(listingRows.value, searchQuery.value),
)

const loading = ref(true)
const unavailable = ref(false)
/** 正在改變加入狀態的那一支。同時只會有一支，因為使用者一次只按得到一顆按鈕。 */
const changingStrategyScriptId = ref<number | null>(null)
const failureMessage = shallowRef<LocalizedTextVo | null>(null)
const noticeMessage = shallowRef<LocalizedTextVo | null>(null)

async function reload() {
  try {
    listingRows.value = await strategyScriptMarketplaceApplication.listMarketplace()
    unavailable.value = false
  }
  catch {
    // 讀不到市集不是使用者能修正的事——說它讀不到，而不是說「市集上還沒有任何策略腳本」。
    // 那兩句話要他做的事完全不同：一句要他去把後端啟動起來，一句要他等別人分享。
    unavailable.value = true
  }
  finally {
    loading.value = false
  }
}

// 加入是複製一份：說清楚它之後與原本那一支無關，免得有人以為作者改了會跟著變。
async function adopt(id: number) {
  changingStrategyScriptId.value = id
  failureMessage.value = null
  noticeMessage.value = null

  try {
    await strategyScriptMarketplaceApplication.adoptStrategyScript(id)
    noticeMessage.value = translatedText('strategyScript.strategyScriptMarketplacePanel.adopted')
    await reload()
  }
  catch (error: unknown) {
    failureMessage.value = messageOf(error)
  }
  finally {
    changingStrategyScriptId.value = null
  }
}

function messageOf(error: unknown): LocalizedTextVo {
  // 「市集上沒有這一支」是這一頁最可能遇到的失敗，而它有一個明確的下一步：
  // 重新看一次——那一支很可能剛被它的主人收回。
  if (error instanceof StrategyScriptNotFoundError) {
    return translatedText('strategyScript.strategyScriptMarketplacePanel.noLongerListed')
  }
  if (error instanceof BackendUnreachableError) {
    return translatedText('strategyScript.strategyScriptMarketplacePanel.backendUnreachable')
  }
  if (error instanceof BackendRequestRejectedError || error instanceof BackendServerError) {
    return error.localizedMessage
  }

  return error instanceof Error
    ? new UntranslatedTextVo(error.message)
    : translatedText('strategyScript.strategyScriptMarketplacePanel.operationFailed')
}

onMounted(reload)
</script>

<template>
  <section class="strategy-script-marketplace-panel">
    <header class="strategy-script-marketplace-panel__toolbar">
      <!--
        常駐說明，不是提示訊息：「看不到算式」是這個地方的規則，任何時候看這一頁的人都需要知道。
      -->
      <p class="strategy-script-marketplace-panel__note">
        {{ t('strategyScript.strategyScriptMarketplacePanel.note') }}
      </p>

      <!--
        搜尋框只在市集上真的有東西的時候出現：空市集上給一個搜不到任何東西的框，
        只會讓人以為是自己搜錯了。
      -->
      <div
        v-if="!loading && !unavailable && listingRows.length > 0"
        class="strategy-script-marketplace-panel__search"
      >
        <label
          class="strategy-script-marketplace-panel__search-label"
          for="marketplace-search"
        >{{ t('strategyScript.strategyScriptMarketplacePanel.searchLabel') }}</label>
        <AppInput
          id="marketplace-search"
          v-model="searchQuery"
          type="search"
          :placeholder="t('strategyScript.strategyScriptMarketplacePanel.searchPlaceholder')"
          data-testid="marketplace-search-input"
        />
      </div>
    </header>

    <AppAlert
      v-if="failureMessage"
      tone="danger"
      data-testid="marketplace-failure-alert"
    >
      {{ localize(failureMessage) }}
    </AppAlert>

    <AppAlert
      v-else-if="noticeMessage"
      tone="success"
      data-testid="marketplace-notice"
    >
      {{ localize(noticeMessage) }}
    </AppAlert>

    <AppAlert
      v-if="unavailable"
      tone="danger"
      data-testid="marketplace-unavailable-alert"
    >
      {{ t('strategyScript.strategyScriptMarketplacePanel.unavailable') }}
    </AppAlert>

    <p
      v-else-if="loading"
      class="strategy-script-marketplace-panel__placeholder"
    >
      {{ t('strategyScript.strategyScriptMarketplacePanel.loading') }}
    </p>

    <p
      v-else-if="listingRows.length === 0"
      class="strategy-script-marketplace-panel__placeholder strategy-script-marketplace-panel__placeholder--empty"
      data-testid="marketplace-empty"
    >
      {{ t('strategyScript.strategyScriptMarketplacePanel.empty') }}
    </p>

    <!--
      「沒有符合」與「市集上還沒有任何策略腳本」是兩句不同的話，因為它們要人做的事相反：
      一句要他換個關鍵字，一句要他等別人分享。說成同一句，他會把自己打錯的幾個字
      讀成「這裡什麼都沒有」，然後就不再回來了。
    -->
    <p
      v-else-if="visibleRows.length === 0"
      class="strategy-script-marketplace-panel__placeholder strategy-script-marketplace-panel__placeholder--empty"
      data-testid="marketplace-no-matches"
    >
      {{ t('strategyScript.strategyScriptMarketplacePanel.noMatches', { query: searchQuery.trim() }) }}
      <AppButton
        variant="ghost"
        size="small"
        data-testid="marketplace-clear-search"
        @click="searchQuery = ''"
      >
        {{ t('strategyScript.strategyScriptMarketplacePanel.clearSearch') }}
      </AppButton>
    </p>

    <ul
      v-else
      class="strategy-script-marketplace-panel__list"
    >
      <MarketplaceStrategyScriptCard
        v-for="row in visibleRows"
        :key="row.strategyScript.id"
        :row="row"
        :busy="changingStrategyScriptId === row.strategyScript.id"
        @adopt="adopt"
      />
    </ul>
  </section>
</template>

<style scoped lang="scss">
.strategy-script-marketplace-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__toolbar {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');

    @include respond-to('lg') {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  &__note {
    margin: 0;
    max-width: 44rem;
    color: color('text-muted');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }

  &__search {
    display: flex;
    align-items: center;
    gap: spacing('xs');

    @include respond-to('lg') {
      flex: 0 0 20rem;
    }
  }

  &__search-label {
    color: color('text-faint');
    font-size: font-size('2xs');
    white-space: nowrap;
  }

  &__placeholder {
    margin: 0;
    padding: spacing('lg') 0;
    color: color('text-faint');
    font-size: font-size('sm');

    &--empty {
      border: 1px dashed color('border-strong');
      border-radius: radius('md');
      padding: spacing('xl') spacing('md');
      text-align: center;
    }
  }

  // 一格一張卡：手機一欄、平板兩欄、寬螢幕三欄——多欄才看得出它們是一組可以挑的東西。
  &__list {
    display: grid;
    gap: spacing('sm');
    margin: 0;
    padding: 0;
    list-style: none;

    @include respond-to('md') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include respond-to('xl') {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}
</style>
