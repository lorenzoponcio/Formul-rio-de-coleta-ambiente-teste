import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { env } from './src/config/env.js';
import DiscordBot from './src/discord/DiscordBot.js';
import DiscordService from './src/services/DiscordService.js';

console.log('🔧 Iniciando aplicação...');
console.log('🔧 Ambiente: ', env.NODE_ENV);
console.log('🔧 Porta configurada (PORT):', env.PORT);
console.log('🔧 SERVIDOR_ID definido?', !!env.SERVIDOR_ID);
console.log('🔧 CANAL_MONITORADO_ID definido?', !!env.CANAL_MONITORADO_ID);
console.log(
  '🔧 DISCORD_TOKEN definido?',
  env.DISCORD_TOKEN ? `(comprimento: ${String(env.DISCORD_TOKEN).length})` : 'NÃO'
);

// === Discord Bot encapsulado ===
const bot = new DiscordBot({ token: env.DISCORD_TOKEN });
const discordService = new DiscordService(bot, env.SERVIDOR_ID, env.CANAL_MONITORADO_ID);

const app = express();
app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use((err, _req, res, next) => {
  if (err) {
    console.error('❌ Erro no bodyParser:', err);
    return res.status(400).json({ erro: 'JSON inválido' });
  }
  next();
});

// Endpoint de verificação básico
app.get('/check-is-on', (_req, res) => {
  console.log('📥 GET /check-is-on');
  try {
    console.log('🧭 Guilds no cache:', bot.client.guilds.cache.size);
    bot.client.guilds.cache.forEach((guild) => {
      console.log(`✅ Conectado ao servidor: ${guild.name}, ID: ${guild.id}`);
    });
  } catch (error) {
    console.log('❌ Erro ao iterar guilds no cache:', error);
  }
  return res.sendStatus(200);
});

// Endpoint de diagnóstico
app.get('/_debug', (_req, res) => {
  try {
    const payload = {
      ...bot.debugState(),
      hasGuildIdEnv: !!env.SERVIDOR_ID,
      hasChannelIdEnv: !!env.CANAL_MONITORADO_ID,
    };
    console.log('🧩 /_debug =>', payload);
    res.json(payload);
  } catch (e) {
    console.error('❌ Erro no /_debug:', e);
    res.status(500).json({ erro: 'falha ao ler estado do client' });
  }
});

// Rota de coleta
app.post('/coleta', async (req, res) => {
  console.log('📥 POST /coleta - Início do processamento');
  const inicio = Date.now();

  const {
    id,
    cliente,
    descricao,
    contato,
    prazo,
    criterio,
    pix_status,

    // LINKS
    cardapio_links = [],
    horarios_links = [],
    taxas_links = [],
    taxa_links = [],

    // FILES (novos)
    cardapio_files = [],
    horarios_files = [],
    taxas_files = [],

    infos_cardapio,
    redes_sociais,
    logo_links = [],
    imagens_informacoes = [],
    infos_gerais,
    cliente_promocional_pix = false,
  } = req.body || {};

  // Log seguro do corpo recebido (sem dados sigilosos)
  try {
    const safeBody = {
      id,
      cliente,
      descricao,
      contato,
      prazo,
      criterio,

      cardapio_links: Array.isArray(cardapio_links) ? cardapio_links.length : (cardapio_links ? 1 : 0),
      horarios_links: Array.isArray(horarios_links) ? horarios_links.length : (horarios_links ? 1 : 0),
      taxas_links: Array.isArray(taxas_links) ? taxas_links.length : (taxas_links ? 1 : 0),
      taxa_links: Array.isArray(taxa_links) ? taxa_links.length : (taxa_links ? 1 : 0),

      cardapio_files: Array.isArray(cardapio_files) ? cardapio_files.length : 0,
      horarios_files: Array.isArray(horarios_files) ? horarios_files.length : 0,
      taxas_files: Array.isArray(taxas_files) ? taxas_files.length : 0,

      infos_cardapio: infos_cardapio
        ? String(infos_cardapio).slice(0, 100) + (String(infos_cardapio).length > 100 ? '...' : '')
        : null,
      redes_sociais: redes_sociais
        ? String(redes_sociais).slice(0, 100) + (String(redes_sociais).length > 100 ? '...' : '')
        : null,
      logo_links: Array.isArray(logo_links) ? logo_links.length : (logo_links ? 1 : 0),
      imagens_informacoes: Array.isArray(imagens_informacoes)
        ? imagens_informacoes.length
        : (imagens_informacoes ? 1 : 0),
      infos_gerais: infos_gerais
        ? String(infos_gerais).slice(0, 100) + (String(infos_gerais).length > 100 ? '...' : '')
        : null,
    };
    console.log('🧾 Corpo (resumo):', safeBody);
  } catch (e) {
    console.warn('⚠️ Falha ao gerar log seguro do corpo:', e);
  }

  try {
    const { threadName } = await discordService.criarTopicoColeta({
      id,
      cliente,
      descricao,
      contato,
      prazo,
      criterio,
      pix_status,

      // LINKS
      cardapio_links,
      horarios_links,
      taxas_links,
      taxa_links,

      // FILES (novos)
      cardapio_files,
      horarios_files,
      taxas_files,

      infos_cardapio,
      redes_sociais,
      logo_links,
      imagens_informacoes,
      infos_gerais,
      cliente_promocional_pix,
    });

    const duracao = Date.now() - inicio;
    console.log(`✅ Coleta registrada com sucesso. (Tempo total: ${duracao}ms)`);
    return res.status(200).json({ status: 'ok', thread: threadName });
  } catch (error) {
    console.error('❌ Erro ao processar coleta:', error);
    return res.status(500).json({ erro: 'Erro ao processar coleta.' });
  }
});

// Porta / server HTTP
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🌐 Server rodando na porta ${PORT}`);
  console.log('🚀 Iniciando login no Discord Gateway...');
});

// Warmup após login
bot.client.once('ready', async () => {
  console.log(`✅ Bot logado como ${bot.client.user.tag}`);
  console.log('⏳ Aguardando cache de guilds...');
  setTimeout(async () => {
    try {
      console.time('⏱️ warmupGuild');
      const g = await bot.getGuild(env.SERVIDOR_ID);
      console.log(
        `✅ Guild carregada: ${g.name} (${g.id}) | Canais em cache: ${g.channels.cache.size}`
      );
      console.timeEnd('⏱️ warmupGuild');
    } catch (err) {
      console.error('❌ Erro ao carregar guild após delay:', err);
    }
  }, 3000);
});

// Login (start do bot)
if (!env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN não definido! O bot não conseguirá logar no Discord.');
}
bot.start().catch((err) => console.error('❌ Erro ao iniciar DiscordBot:', err));
