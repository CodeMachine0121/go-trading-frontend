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

  // 比對的是**這條路由是哪一條**，不是使用者打進網址列的那串字。
  // 路由器認得 `/Login` 與 `/login/` 都是登入那一頁，卻把原本的拼法原樣留在 path 上——
  // 拿字串直接比，就會出現「登入成功之後又被送回登入畫面」這種讀起來像失敗的結果。
  const goingToLogin = to.matched.some(route => route.path === LOGIN_PATH)

  if (!signedIn && !goingToLogin) {
    // 記下他本來要去哪，好在登入成功後把他放回那裡，而不是一律丟到首頁。
    rememberRedirectTo(to.fullPath)

    return navigateTo(LOGIN_PATH)
  }

  // 已經進門的人不必再看一次門。
  if (signedIn && goingToLogin) {
    return navigateTo(HOME_PATH)
  }
})
