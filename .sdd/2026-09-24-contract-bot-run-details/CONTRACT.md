# Contract Conformance — 合約機器人執行紀錄的方向與倍數

**Contract:** `PRD.md` (Acceptance Criteria as oracle) · **Design map:** `ARCH.md` · **Glossary:** `UL-MAP.md`
**Ceiling:** static conformance audit — test assertions and code paths judged against the spec's expected outcome; no invented scenarios executed.

## Clauses

| ID | Clause | Oracle (from spec) | Implementation | Test | Test audit | Code audit | Status |
|---|---|---|---|---|---|---|---|
| AC-1 | 做空那一輪寫出方向、倍數、保證金、名目與出場價 | 那一列寫「做空 5 倍 · 保證金 1000 · 名目 5000 · 停損 102 · 停利 96」 | `strategy-bot-proxy.ts` listRunRecords → `strategy-bot-run-suggestion-domain.ts` toText → `StrategyBotRunHistory.vue` | domain spec「做空、5 倍、帶出場價」; component「建議過的那一輪把那一句照畫出來」; proxy「合約那一輪讀得出方向、槓桿與名目」 | asserts-oracle | produces-oracle | ✅ |
| AC-2 | 沒設止損止盈的做多那一輪 | 寫「做多 1 倍 · 保證金 1000 · 名目 1000」，沒有停損停利 | toText (exit parts only when present) | domain spec「做多、1 倍、沒設出場價」 | asserts-oracle | produces-oracle | ✅ |
| AC-3 | 現貨那一輪不變 | 寫「押 5000 · 停損 62255.085」，與今天一字不差 | toText spot branch | domain spec「只建議過停損的那一輪…一字不差」; proxy「現貨那一輪沒有方向、槓桿與名目」 | asserts-oracle | produces-oracle | ✅ |
| AC-4 | 交易所不收的那一輪 | 沒有建議部位那一段 | toText returns null without stake; component `v-if` | domain spec「交易所不收的那一輪…整段不寫」; component「沒有建議的那一輪一個字都不加」 | asserts-oracle | produces-oracle | ✅ |
| AC-5 | 認不得的方向不猜 | 寫「5 倍 · 保證金 1000 · 名目 5000」，不寫方向 | `DIRECTION_WORDS` lookup | domain spec「認不得的方向不猜，其餘照寫」 | asserts-oracle | produces-oracle | ✅ |
| BR-1 | 方向、槓桿、名目任一即合約寫法 | 只記得方向 →「做多 · 保證金 1000」；只記得名目 →「保證金 1000 · 名目 5000」 | toText `isContractRound` | domain spec「只記得方向時…」「方向與倍數都說不出時…」 | asserts-oracle | produces-oracle | ✅ |
| BR-2 | 三樣都沒有即現貨寫法 | 「押 X · 停損 … · 停利 …」 | toText spot branch | domain spec 現貨 describe | asserts-oracle | produces-oracle | ✅ |
| BR-3 | 金額照系統記下的數字原樣寫出 | 一個有十八位小數的名目在那一句裡一字不差 | proxy `new Decimal(wire)` → `toString()` | proxy spec keeps the digits; **no test carries them into the sentence** | shallow | produces-oracle | 🟠 |
| EDGE-1 | 沒有開倉金額的那一輪不畫建議部位 | 沒有那一段 | toText null | domain「沒有建議的那一輪整段不寫」 | asserts-oracle | produces-oracle | ✅ |
| NFR-1 | 後端還沒記這三樣的舊紀錄照舊顯示 | 沒有三個欄位的紀錄照現貨寫法 | proxy `?? null` + spot branch | proxy「現貨那一輪沒有…」; domain spot | asserts-oracle | produces-oracle | ✅ |

## Orphans

| Behavior | Site | Classification |
|---|---|---|
| — | — | none |

## Summary

✅ 9 conforms · 🔴 0 violations · 🟠 1 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 0 orphans — Conformance 90%.

## Follow-up

| ID | Finding | Resolution |
|---|---|---|
| BR-3 | No test carried a many-digit amount into the sentence | Added「金額照記下的數字原樣寫出，一位小數都不少」(suggestion domain spec): margin `1000.000000000000000001` and notional `5000.123456789012345678` appear verbatim. → conforms |

After follow-up: 10 / 10 clauses conform; 0 orphans.
