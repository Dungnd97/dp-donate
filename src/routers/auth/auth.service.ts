import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as HttpRequest from '../../common/interservice/request.interservice'

@Injectable()
export class AuthService {
  private authServiceUrl = process.env.AUTH_SERVICE_URL

  // async validateToken(token: string): Promise<any> {
  //   try {
  //     const res = await HttpRequest.post(`${this.authServiceUrl}`, {
  //       token,
  //     })
  //     return res.data
  //   } catch (err) {
  //     throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn')
  //   }
  // }
}
