import { log, Address, BigInt, Bytes, ethereum, BigDecimal } from '@graphprotocol/graph-ts'
import { TZ_OFFSET, ONE_BI, ZERO_BI, createNftUser, createCouponCount } from './utils'
import { NftUserRec, CouponCount } from '../types/schema'
import { TransferSingle, TransferBatch } from '../types/dFutureERC1155/FpERC1155'

export function handleTransferSingle(event: TransferSingle): void {
   createNftUser(event.params.from)
   createNftUser(event.params.to)

   createCouponCount(event.params.from, event.params.id, event.params.value, false)
   createCouponCount(event.params.to, event.params.id, event.params.value, true)
}

export function handleTransferBatch(event: TransferBatch): void {
   let tokenIds = event.params.ids as Array<BigInt>
   let amounts  = event.params.values as Array<BigInt>
   
   let from = event.params.from
   let to   = event.params.to

   createNftUser(from)
   createNftUser(to)

   for(var i = 0;i < tokenIds.length; i++) {
      createCouponCount(from, tokenIds[i], amounts[i], false)
      createCouponCount(to, tokenIds[i], amounts[i], true)
   }
}



