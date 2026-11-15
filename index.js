const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require("@whiskeysockets/baileys")
const fs = require("fs")
const path = require("path")
const pino = require("pino")
const settings = require("./settings")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Desktop"),
    printQRInTerminal: false
  })

  // ESTO ES LO QUE HACE QUE DURE
  if (!sock.authState.creds.registered) {
    console.log("Solicitando código de emparejamiento...")
    setTimeout(async () => {
      let phoneNumber = "51900000000" // << CAMBIA ESTO POR TU NUMERO
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "")
      const code = await sock.requestPairingCode(phoneNumber)
      console.log(`\n=================================\nTU CÓDIGO ES: ${code}\nVálido por 2 minutos\nPonlo en WhatsApp > Dispositivos vinculados > Vincular con número\n=================================\n`)
    }, 3000)
  }

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (u) => {
    if (u.connection === "open") console.log("✅ BOT CONECTADO!")
    if (u.connection === "close") startBot()
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
    if (!body.startsWith("!")) return
    const args = body.slice(1).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    
    const pluginsPath = path.join(__dirname, "plugins")
    if (!fs.existsSync(pluginsPath)) return
    for (const file of fs.readdirSync(pluginsPath)) {
      if (!file.endsWith(".js")) continue
      try {
        delete require.cache[require.resolve(path.join(pluginsPath, file))]
        const plugin = require(path.join(pluginsPath, file))
        if (plugin.command.includes(command)) {
          await plugin.run(sock, m, args, { settings, command })
        }
      } catch (e) { console.log(e) }
    }
  })
}

startBot()