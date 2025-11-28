// index.js (starter)
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const pino = require('pino');

const authFile = './auth_info.json';
const { state, saveState } = useSingleFileAuthState(authFile);

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  console.log('Baileys version', version);

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      console.log('Connection closed.', lastDisconnect?.error || lastDisconnect);
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
      else console.log('Logged out — delete auth_info.json to re-authenticate.');
    } else if (connection === 'open') {
      console.log('Conectado ao WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key && msg.key.remoteJid === 'status@broadcast') return;
      const from = msg.key.remoteJid;
      const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const body = text.trim();

      if (!body) return;

      if (body === '!menu' || body === '!help') {
        const reply = `*SADZIN MODS - Menu*
!menu - mostrar menu
!perfil - ver perfil
!procura <termo> - pesquisa rápida
!tomp3 <url> - converter vídeo pra mp3 (exemplo)
!ping - ping`;
        await sock.sendMessage(from, { text: reply }, { quoted: msg });
      }

      if (body === '!perfil') {
        const info = `Usuário: ${sender}\nGrupo: ${from.endsWith('@g.us') ? 'Sim' : 'Não'}`;
        await sock.sendMessage(from, { text: info }, { quoted: msg });
      }

      if (body.startsWith('!procura ')) {
        const q = encodeURIComponent(body.slice(9));
        await sock.sendMessage(from, { text: `Pesquisa rápida: https://www.google.com/search?q=${q}` }, { quoted: msg });
      }
    } catch (err) {
      console.error('Erro no handler:', err);
    }
  });
}

startBot().catch(e => console.error(e));
