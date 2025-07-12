interface QRContentOptions {
  bankBin: string // Mã BIN ngân hàng (6 số)
  accountNumber: string // Số tài khoản
  accountName: string // Tên chủ tài khoản (viết hoa không dấu)
  amount?: number // Số tiền (optional)
  addInfo: string // Nội dung chuyển khoản
}

export function generateQRContent(options: QRContentOptions): string {
  const { bankBin, accountNumber, accountName, amount, addInfo } = options

  // Chuẩn hóa dữ liệu
  const formattedAccountName = accountName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '') // Loại bỏ ký tự đặc biệt

  const formattedAddInfo = addInfo.replace(/[^a-zA-Z0-9\-_]/g, '') // Giữ chỉ các ký tự an toàn

  // Xây dựng các trường thông tin
  const fields = [
    { id: '00', value: '01' }, // Phiên bản
    { id: '01', value: '11' }, // Dữ liệu tĩnh
    { id: '26', value: buildAccountInfo(bankBin, accountNumber) }, // Thông tin tài khoản
    { id: '52', value: '0000' }, // Mã ngành
    { id: '53', value: '704' }, // Mã tiền tệ (VND)
    ...(amount ? [{ id: '54', value: amount.toFixed(0) }] : []), // Số tiền
    { id: '58', value: 'VN' }, // Mã quốc gia
    { id: '59', value: formattedAccountName }, // Tên người thụ hưởng
    { id: '60', value: 'HANOI' }, // Thành phố (nên có giá trị)
    { id: '62', value: buildAdditionalData(formattedAddInfo) }, // Thông tin bổ sung
  ]

  // Tạo payload (chưa có CRC)
  let payload = fields
    .map((field) => `${field.id}${String(field.value.length).padStart(2, '0')}${field.value}`)
    .join('')

  // Tính CRC và thêm vào cuối
  const crc = calculateCRC(payload + '6304')
  payload += `6304${crc}`

  return payload
}

function buildAccountInfo(bankBin: string, accountNumber: string): string {
  const fields = [
    { id: '00', value: 'A000000727' }, // GUID cố định cho VietQR
    { id: '01', value: bankBin },
    { id: '02', value: accountNumber },
  ]

  return fields.map((field) => `${field.id}${String(field.value.length).padStart(2, '0')}${field.value}`).join('')
}

function buildAdditionalData(addInfo: string): string {
  const fields = [
    { id: '08', value: addInfo }, // Nội dung chuyển tiền
  ]

  const additionalData = fields
    .map((field) => `${field.id}${String(field.value.length).padStart(2, '0')}${field.value}`)
    .join('')
  return additionalData
}

function calculateCRC(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}
