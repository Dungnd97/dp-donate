import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

export class GetTransInfoDisplayDto {
  @ApiProperty({ example: 'b4c052f3-94c3-4873-9817-c29f220fce9a' })
  @Expose({ name: 'id' })
  id: string

  @ApiProperty({ example: 'Ủng hộ' })
  @Expose({ name: 'title' })
  title: string

  @ApiProperty({ example: 'Ủng hộ' })
  @Expose({ name: 'content' })
  content: string

  @ApiProperty({ example: 10000 })
  @Expose({ name: 'amount' })
  amount: number

  @ApiProperty({ example: 'template/free/TemplateFree_1.m4a' })
  @Expose({ name: 'path_url_music' })
  pathUrlMusic: string

  @ApiProperty({ example: 'template/free/TemplateFree_1.png' })
  @Expose({ name: 'path_url_icon' })
  pathUrlIcon: string
}
