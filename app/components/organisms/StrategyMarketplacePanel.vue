<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import MarketplaceStrategyCard from '~/components/molecules/MarketplaceStrategyCard.vue'
import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyMarketplaceApplication } from '~/application/strategy-marketplace-application'
import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 有機體：市集這一頁的全部。
 *
 * 它認識兩個 application，而那不是巧合：市集回答「外面有什麼」，
 * 而每一張卡要標出「這一支是不是我的」「我收下過了沒」——後兩個問題只有自己的清單答得出來。
 * 交給畫面自己去對照，比多讀一份清單糟：那會變成一段可以悄悄算錯的比對。
 */
const { strategyMarketplaceApplication, strategyApplication } = defineProps<{
  strategyMarketplaceApplication: StrategyMarketplaceApplication
  strategyApplication: StrategyApplication
}>()

const publishedStrategies = ref<PublishedStrategyDto[]>([])
/** 自己的那幾支的識別碼——用來在市集上標出哪幾張是自己分享的。 */
const ownStrategyIds = ref<number[]>([])
/** 已經收下的那幾支的識別碼——決定那顆按鈕是「加入」還是「移除」。 */
const adoptedStrategyIds = ref<number[]>([])

const loading = ref(true)
const unavailable = ref(false)
/** 正在改變加入狀態的那一支。同時只會有一支，因為使用者一次只按得到一顆按鈕。 */
const changingStrategyId = ref<number | null>(null)
const failureMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)

async function reload() {
  try {
    // 兩份一起讀，而不是先讀市集再讀清單：兩者都到手才畫得出正確的按鈕，
    // 分兩次讀只會讓畫面先閃一輪「全部都可以加入」。
    const [outThere, available] = await Promise.all([
      strategyMarketplaceApplication.browseMarketplace(),
      strategyApplication.listAvailableStrategies(),
    ])

    publishedStrategies.value = outThere
    ownStrategyIds.value = available.mine.map(strategy => strategy.id)
    adoptedStrategyIds.value = available.adopted.map(published => published.id)
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
        v-else-if="publishedStrategies.length === 0"
        class="strategy-marketplace-panel__placeholder"
        data-testid="marketplace-empty"
      >
        市集上還沒有任何策略。把自己調好的一支分享出來，別人就看得到它了。
      </p>

      <ul
        v-else
        class="strategy-marketplace-panel__list"
      >
        <MarketplaceStrategyCard
          v-for="strategy in publishedStrategies"
          :key="strategy.id"
          :strategy="strategy"
          :mine="ownStrategyIds.includes(strategy.id)"
          :adopted="adoptedStrategyIds.includes(strategy.id)"
          :busy="changingStrategyId === strategy.id"
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
