require('dotenv').config()

import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.telegramBotToken)

bot.start((ctx) => ctx.reply('Welcome!'))

bot.launch()