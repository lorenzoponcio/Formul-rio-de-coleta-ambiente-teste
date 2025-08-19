// src/services/DiscordService.js
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

  /**
   * Cria mensagem inicial + thread + posta conteúdo adicional.
   * Retorna { messageId, threadId, threadName }
   */
  async criarTopicoColeta(payload) {
    const canal = await this.getChannel();
    if (!canal) throw new Error('Canal de coleta não encontrado.');

    // Montagem das mensagens
    const msgInicial = buildMensagemInicial(payload);

    // Envia mensagem inicial
    const msg = await canal.send(msgInicial);

    // Cria a thread
    const thread = await msg.startThread({
      name: `(${payload.id})`,
      autoArchiveDuration: 1440,
      reason: 'Nova coleta de cardápio',
    });

    // Unifica taxas_links/taxa_links
    const taxas_links =
      Array.isArray(payload.taxas_links) ? payload.taxas_links : payload.taxa_links || [];

    const conteudoThread = buildConteudoThread({
      cardapio_links: payload.cardapio_links,
      infos_cardapio: payload.infos_cardapio,
      horarios_links: payload.horarios_links,
      taxas_links,
      redes_sociais: payload.redes_sociais,
      logo_links: payload.logo_links,
      imagens_informacoes: payload.imagens_informacoes,
      infos_gerais: payload.infos_gerais,
    });

    if (conteudoThread?.length) {
      await thread.send(conteudoThread);
    }

    return { messageId: msg.id, threadId: thread.id, threadName: thread.name };
  }
}
