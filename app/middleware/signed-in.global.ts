import { LOGIN_PATH, HOME_PATH } from '~/composables/use-user-session'

/**
 * 把關：沒登入就只看得到登入畫面。
 *
 * 它是全域中介層而不是每一頁自己判斷，因為一頁忘了寫就是一個洞，而洞不會有人發現。
 *
 * **只在瀏覽器端跑。** 伺服器算頁面時碰不到瀏覽器的儲存，在那裡判斷必然得到
 * 「一律沒登入」，於是每一次載入都會先閃一下登入畫面再跳回來。代價是伺服器算出來的
 * 頁面不受這道門保護——這台操作台在本機跑、沒有對外的 SSR 需求，接受。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const { currentUser, ensureSessionRestored, rememberRedirectTo } = useUserSession()

  await ensureSessionRestored()

  const signedIn = currentUser.value !== null

  if (!signedIn && to.path !== LOGIN_PATH) {
    // 記下他本來要去哪，好在登入成功後把他放回那裡，而不是一律丟到首頁。
    rememberRedirectTo(to.fullPath)

    return navigateTo(LOGIN_PATH)
  }

  // 已經進門的人不必再看一次門。
  if (signedIn && to.path === LOGIN_PATH) {
    return navigateTo(HOME_PATH)
  }
})
