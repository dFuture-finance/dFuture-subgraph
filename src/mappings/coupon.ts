import { log, Address, BigInt, Bytes, ethereum, BigDecimal } from '@graphprotocol/graph-ts'
import { TZ_OFFSET, ZERO_BD, ONE_BI, ZERO_BI, updateTraderRecordsCnt } from './utils'
import { CouponBatchMintedRecord, CouponTransferedRecord, CouponUsedRecord,
         LuckyBoxReceive, LuckyBoxOpen, LuckyBoxSend } from '../types/schema'
import { CouponBatchMinted, CouponTransfered, CouponUsed,
         LuckyBoxMinted, LuckyBoxOpened, LuckyBoxTransfered} from '../types/dFutureNFT/FpCoupon'

export function handleCouponBatchMinted(event: CouponBatchMinted): void {
   let tokenIds = event.params.tokenIds as Array<BigInt>
   let amounts  = event.params.amounts as Array<BigInt>
   let dataes   = event.params.dataes as Array<BigInt>
   let labels   = event.params.labels as Array<Bytes>

   let recordsCnt = updateTraderRecordsCnt(event.params.minter)

   for(var i = 0;i < tokenIds.length; i++) {
    
      let id = event.params.minter.toHex()  + '-' + tokenIds[i].toString() + '-' + event.transaction.hash.toHex()
      let dataRec = new CouponBatchMintedRecord(id)
      dataRec.minter = event.params.minter
      dataRec.to = event.params.to
      dataRec.tokenId = tokenIds[i]
      dataRec.amount = amounts[i]
      dataRec.datae = dataes[i]
      dataRec.label = labels[i].toString()
      dataRec.minthash = event.params.minthash.toHex()
      dataRec.timestamp = event.block.timestamp
      dataRec.blknum = event.block.number
      dataRec.save()

      recordsCnt.couponBatchMintCnt = recordsCnt.couponBatchMintCnt.plus(ONE_BI)
   }
   recordsCnt.save()
}

export function handleCouponTransfered(event: CouponTransfered): void {
   let id = event.params.from.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new CouponTransferedRecord(id)
   dataRec.who = event.params.who
   dataRec.from = event.params.from
   dataRec.to = event.params.to
   dataRec.tokenId = event.params.tokenId
   dataRec.amount = event.params.amount
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number
   dataRec.save()

   let recordsCnt = updateTraderRecordsCnt(event.params.from)
   recordsCnt.couponTransferCnt = recordsCnt.couponTransferCnt.plus(ONE_BI)
   recordsCnt.save()
}

export function handleCouponUsed(event: CouponUsed): void {
   let id = event.params.owner.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new CouponUsedRecord(id)
   dataRec.owner = event.params.owner
   dataRec.tokenId = event.params.tokenId
   dataRec.amount = event.params.amount
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number
   dataRec.save()

   let recordsCnt = updateTraderRecordsCnt(event.params.owner)
   recordsCnt.couponUsedCnt = recordsCnt.couponUsedCnt.plus(ONE_BI)
   recordsCnt.save()
}

export function handleLuckyBoxMinted(event: LuckyBoxMinted): void {
   let id = event.params.to.toHex() + '-' + event.params.boxId.toString() + '-' + event.transaction.hash.toHex()
   let dataRec = new LuckyBoxReceive(id)
   dataRec.who = event.params.to
   dataRec.boxId = event.params.boxId
   dataRec.boxAmount = ONE_BI
   dataRec.reason = event.params.reason
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number
   dataRec.save()

   let recordsCnt = updateTraderRecordsCnt(event.params.to)
   recordsCnt.luckyBoxRecvCnt = recordsCnt.luckyBoxRecvCnt.plus(ONE_BI)
   recordsCnt.save()
}

export function handleLuckyBoxOpened(event: LuckyBoxOpened): void {
   let id = event.params.from.toHex() + '-' + event.transaction.hash.toHex()
   let dataRec = new LuckyBoxOpen(id)
   dataRec.who = event.params.from
   dataRec.boxId = event.params.boxId
   dataRec.mintedCouponId = event.params.mintedCouponId
   dataRec.timestamp = event.block.timestamp
   dataRec.blknum = event.block.number
   dataRec.save()

   let recordsCnt = updateTraderRecordsCnt(event.params.from)
   recordsCnt.luckyBoxOpenCnt = recordsCnt.luckyBoxOpenCnt.plus(ONE_BI)
   recordsCnt.save()
}

export function handleLuckyBoxTransfered(event: LuckyBoxTransfered): void {
   let boxIds = event.params.boxIds as Array<BigInt>
   let amounts  = event.params.boxAmounts as Array<BigInt>

   let recordsCnt = updateTraderRecordsCnt(event.params.from)
   let recordsCntTo = updateTraderRecordsCnt(event.params.to)

   for(var i = 0;i < boxIds.length; i++) {
      // handle transfer from to make send record
      let id = event.params.from.toHex()  + '-' + boxIds[i].toString() + '-' + event.transaction.hash.toHex()
      let dataRec = new LuckyBoxSend(id)
      dataRec.who = event.params.from
      dataRec.to = event.params.to
      dataRec.boxId = boxIds[i]
      dataRec.boxAmount = amounts[i]
      dataRec.timestamp = event.block.timestamp
      dataRec.blknum = event.block.number
      dataRec.save()

      recordsCnt.luckyBoxSendCnt = recordsCnt.luckyBoxSendCnt.plus(ONE_BI)

      // handle tranfer to to make received record
      id = event.params.to.toHex()  + '-' + boxIds[i].toString() + '-' + event.transaction.hash.toHex()
      
      let data = new LuckyBoxReceive(id)
      data.who = event.params.to
      data.boxId = boxIds[i]
      data.boxAmount = amounts[i]
      data.reason = 10
      data.timestamp = event.block.timestamp
      data.blknum = event.block.number
      data.save()

      recordsCntTo.luckyBoxRecvCnt = recordsCntTo.luckyBoxRecvCnt.plus(ONE_BI)
   }
   
   recordsCnt.save()
   recordsCntTo.save()
}