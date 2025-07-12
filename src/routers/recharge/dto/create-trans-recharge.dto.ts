import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class CreateTransRechargeDto {
  @ApiPropertyOptional({ example: 10000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number
}
