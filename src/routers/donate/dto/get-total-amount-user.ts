import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

export class GetTotalAmountUser {
  @ApiProperty({ example: '0000d53a-d995-4ff4-8366-6d49115dff44' })
  @Expose({ name: 'sys_user_id' })
  id: string

  @ApiProperty({ example: 'Ủng hộ' })
  @Expose({ name: 'total_amount' })
  totalAmount: number

  @ApiProperty({ example: 'Ủng hộ' })
  @Expose({ name: 'total_amount_text' })
  totalAmountText: string
}
