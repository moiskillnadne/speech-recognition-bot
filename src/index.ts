import dotenv from 'dotenv'
import { Telegraf } from 'telegraf'
import axios from 'axios'

// Utils
import { getFileAPI } from './utils/getFileAPI'

import { googleRecognize } from './service/google.voice'

dotenv.config()

const bot = new Telegraf(process.env.telegramBotToken)

bot.start((ctx) => ctx.reply('Welcome!'))

// Not working
// bot.on('voice', googleRecognize)

bot.on('voice', async (ctx) => {
  ctx.reply('Await please, I am trying to understand your message!')
  const linkToFile = getFileAPI(ctx.update.message.voice.file_id)
  const assembly = axios.create({
    baseURL: 'https://api.assemblyai.com/v2',
    headers: {
      authorization: 'a5cab3a98752472f8a4be06a3377f9f7',
      'content-type': 'application/json',
    },
  })

  try {
    const fileResponse = await axios(linkToFile)

    const filePath = `https://api.telegram.org/file/bot${process.env.telegramBotToken}/${fileResponse.data.result.file_path}`
    console.log(filePath)

    const submitTranscription = await assembly.post(`/transcript`, {
      audio_url: filePath,
    })

    let transcript = await assembly.get(
      `/transcript/${submitTranscription.data.id}`
    )
    let result: string | undefined

    while (transcript.data.status === ('processing' || 'queued')) {
      transcript = await assembly.get(
        `/transcript/${submitTranscription.data.id}`
      )
      console.log(transcript.data.text)
      result = transcript.data.text
    }

    if (result) {
      ctx.forwardMessage(ctx.chat.id)
      ctx.reply(result)
    }
  } catch (err) {
    console.error(err.data)
  }
})

bot.on('text', (ctx) => {
  console.log(ctx)
})

bot.on('document', (ctx) => {
  console.log(ctx.update)
})

bot.launch()
