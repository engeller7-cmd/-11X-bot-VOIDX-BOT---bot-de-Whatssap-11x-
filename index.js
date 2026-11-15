const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const path = require('path')
const settings = require('./settings')

const app = express()
app.get('/', (req, res) => res.send(`${settings.botName} Online ✅`))
app.listen(3000, () => console.log('Keep alive ON'))

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: [settings.botName, "Chrome", "1.0"],
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Desconectado, reconectando...')
      if (shouldReconnect) start()
    } else if (connection === 'open') {
      console.log(`CONECTADO - ${settings.botName}`)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    
    const msgText = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ""
    const prefix = settings.prefix.find(p => msgText.startsWith(p))
    if (!prefix) return

    const args = msgText.slice(prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    
    // Cargar plugins
    const pluginsPath = path.join(__dirname, 'plugins')
    if (fs.existsSync(pluginsPath)) {
      const files = fs.readdirSync(pluginsPath)
      for (const file of files) {
        if (file.endsWith('.js')) {
          const plugin = require(path.join(pluginsPath, file))
          if (plugin.command && plugin.command.includes(command)) {
            try { await plugin.run(sock, m, args, { settings }) } catch(e) { console.log(e) }
          }
        }
      }
    }
  })
}

start()
process.on('uncaughtException', console.log)
process.on('unhandledRejection', console.log)