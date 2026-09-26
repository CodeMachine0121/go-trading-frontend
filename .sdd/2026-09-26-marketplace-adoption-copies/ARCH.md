# 加入市集的策略腳本，是拿到一份自己的副本（畫面） — Architecture Design

**Status:** Confirmed · **Source PRD:** `PRD.md`

## 1. Design Goal & Guiding Principle
採用來的那一組仍以 `PublishedStrategyScript`（沒有算式的型別）承載——型別層級保證副本進不了編輯器；
只換掉資料來源（副本）與它說的話。市集卡的狀態從三種（自己的／已加入／可加入）縮成兩種。

## 2. Change Scope
| Area | Action | What / Why |
| :--- | :--- | :--- |
| `StrategyScriptProxy.listAvailableStrategyScripts` | **Modify** | `adopted` 的 wire 改成副本的形狀（與自己的策略腳本同形）；轉成 `PublishedStrategyScript`，分享者留空、時刻取副本建立時刻 |
| `IStrategyScriptMarketplaceProxy` / 實作 / service / application | **Modify** | 移除 `abandonStrategyScript` |
| `MarketplaceListingDomain` / `MarketplaceListingRowDto` | **Modify** | 不再算「已加入」 |
| `MarketplaceStrategyScriptCard` / `StrategyScriptMarketplacePanel` | **Modify** | 拿掉已加入與取消加入；加入成功的說法 |
| `useStrategyScriptLibrary.abandonStrategyScript` | **Modify** | 改走刪除策略腳本 |
| `StrategyScriptLibraryList` / `StrategyScriptLibraryDialog` | **Modify** | 採用來的標示「從市集加入」；移除的確認文案 |

## 3. Traceability
| Scenario | Fulfilled by |
| :--- | :--- |
| US-01 | `MarketplaceListingDomain` + `MarketplaceStrategyScriptCard` + panel |
| US-02 | proxy 轉換 + `StrategyScriptLibraryList` + library composable |
