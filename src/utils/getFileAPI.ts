import dotenv from 'dotenv'
dotenv.config()

const { telegramBotToken } = process.env

export const getFileAPI = (fileId: string): string =>
  `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileId}`
