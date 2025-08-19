// src/discord/DiscordBot.js
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fetch from 'node-fetch';

export default class DiscordBot {
  constructor({ token, logger = console }) {
    this.token = token;
    this.logger = logger;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Reaction, Partials.Channel],
    });
    this.guildCache = new Map();

    // logs/diagnóstico
    this.client.on('warn', (m) => this.logger.warn('⚠️ [discord.js warn]', m));
    this.client.on('error', (e) => this.logger.error('❗ [discord.js error]', e));
    this.client.on('shardDisconnect', (ev, id) =>
      this.logger.error(`🔌 Shard #${id} desconectada:`, ev)
    );
    this.client.on('shardReconnecting', (id) =>
      this.logger.log(`🔁 Shard #${id} reconectando...`)
    );
    if (this.client.rest?.on) {
      this.client.rest.on('rateLimited', (info) =>
        this.logger.warn('⏱️ [REST rateLimited]', {
          route: info.route, method: info.method, timeout: info.timeout,
          limit: info.limit, global: info.global, bucket: info.bucket,
        })
      );
    }
  }

  isReady() {
    return typeof this.client.isReady === 'function' ? this.client.isReady() : false;
  }

  async start() {
    if (!this.token) throw new Error('DISCORD_TOKEN ausente');
    await this.client.login(this.token);
    this.logger.log('✅ Bot conectado ao Gateway.');

    // ping simples e warmup opcional
    try {
      const r = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${this.token}` },
      });
      const j = await r.json().catch(() => ({}));
      this.logger.log('🔗 Ping API Discord:', { status: r.status, id: j?.id, user: j?.username });
    } catch (e) {
      this.logger.warn('⚠️ Falha no ping à API do Discord:', e?.message);
    }
  }

  async getGuild(guildId) {
    if (this.guildCache.has(guildId)) return this.guildCache.get(guildId);

    let guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      guild = await this.client.guilds.fetch(guildId, { force: true });
    }
    // warmup de canais (não quebra se falhar)
    try { await guild.channels.fetch(); } catch (_) {}

    this.guildCache.set(guildId, guild);
    return guild;
  }

  async getTextChannel(guildId, channelId) {
    const guild = await this.getGuild(guildId);
    let ch = guild.channels.cache.get(channelId);
    if (!ch) ch = await guild.channels.fetch(channelId);
    return ch;
  }

  debugState() {
    return {
      isReady: this.isReady(),
      wsStatus: this.client.ws?.status,
      guildsCache: this.client.guilds?.cache?.size ?? 0,
    };
  }
}
