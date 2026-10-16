import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDomain } from '~/domain/models/domains/chart-drawing-domain'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'

/** 上一步最多記這麼多步，再多就丟掉最舊的那一步。 */
export const CHART_DRAWING_HISTORY_LIMIT = 100

/**
 * Domain Model：一檔的繪圖板。
 *
 * 它記著目前的繪圖，以及上一步、下一步各自要回到的那一份。
 * 每一步都存**整份繪圖**的快照而不是「怎麼反做」：八種繪圖、七種修改，
 * 一一寫出反做的方法是幾十個要一起維護的分支；回到前一份只有一種寫法。
 *
 * 做了一件其實什麼都沒改的事（鎖定的不能動、一個都沒有時按移除所有）時交回自己——
 * 那不算一步，否則上一步會按了沒反應。
 */
export class ChartDrawingBoardDomain {
  constructor(
    private readonly marketSide: MarketSideVo,
    private readonly symbol: string,
    private readonly drawings: readonly ChartDrawingDomain[],
    private readonly undoSnapshots: readonly (readonly ChartDrawingDomain[])[],
    private readonly redoSnapshots: readonly (readonly ChartDrawingDomain[])[],
  ) {}

  /** 收下一個新繪圖，發給它一個這一檔還沒用過的號碼。 */
  added(drawing: ChartDrawingDomain): ChartDrawingBoardDomain {
    const nextId = this.drawings.reduce((highest, existing) => Math.max(highest, existing.id), 0) + 1

    return this.steppedTo([...this.drawings, drawing.numbered(nextId)])
  }

  changed(id: number, command: ChartDrawingCommandDto): ChartDrawingBoardDomain {
    const changedDrawings = this.drawings.map(drawing => drawing.id === id ? drawing.applied(command) : drawing)
    const nothingChanged = changedDrawings.every((drawing, index) => drawing === this.drawings[index])

    return nothingChanged ? this : this.steppedTo(changedDrawings)
  }

  removed(id: number): ChartDrawingBoardDomain {
    const remaining = this.drawings.filter(drawing => drawing.id !== id)

    return remaining.length === this.drawings.length ? this : this.steppedTo(remaining)
  }

  removedAll(): ChartDrawingBoardDomain {
    return this.drawings.length === 0 ? this : this.steppedTo([])
  }

  undone(): ChartDrawingBoardDomain {
    const previous = this.undoSnapshots.at(-1)
    if (previous === undefined) {
      return this
    }

    return new ChartDrawingBoardDomain(
      this.marketSide, this.symbol, previous, this.undoSnapshots.slice(0, -1),
      [...this.redoSnapshots, this.drawings])
  }

  redone(): ChartDrawingBoardDomain {
    const next = this.redoSnapshots.at(-1)
    if (next === undefined) {
      return this
    }

    return new ChartDrawingBoardDomain(
      this.marketSide, this.symbol, next, [...this.undoSnapshots, this.drawings],
      this.redoSnapshots.slice(0, -1))
  }

  /** 目前的繪圖，給留存用。 */
  currentDrawings(): readonly ChartDrawingDomain[] {
    return this.drawings
  }

  toDto(): ChartDrawingBoardDto {
    return new ChartDrawingBoardDto(
      this.marketSide,
      this.symbol,
      this.drawings.map(drawing => drawing.toDto()),
      this.undoSnapshots.map(snapshot => snapshot.map(drawing => drawing.toDto())),
      this.redoSnapshots.map(snapshot => snapshot.map(drawing => drawing.toDto())),
    )
  }

  /** 走一步：目前這一份進上一步、下一步清空。 */
  private steppedTo(drawings: readonly ChartDrawingDomain[]): ChartDrawingBoardDomain {
    return new ChartDrawingBoardDomain(
      this.marketSide, this.symbol, drawings,
      [...this.undoSnapshots, this.drawings].slice(-CHART_DRAWING_HISTORY_LIMIT), [])
  }
}
