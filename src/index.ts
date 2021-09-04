import dotenv from 'dotenv'
import { Telegraf } from 'telegraf'
import speech from '@google-cloud/speech'
import CloudConvert from 'cloudconvert'
import axios from 'axios'

dotenv.config()

const { telegramBotToken, cloudConverterToken } = process.env

const getFileAPI = (fileId: string) =>
  `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileId}`

const bot = new Telegraf(process.env.telegramBotToken)
const client = new speech.SpeechClient()
const cloudConverter = new CloudConvert(cloudConverterToken)

bot.start((ctx) => ctx.reply('Welcome!'))

bot.on('voice', async (ctx) => {
  const linkToFile = getFileAPI(ctx.update.message.voice.file_id)
  const { data } = await axios(linkToFile)
  const filePath = `https://api.telegram.org/file/bot${telegramBotToken}/${data.result.file_path}`

  const job = await cloudConverter.jobs.create({
    tasks: {
      'import-my-file': {
        operation: 'import/url',
        url: filePath,
      },
      'convert-my-file': {
        operation: 'convert',
        input: 'import-my-file',
        output_format: 'flac',
      },
      'export-my-file': {
        operation: 'export/url',
        input: 'convert-my-file',
      },
    },
  })

  const jobResult = await cloudConverter.jobs.wait(job.id)
  const exportTask = jobResult.tasks.filter(
    (task) => task.operation === 'export/url' && task.status === 'finished'
  )[0]
  const file = exportTask.result.files[0]

  console.log(file)
  // Google config request
  const request = {
    audio: {
      content: file.url,
    },
    config: {
      sampleRateHertz: 48000,
      audioChannelCount: 1,
      languageCode: 'ru-RU',
    },
  }

  try {
    console.log(request)
    const [response] = await client.recognize(request)
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n')
    console.log(`Transcription: ${transcription}`)
  } catch (err) {
    console.log('Error')
    console.error(err)
  }
})

// bot.on('voice', async (ctx) => {
//     const linkToFile = getFileAPI(ctx.update.message.voice.file_id)
//     const assembly = axios.create({
//         baseURL: "https://api.assemblyai.com/v2",
//         headers: {
//             authorization: "a5cab3a98752472f8a4be06a3377f9f7",
//             "content-type": "application/json",
//         },
//     });

//     try {
//         const fileResponse = await axios(linkToFile)
//         console.log(fileResponse.data)

//         const filePath = `https://api.telegram.org/file/bot${process.env.telegramBotToken}/${fileResponse.data.result.file_path}`
//         console.log(filePath)

//         const submitTranscription = await assembly.post(`/transcript`, {
//             audio_url: filePath,
//             language_model: ""
//         })

//         let transcript = await assembly.get(`/transcript/${submitTranscription.data.id}`)
//         while (transcript.data.status === ('processing' || 'queued')) {
//             transcript = await assembly.get(`/transcript/${submitTranscription.data.id}`)
//         }

//         console.log(transcript.data)
//     } catch (err) {
//         // console.log(err.data)
//     }
// })

bot.on('text', (ctx) => {
  console.log(ctx)
})

bot.on('document', (ctx) => {
  console.log(ctx.update)
})

bot.launch()
