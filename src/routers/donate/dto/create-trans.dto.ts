import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator'

export class CreateTransDto {
  @ApiPropertyOptional({ example: 'Ngọc Dũng' })
  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiPropertyOptional({ example: 'Ủng hộ' })
  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiPropertyOptional({ example: 'DungKidzToxic' })
  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  slugLink: string

  @ApiPropertyOptional({ example: 10000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number
}
