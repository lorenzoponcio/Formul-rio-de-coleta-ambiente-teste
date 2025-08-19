// src/config/env.js
import 'dotenv/config';

function must(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Env faltando: ${name}`);
  }
  return v;
}
function num(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Env ${name} deve ser número`);
  return n;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: num('PORT', 3001),
  DISCORD_TOKEN: must('DISCORD_TOKEN'),
  SERVIDOR_ID: must('SERVIDOR_ID'),
  CANAL_MONITORADO_ID: must('CANAL_MONITORADO_ID'),
};
