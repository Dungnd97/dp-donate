import { Controller, Post, Body, Req, UseGuards, UnauthorizedException, HttpCode, Get, Param } from '@nestjs/common'
import { InterServiceAuthGuard } from '../auth/auth.guard'
import { DonateService } from './donate.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CreateTransDto } from './dto/create-trans.dto'
import { GetTransInfoDisplayDto } from './dto/get-tran-display.dto'
import { plainToInstance } from 'class-transformer'
import { GetTotalAmountUser } from './dto/get-total-amount-user'
@ApiTags('Donate')
@Controller('')
export class DonateController {
  constructor(private readonly donateService: DonateService) {}

  @UseGuards(InterServiceAuthGuard)
  @ApiOperation({ summary: 'Lấy dữ liệu thông tin người dùng sau khi đăng nhập thành công' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @ApiBody({ type: CreateTransDto })
  @ApiBearerAuth('jwt')
  @Post('create-trans')
  @HttpCode(200)
  async createTrans(@Body() dto: CreateTransDto, @Req() req: any) {
    try {
      const { title, content, amount, slugLink } = dto
      const result = await this.donateService.createTransDonate(title, content, amount, slugLink, req.user)
      return responseObject(result.status, result.message, result.actionScreen)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

  @ApiOperation({ summary: 'Lấy thông tin giao dịch donate để hiển thị (DISPLAY)' })
  @ApiParam({ name: 'id', required: true, description: 'ID giao dịch' })
  @ApiOkResponse({
    description: 'Thông tin giao dịch donate được hiển thị',
    type: GetTransInfoDisplayDto,
  })
  @Get('get-tran-donate-display/:id')
  @HttpCode(200)
  async getTranDonateDisplay(@Param('id') id: string) {
    const result = await this.donateService.getTranDonateDisplay(id)

    const transformed = plainToInstance(GetTransInfoDisplayDto, result, {
      excludeExtraneousValues: true,
    })

    return responseObject(1, 'Thành công', null, transformed)
  }

  @UseGuards(InterServiceAuthGuard)
  @ApiOperation({ summary: 'Lấy số dư hiện tại của user' })
  @ApiParam({ name: 'sys_user_id', required: true, description: 'ID hệ thống người dùng' })
  @ApiOkResponse({
    description: 'Trả về số dư hiện tại hoặc tạo user nếu chưa tồn tại',
    type: GetTotalAmountUser,
  })
  @ApiBearerAuth('jwt')
  @Get('get-total-amount-user')
  @HttpCode(200)
  async getUserBalance(@Req() req: any) {
    const user = req.user
    const sys_user_id: string = user?.id

    const result = await this.donateService.getTotalAmountByUser(sys_user_id)
    console.log(result)
    const transformed = plainToInstance(GetTotalAmountUser, result, {
      excludeExtraneousValues: true,
    })

    return {
      status: 1,
      message: null,
      actionScreen: null,
      result: transformed,
    }
  }
}
