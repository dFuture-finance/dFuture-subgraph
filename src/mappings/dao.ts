import { log, Address, BigInt, Bytes, ethereum, BigDecimal } from '@graphprotocol/graph-ts'
import { ONE_BI, getVoteCastData } from './utils'
import { VoteCastRecord, GovJoinExitRecord } from '../types/schema'
import { VoteCast, GovernorJoin, GovernorExit } from '../types/dFutureDAO/GovernorAlpha'

export function handleVoteCast(event: VoteCast): void {
   let id = event.params.voter.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new VoteCastRecord(id)

   dataRec.voter = event.params.voter
   dataRec.proposalId = event.params.proposalId
   dataRec.support = event.params.support
   dataRec.votes = event.params.votes

   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number

   dataRec.save()

   let recordsCnt = getVoteCastData(dataRec.proposalId)
   recordsCnt.voteCastCnt = recordsCnt.voteCastCnt.plus(ONE_BI)
   recordsCnt.save()
}

export function handleGovernorJoin(event: GovernorJoin): void {
   let id = event.params.voter.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new GovJoinExitRecord(id)

   dataRec.voter = event.params.voter
   dataRec.type  = 1
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number

   dataRec.save()
}

export function handleGovernorExit(event: GovernorExit): void {
   let id = event.params.voter.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new GovJoinExitRecord(id)

   dataRec.voter = event.params.voter
   dataRec.type  = 2
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number

   dataRec.save()
}