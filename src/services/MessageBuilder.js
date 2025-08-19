// src/services/MessageBuilder.js

function emojiFromCriterio(criterio) {
  const c = (criterio || '').toLowerCase().trim();
  if (c.includes('grande')) return '🔴';
  if (c.includes('mediano')) return '🟠';
  return '🟢';
}

function limparLinks(lista) {
  return (Array.isArray(lista) ? lista : [lista])
    .filter(Boolean)
    .map(l =>
      l.toString().trim()
        .replace(/^["'\[\]]+|["'\[\]]+$/g, '')
        .replace(/"/g, '')
    );
}

export function buildMensagemInicial({
  id,
  descricao,
  infos_cardapio,
  contato,
  prazo,
  criterio,
  cliente_promocional_pix = false,
}) {
  const emoji = emojiFromCriterio(criterio);

  const parts = [
    `📌 ID: \`${id}\``,
    `➡️ Descrição do Cliente: \`${descricao || 'Sem obs'}\``,
    `➡️ Observação do Cardápio: \`${infos_cardapio || 'Sem obs'}\``,
    `➡️ Contato do Cliente: \`${contato}\``,
    `➡️ Prazo de Entrega Interno: \`${prazo}\``,
    `➡️ Critério: \`${emoji}\``,
  ];

  if (cliente_promocional_pix) {
    parts.push('➡️ `Cliente Promocional com Pix`');
  }
  return parts.join('\n');
}

export function buildConteudoThread({
  cardapio_links = [],
  infos_cardapio,
  horarios_links = [],
  taxas_links = [],
  redes_sociais,
  logo_links = [],
  imagens_informacoes = [],
  infos_gerais,
}) {
  let out = '';

  if (cardapio_links?.length) {
    out += `📎 **Cardápio (arquivos/links):**\n${limparLinks(cardapio_links).join('\n')}\n\n`;
  }
  if (infos_cardapio) {
    out += `ℹ️ **Informações sobre o cardápio:**\n${infos_cardapio}\n\n`;
  }
  if (horarios_links?.length) {
    out += `🕒 **Horários:**\n${limparLinks(horarios_links).join('\n')}\n\n`;
  }
  if (taxas_links?.length) {
    out += `🚚 **Taxas de Entrega:**\n${limparLinks(taxas_links).join('\n')}\n\n`;
  }
  if (redes_sociais) {
    out += `🌐 **Redes Sociais:**\n${redes_sociais}\n\n`;
  }
  if (logo_links?.length) {
    out += `🖼️ **Logo e Capa:**\n${limparLinks(logo_links).join('\n')}\n\n`;
  }
  if (imagens_informacoes?.length) {
    out += `🖼️ **Imagens para Informações:**\n${limparLinks(imagens_informacoes).join('\n')}\n\n`;
  }
  if (infos_gerais) {
    out += `🗒️ **Informações Gerais:**\n${infos_gerais}\n\n`;
  }
  return out.trim();
}
