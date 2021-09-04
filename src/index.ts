require('dotenv').config()

import { Telegraf } from 'telegraf'
import speech from '@google-cloud/speech'
import CloudConvert from 'cloudconvert'
import axios from 'axios'


const getFileAPI = (fileId: string) => `https://api.telegram.org/bot${process.env.telegramBotToken}/getFile?file_id=${fileId}`


const bot = new Telegraf(process.env.telegramBotToken)
const client = new speech.SpeechClient()
const cloudConverter = new CloudConvert('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNTQ5ODZkMDVkMWY5MThlMTA4NDk1Mzk0YWE2NWIyZWYyZDc2MzQxMTY4NWFlNjRiNDZiN2ZhOTMwYjlkYzJhMzAyMzI1ZDk0MTcyNzM5ZTgiLCJpYXQiOjE2MzA3NTE1MTYuMjc4ODUsIm5iZiI6MTYzMDc1MTUxNi4yNzg4NTMsImV4cCI6NDc4NjQyNTExNi4yNDUyNDgsInN1YiI6IjUzMjE3ODk4Iiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.GW_3x1JXDqQsoK2UkVH8nI0GeL1JPpC2CvUqNimiHXp2WKGfjRoITT_lk7uI_4kcK7l1cd0o-Z8MB0wmy81X36AMg424gHbodVbQ_D_t8JKDQWB_sjySGOUC1_SHFK7UgLD4zR3aP1ha3ovmBLt9i5qcqNBvSRM2LAqxcistY5J2Cspjwnog-XHj2y5FTl9wg4SVO2HYr4GKcDZxGMtxfYf9P0KqZCztHwKbYZmLnpaquniQ78D2kV4GcdpMkfE6T7dGAh5A_CMvoSbshr_9Prw5zLthpDKR0MiSvrWRZy83f3gXN_B-8-2BxsJ0qpc6q6d4GBdU23rSed3SBn0rZKO49z2pGa4J1g4rH1lho2hdgkQ6IXVWbj6MYUTNOi2O6f-SWKDxn1YyM-OVgBSTkvd2BqQAx3hnVFotGwt8UEZ8UbcMjo9vFKxF0lSR84K9A3P_f8ZvExcF2k35bFQae6cwNk5w5RORX7nHfCH9FSslq7QYqIHCToVRhLhd1nbN0vxR0GO1RbNYyJ_43qjICZddsP_8RBrQfjZ4MQM29EFj-HZbvvapBDsu9SKgX_3--Zi-dDkv5_0y50M3Ursa9X1T4dvUGug29LfAtn-1KFRgbhqUNiW1y7ZK2YpZumoIEqHHIHl4sJau3RWxp9BgxKYO42FvzvPntSRH_yK0Of8')

bot.start((ctx) => ctx.reply('Welcome!'))

bot.on('voice', async (ctx) => {
    const linkToFile = getFileAPI(ctx.update.message.voice.file_id)
    const { data } = await axios(linkToFile)
    const filePath = `https://api.telegram.org/file/bot${process.env.telegramBotToken}/${data.result.file_path}`

    const job = await cloudConverter.jobs.create({
        tasks: {
            'import-my-file': {
                operation: 'import/url',
                url: filePath
            },
            'convert-my-file': {
                operation: 'convert',
                input: 'import-my-file',
                output_format: 'flac',
            },
            'export-my-file': {
                operation: 'export/url',
                input: 'convert-my-file'
            }
        }
    })

    const jobResult = await cloudConverter.jobs.wait(job.id)
    const exportTask = jobResult.tasks.filter(
        task => task.operation === 'export/url' && task.status === 'finished'
    )[0];
    const file = exportTask.result.files[0];

    console.log(file)
    // Google config request
    const request = {
        audio: {
            content: file.url
        },
        config: {
            sampleRateHertz: 48000,
            audioChannelCount: 1,
            languageCode: 'ru-RU'
        },
    };

    try {
        console.log(request)
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcription: ${transcription}`);
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