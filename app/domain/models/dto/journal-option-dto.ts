import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class JournalOptionDto {
  constructor(
    public readonly value: string,
    public readonly label: LocalizedTextVo,
  ) {}
}
