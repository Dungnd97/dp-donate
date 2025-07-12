import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createTcpClient } from './tcp-client.provider'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AUTH_SERVICE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('AUTH_SERVICE_HOST', 'localhost')
        const port = configService.get<number>('AUTH_SERVICE_PORT', 8000)
        return createTcpClient(host, port)
      },
    },
  ],
  exports: ['AUTH_SERVICE'],
})
export class ClientProxyModule {}
