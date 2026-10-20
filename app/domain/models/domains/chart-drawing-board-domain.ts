import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDomain } from '~/domain/models/domains/chart-drawing-domain'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'

/** 上一步最多記這麼多步，再多就丟掉最舊的那一步。 */
export const CHART_DRAWING_HISTORY_LIMIT = 100

type DrawingSnapshot = readonly ChartDrawingDomain[]

/**
 * Domain Model：畫面上的一檔繪圖板。
 *
 * 它記著帳號那一份、目前的繪圖，以及上一步、下一步各自要回到的那一份。
 * 每一步存**整份繪圖**的快照；做了一件其實什麼都沒改的事時交回自己，那不算一步。
 *
 * 還沒存進帳號的新繪圖用負的暫時編號，存回之後換成帳號發的。
 */
export class ChartDrawingBoardDomain {
  constructor(
    private readonly savedBoard: ChartDrawingBoard,
    private readonly drawings: DrawingSnapshot,
    private readonly undoSnapshots: readonly DrawingSnapshot[],
    private readonly redoSnapshots: readonly DrawingSnapshot[],
    private readonly renumberedDrawingIds: ReadonlyMap<number, number> = new Map(),
  ) {}

  added(drawing: ChartDrawingDomain): ChartDrawingBoardDomain {
    const temporaryId = Math.min(0, ...this.drawings.map(existing => existing.id)) - 1

    return this.steppedTo([...this.drawings, drawing.numbered(temporaryId)])
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
      this.savedBoard, previous, this.undoSnapshots.slice(0, -1), [...this.redoSnapshots, this.drawings])
  }

  redone(): ChartDrawingBoardDomain {
    const next = this.redoSnapshots.at(-1)
    if (next === undefined) {
      return this
    }

    return new ChartDrawingBoardDomain(
      this.savedBoard, next, [...this.undoSnapshots, this.drawings], this.redoSnapshots.slice(0, -1))
  }

  /** 目前的繪圖與帳號那一份不一樣：順序、數量或任何一個繪圖不同都算。 */
  hasUnsavedChanges(): boolean {
    const savedDrawings = this.savedBoard.drawings.map(drawing => drawing.toDomain())

    return savedDrawings.length !== this.drawings.length
      || this.drawings.some((drawing, index) => {
        const savedDrawing = savedDrawings[index]

        return savedDrawing === undefined || !drawing.sameAs(savedDrawing)
      })
  }

  /** 要存回帳號的那一份：根據帳號那一份的版本、目前的繪圖。 */
  toSaveRequest(): ChartDrawingBoard {
    return new ChartDrawingBoard(
      this.savedBoard.marketSide, this.savedBoard.symbol, this.savedBoard.revision,
      this.drawings.map(drawing => drawing.toEntity()))
  }

  /**
   * `sent` 那一份存進了帳號，成了 `saved`。帳號依序回覆，所以送出的第幾個就是存回的第幾個：
   * 目前、上一步、下一步裡同編號的繪圖，都換成帳號發的編號與帳號記的來源。
   * 數量對不上時不猜，整份改用帳號那一份。
   */
  acknowledged(sent: readonly ChartDrawingDomain[], saved: ChartDrawingBoard): ChartDrawingBoardDomain {
    const savedDrawings = saved.drawings.map(drawing => drawing.toDomain())
    if (savedDrawings.length !== sent.length) {
      return new ChartDrawingBoardDomain(saved, savedDrawings, [], [])
    }

    const savedBySentId = new Map(sent.map((drawing, index) => [drawing.id, savedDrawings[index]!]))
    const identified = (snapshot: DrawingSnapshot): DrawingSnapshot => snapshot.map((drawing) => {
      const savedDrawing = savedBySentId.get(drawing.id)

      return savedDrawing === undefined ? drawing : drawing.withSavedIdentityOf(savedDrawing)
    })
    const renumbered = new Map([...savedBySentId]
      .filter(([sentId, savedDrawing]) => sentId !== savedDrawing.id)
      .map(([sentId, savedDrawing]) => [sentId, savedDrawing.id]))

    return new ChartDrawingBoardDomain(
      saved, identified(this.drawings), this.undoSnapshots.map(identified), this.redoSnapshots.map(identified),
      renumbered)
  }

  /**
   * 接上帳號裡較新的一份（別處改過了）。
   *
   * 沒比帳號那一份新就不動。這裡沒有還沒存的改動，就整份換成帳號的；
   * 有的話以繪圖為單位合併：這裡新畫的、改過的以這裡為準，這裡沒動過的以帳號為準，
   * 別處新增的留著，別處刪掉的這裡也刪掉，這裡刪掉的不再出現。
   * 上一步與下一步清空——退回別處改動之前，會刪掉助手剛畫的線或帶回別處刪掉的。
   */
  incorporated(saved: ChartDrawingBoard): ChartDrawingBoardDomain {
    if (saved.revision <= this.savedBoard.revision) {
      return this
    }

    const newerDrawings = saved.drawings.map(drawing => drawing.toDomain())
    if (!this.hasUnsavedChanges()) {
      return new ChartDrawingBoardDomain(saved, newerDrawings, [], [])
    }

    const olderById = new Map(this.savedBoard.drawings.map(drawing => [drawing.id, drawing.toDomain()]))
    const newerById = new Map(newerDrawings.map(drawing => [drawing.id, drawing]))
    const localIds = new Set(this.drawings.map(drawing => drawing.id))

    const kept = this.drawings.flatMap((drawing) => {
      const older = olderById.get(drawing.id)
      if (older === undefined) {
        return [drawing]
      }
      const newer = newerById.get(drawing.id)
      if (newer === undefined) {
        return []
      }

      return [drawing.sameAs(older) ? newer : drawing.withSavedIdentityOf(newer)]
    })
    const addedElsewhere = newerDrawings.filter(drawing => !olderById.has(drawing.id) && !localIds.has(drawing.id))

    return new ChartDrawingBoardDomain(saved, [...kept, ...addedElsewhere], [], [])
  }

  currentDrawings(): DrawingSnapshot {
    return this.drawings
  }

  toDto(): ChartDrawingBoardDto {
    const snapshotDtos = (snapshot: DrawingSnapshot) => snapshot.map(drawing => drawing.toDto())

    return new ChartDrawingBoardDto(
      this.savedBoard.toDto(),
      snapshotDtos(this.drawings),
      this.undoSnapshots.map(snapshotDtos),
      this.redoSnapshots.map(snapshotDtos),
      this.hasUnsavedChanges(),
      this.drawings.filter(drawing => drawing.drawnByAssistant).length,
      this.renumberedDrawingIds,
    )
  }

  /** 走一步：目前這一份進上一步、下一步清空。 */
  private steppedTo(drawings: DrawingSnapshot): ChartDrawingBoardDomain {
    return new ChartDrawingBoardDomain(
      this.savedBoard, drawings, [...this.undoSnapshots, this.drawings].slice(-CHART_DRAWING_HISTORY_LIMIT), [])
  }
}
