// API do Chá de Fralda para a Vercel — functions serverless.
// Espelha as rotas do server.js (mesma API, mesmas respostas), mas gravando
// o "confirmados.json" como arquivo NA NUVEM (Vercel Blob), porque a Vercel
// não permite gravar arquivos no disco das funções (disco somente-leitura).
// Se o projeto tem um Blob Storage conectado (BLOB_READ_WRITE_TOKEN), grava lá;
// sem loja conectada, responde com erro explicativo em vez de perder dados.

import { put, head } from '@vercel/blob';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const ARQUIVO = 'confirmados.json';
const NUVEM = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const NO_VERCEL = Boolean(process.env.VERCEL);

// ---------- dados ----------
async function lerDados() {
  if (!NUVEM) return lerLocal();

  try {
    const meta = await head(ARQUIVO);
    const resposta = await fetch(meta.url);
    const lista = JSON.parse(await resposta.text());
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    if (arquivoAusente(erro)) return []; // primeira gravada ainda não existe
    throw erro;
  }
}

async function salvarDados(lista) {
  if (!NUVEM) return salvarLocal(lista);

  await put(ARQUIVO, JSON.stringify(lista, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// head() avisa de formas diferentes quando o arquivo ainda não existe
// (classe BlobNotFoundError, status 404, etc.); isso aqui não confunde
// "arquivo novo" com falha de rede/token, que aí sim deve dar erro.
function arquivoAusente(erro) {
  const pista = `${erro?.name ?? ''} ${erro?.status ?? ''} ${erro?.message ?? ''}`;
  return /not.?found|404/i.test(pista);
}

// Modo sem nuvem: só faz sentido no computador (vercel dev).
// Na Vercel de verdade, guardar em disco perderia tudo na primeira nova invocação.
async function lerLocal() {
  if (NO_VERCEL) throw new ErroConfiguracao();
  try {
    const lista = JSON.parse(await readFile(path.join(process.cwd(), ARQUIVO), 'utf8'));
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function salvarLocal(lista) {
  if (NO_VERCEL) throw new ErroConfiguracao();
  const destino = path.join(process.cwd(), ARQUIVO);
  const temp = destino + '.tmp';
  await writeFile(temp, JSON.stringify(lista, null, 2), 'utf8');
  await (await import('node:fs/promises')).rename(temp, destino);
}

class ErroConfiguracao extends Error {
  constructor() {
    super(
      'Falta conectar um Blob Storage no projeto (Vercel > Storage > Blob > Connect) e publicar de novo.'
    );
  }
}

// ---------- helpers ----------
const contarPessoas = (lista) =>
  lista.reduce((total, c) => total + 1 + (c.acompanhantes || 0), 0);

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((resolver, recusar) => {
    let bruto = '';
    req.on('data', (pedaco) => {
      bruto += pedaco;
      if (bruto.length > 10000) {
        recusar(new Error('corpo muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolver(JSON.parse(bruto || '{}'));
      } catch {
        recusar(new Error('json inválido'));
      }
    });
    req.on('error', recusar);
  });
}

// ---------- rotas (mesmas do server.js) ----------
export default async function handler(req, res) {
  try {
    if (NO_VERCEL && !NUVEM) return json(res, 503, { erro: new ErroConfiguracao().message });

    const url = new URL(req.url, 'http://localhost');
    const caminho = decodeURIComponent(url.pathname);

    if (req.method === 'POST' && caminho === '/api/confirmar') {
      const corpo = await lerCorpo(req);
      const nome = String(corpo.nome ?? '').trim().replace(/\s+/g, ' ');
      if (!nome || nome.length > 60) return json(res, 400, { erro: 'Digite um nome válido.' });

      let acompanhantes = Number(corpo.acompanhantes ?? 0);
      if (!Number.isInteger(acompanhantes) || acompanhantes < 0 || acompanhantes > 20) {
        acompanhantes = 0;
      }
      const recado = String(corpo.recado ?? '').trim().slice(0, 200);

      const lista = await lerDados();
      const existente = lista.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
      let atualizado = false;
      if (existente) {
        Object.assign(existente, { nome, acompanhantes, recado, quando: new Date().toISOString() });
        atualizado = true;
      } else {
        lista.push({ id: randomUUID(), nome, acompanhantes, recado, quando: new Date().toISOString() });
      }
      await salvarDados(lista);
      return json(res, 200, {
        ok: true,
        atualizado,
        total: lista.length,
        pessoas: contarPessoas(lista),
      });
    }

    if (req.method === 'GET' && caminho === '/api/confirmados') {
      const lista = await lerDados();
      return json(res, 200, { total: lista.length, pessoas: contarPessoas(lista), nomes: lista.map((c) => c.nome) });
    }

    if (req.method === 'GET' && caminho === '/api/admin/confirmados') {
      return json(res, 200, { confirmados: await lerDados() });
    }

    if (req.method === 'DELETE' && caminho.startsWith('/api/confirmados/')) {
      const id = caminho.slice('/api/confirmados/'.length);
      const lista = await lerDados();
      const indice = lista.findIndex((c) => c.id === id);
      if (indice === -1) return json(res, 404, { erro: 'Não encontrado' });
      lista.splice(indice, 1);
      await salvarDados(lista);
      return json(res, 200, { ok: true, total: lista.length, pessoas: contarPessoas(lista) });
    }

    json(res, 404, { erro: 'Não encontrado' });
  } catch (erro) {
    console.error('Falha na API:', erro);
    if (erro.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Página não encontrada');
    }
    json(res, 500, { erro: 'Erro interno no servidor' });
  }
}