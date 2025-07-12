import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { DonateModule } from './routers/donate/donate.module'
import { AuthService } from './routers/auth/auth.service'
import { AuthModule } from './routers/auth/auth.module'
import { MinioModule } from './minio/minio.module'
import { ClientProxyModule } from './common/clients/client-proxy.module'
import { RechargeModule } from './routers/recharge/recharge.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DonateModule,
    AuthModule,
    MinioModule,
    ClientProxyModule,
    RechargeModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthService],
})
export class AppModule {}
