# 前端是一包靜態檔,所以最後跑的東西只是一台 nginx。沒有 Node、沒有 SSR、
# 沒有 serverless function——這個專案沒有 server/ 目錄,也沒有任何在伺服器端
# 發生的資料抓取,每一次呼叫都在瀏覽器裡。

FROM oven/bun:1-alpine AS builder

WORKDIR /src

# 先只複製依賴清單,改前端程式碼不會讓安裝那一層失效。
COPY package.json bun.lock ./
# --frozen-lockfile:lockfile 與 package.json 對不起來就失敗,而不是安靜地
# 裝一個別的版本然後照樣建成功。
# --ignore-scripts:postinstall 的 `nuxt prepare` 這時候還沒有原始碼可以看,
# 而 prepare 的 husky 在沒有 .git 的環境裡會失敗。下面複製完再補跑。
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bunx nuxt prepare

# 後端網址在這裡**烤進 bundle**,不是執行時讀的。
#
# 它是 Nuxt 的 public runtime config,靜態輸出時會被直接寫進 JS。所以這個
# 映像檔是綁定環境的:換後端網址要重新 build,改 ConfigMap 重啟沒有用。
#
# 這是自架前端跟另外兩個服務唯一不同的地方,值得記住。
ARG NUXT_PUBLIC_BACKEND_BASE_URL=https://trading-api.coding-afternoon.com
ENV NUXT_PUBLIC_BACKEND_BASE_URL=${NUXT_PUBLIC_BACKEND_BASE_URL}

RUN bun run generate

# nginx-unprivileged 而不是官方的 nginx:官方那份預設用 root 啟動再降權,
# 在 k8s 裡跑不了唯讀或非 root 的設定。這一份本來就是非 root,聽 8080。
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /src/.output/public /usr/share/nginx/html

EXPOSE 8080

# 給 `docker run` 用的。Kubernetes 會用自己的探針,不看這一行。
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/health || exit 1
