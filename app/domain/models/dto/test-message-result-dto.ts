/**
 * DTO：一次試送的結果，以及送不出去時要顯示的那一句話。
 *
 * 句子在這裡就備好，元件不自己翻譯：四種原因四句不同的話，而那四句是規則的一部分——
 * 這顆鍵的全部價值就在於它會說出是哪一格填錯。散在元件裡寫成四個 `v-if`，
 * 遲早會有一種被漏掉，變成一句籠統的「送出失敗」。
 *
 * `failureSentence` 為 null 代表送成功了。
 */
export class TestMessageResultDto {
  constructor(
    public readonly delivered: boolean,
    public readonly failureSentence: string | null,
  ) {}
}
