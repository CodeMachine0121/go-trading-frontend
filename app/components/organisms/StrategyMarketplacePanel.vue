<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import MarketplaceStrategyCard from '~/components/molecules/MarketplaceStrategyCard.vue'
import type { StrategyMarketplaceApplication } from '~/application/strategy-marketplace-application'
import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 有機體：市集這一頁的全部。
 *
 * 它只認識一個 application，而那一個交回來的每一列**已經知道它對現在這個人是什麼**——
 * 這一頁因此完全不必比對任何識別碼。那個判斷是規則，不是接線；放在這裡，
 * 它會在每一張卡上各算一次，而其中一次算錯就是一顆按不動的按鈕。
 */
const { strategyMarketplaceApplication } = defineProps<{
  strategyMarketplaceApplication: StrategyMarketplaceApplication
}>()

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
  () => strategyMarketplaceApplication.matchingRows(listingRows.value, searchQuery.value),
)

const loading = ref(true)
const unavailable = ref(false)
/** 正在改變加入狀態的那一支。同時只會有一支，因為使用者一次只按得到一顆按鈕。 */
const changingStrategyId = ref<number | null>(null)
const failureMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)

async function reload() {
  try {
    listingRows.value = await strategyMarketplaceApplication.listMarketplace()
    unavailable.value = false
  }
  catch {
    // 讀不到市集不是使用者能修正的事——說它讀不到，而不是說「市集上還沒有任何策略」。
    // 那兩句話要他做的事完全不同：一句要他去把後端啟動起來，一句要他等別人分享。
    unavailable.value = true
  }
  finally {
    loading.value = false
  }
}

async function adopt(id: number) {
  await changeAdoption(id, () => strategyMarketplaceApplication.adoptStrategy(id), '已經加入你的策略清單。')
}

async function abandon(id: number) {
  await changeAdoption(id, () => strategyMarketplaceApplication.abandonStrategy(id), '已經從你的策略清單移除。')
}

/**
 * 加入與移除走同一條路：兩者是同一件事的兩個方向，所以「按下去要禁用哪一顆、
 * 成功要說什麼、失敗要說什麼、之後要重讀」也只寫一次。
 */
async function changeAdoption(id: number, change: () => Promise<void>, successMessage: string) {
  changingStrategyId.value = id
  failureMessage.value = null
  noticeMessage.value = null

  try {
    await change()
    noticeMessage.value = successMessage
    await reload()
  }
  catch (error: unknown) {
    failureMessage.value = messageOf(error)
  }
  finally {
    changingStrategyId.value = null
  }
}

function messageOf(error: unknown): string {
  // 「市集上沒有這一支」是這一頁最可能遇到的失敗，而它有一個明確的下一步：
  // 重新看一次——那一支很可能剛被它的主人收回。
  if (error instanceof StrategyNotFoundError) {
    return '這一支已經不在市集上了，可能剛被分享的人收回。重新整理就會看到目前的樣子。'
  }
  if (error instanceof BackendUnreachableError) {
    return '連不上後端，請確認它已經啟動。'
  }

  return error instanceof Error ? error.message : '操作失敗。'
}

onMounted(reload)
</script>

<template>
  <section class="strategy-marketplace-panel">
    <AppPanel title="市集上的策略">
      <!--
        常駐說明，不是提示訊息：「看不到算式」是這個地方的規則，任何時候看這一頁的人都需要知道。
      -->
      <p class="strategy-marketplace-panel__note">
        這裡是大家分享出來的策略。你看得到它算什麼、有哪些旋鈕，但看不到它怎麼算——
        加入之後，它會出現在你挑策略的地方，可以拿去算、也可以套到 K 線圖上。
      </p>

      <!--
        搜尋框只在市集上真的有東西的時候出現：空市集上給一個搜不到任何東西的框，
        只會讓人以為是自己搜錯了。
      -->
      <div
        v-if="!loading && !unavailable && listingRows.length > 0"
        class="strategy-marketplace-panel__search"
      >
        <label
          class="strategy-marketplace-panel__search-label"
          for="marketplace-search"
        >搜尋</label>
        <AppInput
          id="marketplace-search"
          v-model="searchQuery"
          type="search"
          placeholder="策略名稱、說明，或是誰分享的"
          data-testid="marketplace-search-input"
        />
      </div>

      <AppAlert
        v-if="failureMessage"
        tone="danger"
        data-testid="marketplace-failure-alert"
      >
        {{ failureMessage }}
      </AppAlert>

      <AppAlert
        v-else-if="noticeMessage"
        tone="success"
        data-testid="marketplace-notice"
      >
        {{ noticeMessage }}
      </AppAlert>

      <AppAlert
        v-if="unavailable"
        tone="danger"
        data-testid="marketplace-unavailable-alert"
      >
        讀不到市集，請確認後端已啟動。
      </AppAlert>

      <p
        v-else-if="loading"
        class="strategy-marketplace-panel__placeholder"
      >
        讀取市集中…
      </p>

      <p
        v-else-if="listingRows.length === 0"
        class="strategy-marketplace-panel__placeholder"
        data-testid="marketplace-empty"
      >
        市集上還沒有任何策略。把自己調好的一支分享出來，別人就看得到它了。
      </p>

      <!--
        「沒有符合」與「市集上還沒有任何策略」是兩句不同的話，因為它們要人做的事相反：
        一句要他換個關鍵字，一句要他等別人分享。說成同一句，他會把自己打錯的幾個字
        讀成「這裡什麼都沒有」，然後就不再回來了。
      -->
      <p
        v-else-if="visibleRows.length === 0"
        class="strategy-marketplace-panel__placeholder"
        data-testid="marketplace-no-matches"
      >
        沒有符合「{{ searchQuery.trim() }}」的策略。
        <AppButton
          variant="ghost"
          size="small"
          data-testid="marketplace-clear-search"
          @click="searchQuery = ''"
        >
          清掉搜尋
        </AppButton>
      </p>

      <ul
        v-else
        class="strategy-marketplace-panel__list"
      >
        <MarketplaceStrategyCard
          v-for="row in visibleRows"
          :key="row.strategy.id"
          :row="row"
          :busy="changingStrategyId === row.strategy.id"
          @adopt="adopt"
          @abandon="abandon"
        />
      </ul>
    </AppPanel>
  </section>
</template>

<style scoped lang="scss">
.strategy-marketplace-panel {
  &__note {
    margin: 0 0 spacing('sm');
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__search {
    display: flex;
    align-items: center;
    gap: spacing('xs');
    margin-bottom: spacing('sm');
  }

  &__search-label {
    color: color('text-faint');
    font-size: font-size('2xs');
    white-space: nowrap;
  }

  &__placeholder {
    padding: spacing('lg') 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__list {
    display: grid;
    gap: spacing('sm');
    margin: 0;
    padding: 0;
    list-style: none;

    // 一列一張時每一張都很寬，讀起來像一份表格；兩欄起就看得出它們是一組可以挑的東西。
    @media (width >= 60rem) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
