export function extractDateFields(inputDate: string | Date) {
  const date = new Date(inputDate)

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }

  const yearDate = date.getFullYear() // yyyy
  const monthDate = String(date.getMonth() + 1).padStart(2, '0') // mm
  const dayDate = String(date.getDate()).padStart(2, '0') // dd

  const day = parseInt(`${yearDate}${monthDate}${dayDate}`) // yyyymmdd
  const month = parseInt(`${yearDate}${monthDate}`) // yyyymm
  const year = yearDate // yyyy

  return {
    day,
    month,
    year,
  }
}
