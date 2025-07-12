import { Inject, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'
import { PostgresService } from '../../database/postgres.service'
import { v4 as uuidv4 } from 'uuid'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { extractDateFields } from '../../utils/extractDateFields'
import { formatVietnameseCurrency } from '../../utils/formatCurrency'
@Injectable()
export class DonateService {
  private readonly logger = new Logger(DonateService.name)

  private returnMessage = (status: number, message: string, actionScreen?: string, data?: any) => ({
    status,
    message,
    actionScreen,
    data,
  })

  constructor(
    private readonly postgresService: PostgresService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}
  //I. Thêm mới Giao dịch ủng hộ
  async createTransDonate(
    title: string,
    content: string,
    amount: number,
    slugLink: string,
    userInfo: any,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {
    try {
      if (!userInfo || !userInfo.id) {
        throw new UnauthorizedException('Không tìm thấy thông tin người dùng')
      }

      const infoStreamer = await firstValueFrom(this.authClient.send('get-info-streamer', { amount, slugLink }))

      if (!infoStreamer) {
        return this.returnMessage(0, 'Không tồn tại streamer mà bạn ủng hộ. Vui lòng thử lại sau')
      }

      if (infoStreamer.sysUserId === userInfo.id) {
        return this.returnMessage(0, 'Bạn không thể ủng hộ chính mình. Vui lòng ủng hộ cho 1 streamer khác.')
      }

      const amountCommissionDonate = Math.round(amount * infoStreamer.commissionDonate) //Tiền hoa hồng
      const netAmountToStreamer = amount - amountCommissionDonate //Tiền streamer nhận được

      const transId = uuidv4()
      const historyIdFrom = uuidv4()
      const historyIdTo = uuidv4()
      const historyIdCommission = uuidv4()
      const { day, month, year } = extractDateFields(new Date())

      await this.postgresService.executeInTransaction([], async (client) => {
        // ✅ 1. SELECT FOR UPDATE người ủng hộ để kiểm tra số dư
        const donateUser = await client.query<{ total_amount: number }>(
          `SELECT total_amount FROM dp_trans_user_total_amount WHERE sys_user_id = $1 FOR UPDATE`,
          [userInfo.id],
        )

        if (donateUser.rowCount === 0) {
          throw new Error('NOT_USER')
        }

        const currentAmountDonateUser = Number(donateUser.rows[0].total_amount)
        console.log(currentAmountDonateUser) //tiền đang có của người ủng hộ
        console.log(currentAmountDonateUser < amount)
        if (currentAmountDonateUser < amount) {
          throw new Error('NOT_AMOUNT')
        }

        // ✅ 2. Trừ tiền người ủng hộ
        await client.query(
          `UPDATE dp_trans_user_total_amount SET total_amount = total_amount - $1, updated_at = NOW()  WHERE sys_user_id = $2`,
          [amount, userInfo.id],
        )

        // ✅ 3. Cộng tiền cho streamer
        await client.query(
          `UPDATE dp_trans_user_total_amount SET total_amount = total_amount + $1, updated_at = NOW()  WHERE sys_user_id = $2`,
          [netAmountToStreamer, infoStreamer.sysUserId],
        )

        // ✅ 4. Cộng tiền cho admin
        await client.query(
          `UPDATE dp_trans_user_total_amount SET total_amount = total_amount + $1, updated_at = NOW()  WHERE sys_user_id = $2`,
          [amountCommissionDonate, 'ADMIN'],
        )

        // ✅ 5. Ghi bản ghi giao dịch chính
        await client.query(
          `
        INSERT INTO dp_trans_donate (
          id, title, content, amount, user_id_from, user_id_to,
          type, status, path_url_music, path_url_icon, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          'DONATE', 'NEW', $7, $8, NOW(), NOW()
        )
        `,
          [
            transId,
            title,
            content,
            amount,
            userInfo.id,
            infoStreamer.sysUserId,
            infoStreamer.pathUrlMusic,
            infoStreamer.pathUrlIcon,
          ],
        )
        // ✅ 6. Ghi lịch sử giao dịch
        await client.query(
          `
        INSERT INTO dp_trans_history_amount 
          (id, created_at, updated_at, dp_trans_id, created_day, created_month, created_year, sys_user_id, amount, source)
        VALUES 
          ($1, now(), now(), $4, $5, $6, $7, $8, $9, 'DONATE_FROM'),
          ($2, now(), now(), $4, $5, $6, $7, $10, $11, 'DONATE_TO'),
          ($3, now(), now(), $4, $5, $6, $7, $12, $13, 'DONATE_COMMISSION')
        `,
          [
            historyIdFrom,
            historyIdTo,
            historyIdCommission,
            transId,
            day,
            month,
            year,
            userInfo.id,
            -amount,
            infoStreamer.sysUserId,
            netAmountToStreamer,
            'ADMIN',
            amountCommissionDonate,
          ],
        )
      })
      return this.returnMessage(1, 'Ủng hộ thành công')
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_AMOUNT') {
        return this.returnMessage(
          0,
          'Bạn không đủ tiền để ủng hộ. Vui lòng nạp thêm để thực hiện donate đến Streamer mà bạn yêu quý !!!',
        )
      } else {
        this.logger.error('Ủng hộ không thành công', error.stack)
        throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
      }
    }
  }

  //II. Lấy dữ liệu 1 donate chưa gửi
  async getTranDonateDisplay(id: string): Promise<{ result: any }> {
    try {
      const [result] = await this.postgresService.execute<{
        id: string
        title: string
        content: string
        amount: number
        status: string
        path_url_music: string
        path_url_icon: string
      }>(
        `
        WITH updated AS (
          SELECT id
          FROM dp_trans_donate
          WHERE user_id_to = $1 AND status = $2
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
        )
        UPDATE dp_trans_donate
        SET status = $3, updated_at = NOW()
        FROM updated
        WHERE dp_trans_donate.id = updated.id
        RETURNING dp_trans_donate.id, title, content, amount, status, path_url_music, path_url_icon
        `,
        [id, 'NEW', 'DISPLAY'],
      )
      return result
    } catch (error) {
      this.logger.error('Lấy dữ liệu không thành công', error.stack)
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }

  //III. Tra cứu số tiền hiện tại khi tạo user
  async getTotalAmountByUser(sys_user_id: string): Promise<{
    sys_user_id: string
    total_amount: number
    total_amount_text: string
  }> {
    try {
      const [user] = await this.postgresService.execute<{ id: string; total_amount: number }>(
        'SELECT sys_user_id, total_amount FROM dp_trans_user_total_amount WHERE sys_user_id = $1',
        [sys_user_id],
      )

      let total_amount = 0

      if (!user) {
        await this.postgresService.execute(
          `
        INSERT INTO dp_trans_user_total_amount (sys_user_id, total_amount, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        `,
          [sys_user_id, 0],
        )
        this.logger.log(`Đã tạo user mới với sys_user_id: ${sys_user_id}`)
      } else {
        total_amount = user.total_amount
        this.logger.debug(`User với sys_user_id ${sys_user_id} đã tồn tại`)
      }
      console.log(formatVietnameseCurrency(total_amount))
      return { sys_user_id, total_amount, total_amount_text: formatVietnameseCurrency(total_amount) }
    } catch (error) {
      this.logger.error('Khởi tạo tiền cho user không thành công', error.stack)
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }
}
