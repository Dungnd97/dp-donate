import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class InterServiceAuthGuard implements CanActivate {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader: string = request.headers['authorization']

    if (!authHeader) {
      throw new UnauthorizedException('Thiếu Authorization header')
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')

    try {
      const user = await firstValueFrom(this.authClient.send('validate-token', { token }))

      // Gán user vào request để controller có thể dùng
      request.user = user
      return true
    } catch (err) {
      console.log(err)
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn')
    }
  }
}
