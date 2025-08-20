// src/services/DiscordService.js
import fetch from 'node-fetch';
import { buildMensagemInicial, buildConteudoThread } from './MessageBuilder.js';

export default class DiscordService {
  constructor(bot, guildId, channelId, logger = console) {
    this.bot = bot;
    this.guildId = guildId;
    this.channelId = channelId;
    this.logger = logger;
    this._channel = null;
  }

  async getChannel() {
    if (this._channel) return this._channel;
    this._channel = await this.bot.getTextChannel(this.guildId, this.channelId);
    return this._channel;
  }

  async criarTopicoColeta(payload) {
    const canal = await this.getChannel();
    if (!canal) throw new Error('Canal de coleta não encontrado.');

    // 1) Mensagem inicial
    const msgInicial = buildMensagemInicial(payload);
    const msg = await canal.send(msgInicial);

    // 2) Thread
    const thread = await msg.startThread({
      name: `(${payload.id})`,
      autoArchiveDuration: 1440,
      reason: 'Nova coleta de cardápio',
    });

    // 3) Conteúdo textual (links/infos)
    const conteudoThread = buildConteudoThread({
      cardapio_links: payload.cardapio_links,
      infos_cardapio: payload.infos_cardapio,
      horarios_links: payload.horarios_links,
      taxas_links: payload.taxas_links || payload.taxa_links || [],
      redes_sociais: payload.redes_sociais,
      logo_links: payload.logo_links,
      imagens_informacoes: payload.imagens_informacoes,
      infos_gerais: payload.infos_gerais,
    });
    if (conteudoThread?.length) await thread.send(conteudoThread);

    // 4) Anexos (arquivos/imagens) vindos do Tally
    // Estrutura esperada: [{ url, name, type, size }]
    await this._postFileGroup(thread, 'Cardápio',  payload.cardapio_files);
    await this._postFileGroup(thread, 'Horários',  payload.horarios_files);
    await this._postFileGroup(thread, 'Taxas de Entrega', payload.todas_taxas_files || payload.taxas_files);

    return { messageId: msg.id, threadId: thread.id, threadName: thread.name };
  }

  // ===== Helpers de upload =====
  async _postFileGroup(thread, label, files) {
    const list = Array.isArray(files) ? files.filter(f => f?.url) : [];
    if (!list.length) return;

    // avisa qual grupo é
    await thread.send(`📎 **${label} — anexos:**`);

    // limite de anexos por mensagem no Discord: 10 (usaremos 8 por segurança)
    const BATCH = 8;
    let batch = [];

    for (let i = 0; i < list.length; i++) {
      const meta = list[i];
      try {
        const { buffer, contentType, fileName } = await this._download(meta, i);
        batch.push({ attachment: buffer, name: fileName });

        if (batch.length >= BATCH) {
          await thread.send({ files: batch });
          batch = [];
        }
      } catch (e) {
        // fallback: posta o link quando não conseguir baixar/enviar
        this.logger.warn(`⚠️ Falha ao anexar ${meta.url}:`, e.message);
        await thread.send(meta.url);
      }
    }

    if (batch.length) {
      await thread.send({ files: batch });
    }
  }

  async _download(meta, index) {
    const url = String(meta.url);
    const maxBytes = 8 * 1024 * 1024; // 8MB (ajuste se seu servidor/discord permitir mais)

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const len = Number(res.headers.get('content-length') || 0);
    if (len && len > maxBytes) throw new Error(`Arquivo maior que ${maxBytes} bytes`);

    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    if (buffer.length > maxBytes) throw new Error(`Arquivo maior que ${maxBytes} bytes`);

    const contentType = res.headers.get('content-type') || meta.type || 'application/octet-stream';
    const fileName = this._pickFileName(meta, url, contentType, index);

    return { buffer, contentType, fileName };
  }

  _pickFileName(meta, url, contentType, index) {
    const fromMeta = meta?.name && String(meta.name).trim();
    if (fromMeta) return fromMeta;

    const urlName = (() => {
      try {
        const u = new URL(url);
        const base = u.pathname.split('/').pop();
        if (base) return decodeURIComponent(base);
      } catch {}
      return '';
    })();

    if (urlName) return urlName;

    const ext = this._extFromType(contentType);
    return `arquivo_${index + 1}.${ext}`;
  }

  _extFromType(ct) {
    const map = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
    };
    return map[ct] || 'bin';
  }
}
