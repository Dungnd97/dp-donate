import { Body, Controller, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RechargeService } from './recharge.service'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { responseObject } from '../../common/helpers/response.helper'
import { CreateTransRechargeDto } from './dto/create-trans-recharge.dto'
import { InterServiceAuthGuard } from '../auth/auth.guard'
import { MessagePattern } from '@nestjs/microservices'

@ApiTags('Recharge')
@Controller('recharge')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @UseGuards(InterServiceAuthGuard)
  @ApiOperation({ summary: 'Lấy dữ liệu thông tin người dùng sau khi đăng nhập thành công' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @ApiBody({ type: CreateTransRechargeDto })
  @ApiBearerAuth('jwt')
  @Post('create-trans')
  @HttpCode(200)
  async createTransRecharge(@Body() dto: CreateTransRechargeDto, @Req() req: any) {
    try {
      const result = await this.rechargeService.createTransRecharge(dto.amount, req.user)

      return responseObject(1, 'Thành công', null, result)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

  @UseGuards(InterServiceAuthGuard)
  @ApiOperation({ summary: 'Lấy dữ liệu thông tin người dùng sau khi đăng nhập thành công' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @ApiBody({ type: CreateTransRechargeDto })
  @ApiBearerAuth('jwt')
  @Post('update-trans')
  @HttpCode(200)
  async updateTransRecharge(@Body() dto: { id: string; amount: number; transSmsId: string }) {
    try {
      const result = await this.rechargeService.updateTransRecharge(dto.id, dto.amount, dto.transSmsId)
      console.log(result)
      return responseObject(1, 'Thành công', null, result)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

  @MessagePattern('update-trans')
  async handleValidateToken(payload: { id: string; amount: number; transSmsId: string }) {
    return await this.rechargeService.updateTransRecharge(payload.id, payload.amount, payload.transSmsId)
  }
}
