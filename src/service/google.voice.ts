import CloudConvert from 'cloudconvert'
import speech from '@google-cloud/speech'
import axios from 'axios'

import { getFileAPI } from '../utils/getFileAPI'

const { telegramBotToken, cloudConverterToken } = process.env

const client = new speech.SpeechClient()
const cloudConverter = new CloudConvert(cloudConverterToken)

export const googleRecognize = async (ctx: any): Promise<void> => {
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
}
