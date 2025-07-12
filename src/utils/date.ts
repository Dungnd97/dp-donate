import { format, toZonedTime } from 'date-fns-tz'

/**
 * Chuyển chuỗi ISO UTC hoặc Date sang định dạng giờ Việt Nam
 * @param input Chuỗi ISO hoặc Date object
 * @param formatStr Định dạng mong muốn (mặc định: "HH:mm:ss dd/MM/yyyy")
 */
export function formatToVietnamTime(input: unknown, formatStr = 'HH:mm:ss dd/MM/yyyy'): string {
  const timeZone = 'Asia/Ho_Chi_Minh'

  try {
    let date: Date

    if (typeof input === 'string' || input instanceof Date) {
      date = new Date(input)
      if (isNaN(date.getTime())) {
        return ''
      }
    } else {
      return ''
    }

    const zonedDate = toZonedTime(date, timeZone)
    return format(zonedDate, formatStr, { timeZone })
  } catch (error) {
    return ''
  }
}
