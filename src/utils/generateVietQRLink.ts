export function generateVietQRLink({
  bankCode,
  accountNumber,
  amount,
  addInfo,
}: {
  bankCode: string
  accountNumber: string
  amount: number
  addInfo: string
}): string {
  const baseUrl = 'https://img.vietqr.io/image'
  const encodedInfo = encodeURIComponent(addInfo.trim())

  return `${baseUrl}/${bankCode}-${accountNumber}-qr_only.png?amount=${amount}&addInfo=${encodedInfo}`
}
