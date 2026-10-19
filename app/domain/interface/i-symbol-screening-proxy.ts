import type { SymbolScreeningProfile } from '~/domain/models/entities/symbol-screening-profile'
import type { SymbolScreeningRun } from '~/domain/models/entities/symbol-screening-run'
import type { SymbolScreeningRunDetail } from '~/domain/models/entities/symbol-screening-run-detail'
import type { SymbolScreeningProfileWriteDomain } from '~/domain/models/domains/symbol-screening-profile-write-domain'
import type { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'

export interface ISymbolScreeningProxy {
  listProfiles(): Promise<SymbolScreeningProfile[]>
  saveProfile(writeDomain: SymbolScreeningProfileWriteDomain): Promise<SymbolScreeningProfile>
  deleteProfile(id: number): Promise<void>
  submitRun(submissionDto: SymbolScreeningRunSubmissionDto): Promise<SymbolScreeningRun>
  listRuns(inBackground: boolean): Promise<SymbolScreeningRun[]>
  getRun(id: number, inBackground: boolean): Promise<SymbolScreeningRunDetail>
  cancelRun(id: number): Promise<SymbolScreeningRun>
}
