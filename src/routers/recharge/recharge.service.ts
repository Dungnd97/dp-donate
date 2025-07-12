import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { PostgresService } from '../../database/postgres.service'
import { generateVietQRLink } from '../../utils/generateVietQRLink'
import { v4 as uuidv4 } from 'uuid'
import { normalizeUUID } from '../../utils/customUUID'
import { formatToVietnamTime } from '../../utils/date'
import { extractDateFields } from '../../utils/extractDateFields'

@Injectable()
export class RechargeService {
  private readonly logger = new Logger(RechargeService.name)

  constructor(private readonly postgresService: PostgresService) {}

  private returnMessage = (status: number, message: string, actionScreen?: string) => ({
    status,
    message,
    actionScreen,
  })

  async createTransRecharge(amount: number, userInfo: any): Promise<{ qrLink: string; expireAt: string }> {
    if (!userInfo || !userInfo.id) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng')
    }

    const transId = normalizeUUID(uuidv4())
    const expireInMinutes = process.env.EXPIRE_IN_MINUTES
    const bankCode = process.env.BANK_CODE
    const accountNumber = process.env.ACCOUNT_NUMBER

    if (!expireInMinutes || !bankCode || !accountNumber) {
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
    const qrLink = generateVietQRLink({
      bankCode,
      accountNumber,
      amount,
      addInfo: `ID+${transId}`,
    })
    try {
      const resultSet = await this.postgresService.executeInTransaction<{
        id: string
        content_qr: string
        expire_at: string
      }>([
        {
          sql: `
            INSERT INTO dp_trans_recharge (id, created_at, updated_at, expire_at, sys_user_id, amount, content_qr, status)
            VALUES ($1, NOW(), NOW(), NOW() + $2 * INTERVAL '1 minute', $3, $4, $5, $6)
            RETURNING id, content_qr, expire_at
          `,
          params: [transId, expireInMinutes, userInfo.id, amount, qrLink, 'NEW'],
          returnResult: true,
        },
      ])
      const result = Array.isArray(resultSet) ? resultSet[0] : resultSet

      return {
        qrLink: result.content_qr,
        expireAt: formatToVietnamTime(result.expire_at),
      }
    } catch (error) {
      this.logger.error(`Không thể tạo QR thành công`, error.stack)
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }

  async updateTransRecharge(id: string, amount: number, transSmsId: string): Promise<{ resultCode: string }> {
    const { day, month, year } = extractDateFields(new Date())

    try {
      await this.postgresService.executeInTransaction([], async (client) => {
        // ✅ 1. SELECT giao dịch
        const resultTransRecharge = await client.query<{
          id: string
          amount: number
          sys_user_id: string
          status: string
        }>(`SELECT id, amount, sys_user_id, status FROM dp_trans_recharge WHERE id = $1 `, [id])

        const dataTransRecharge = resultTransRecharge.rows[0]

        if (!dataTransRecharge) {
          throw new Error('NOT_TRANS')
        }

        if (dataTransRecharge.status !== 'NEW') {
          throw new Error('PROCESSED')
        }

        if (dataTransRecharge.amount !== amount) {
          throw new Error('NOT_MATCH_AMOUNT')
        }

        // ✅ 2. Update trạng thái cho giao dịch
        await client.query(
          `UPDATE dp_trans_recharge SET status =  $1, updated_at = NOW(), dp_trans_sms_id = $3 WHERE id = $2`,
          ['SUCCESS', id, transSmsId],
        )

        // ✅ 3. Cộng tiền cho người nạp
        await client.query(
          `UPDATE dp_trans_user_total_amount SET total_amount = total_amount + $1, updated_at = NOW() WHERE sys_user_id = $2`,
          [dataTransRecharge.amount, dataTransRecharge.sys_user_id],
        )

        // ✅ 4. Ghi lịch sử giao dịch
        await client.query(
          `
          INSERT INTO dp_trans_history_amount 
            (id, created_at, updated_at, dp_trans_id, created_day, created_month, created_year, sys_user_id, amount, source)
          VALUES 
            ($1, NOW(), NOW(), $2, $3, $4, $5, $6, $7, $8)
          `,
          [id, id, day, month, year, dataTransRecharge.sys_user_id, amount, 'RECHARGE'],
        )
      })
      return { resultCode: 'SUCCESS' }
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_TRANS') {
        return { resultCode: 'NOT_TRANS' }
      }
      if (error instanceof Error && error.message === 'PROCESSED') {
        return { resultCode: 'PROCESSED' }
      }
      if (error instanceof Error && error.message === 'NOT_MATCH_AMOUNT') {
        return { resultCode: 'NOT_MATCH_AMOUNT' }
      }

      this.logger.error(`Không thể cập nhật trạng thái thanh toán`, error.stack)
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }
}
