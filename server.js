// Servidor do Chá de Fralda — Node puro, sem dependências externas.
import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __raiz = path.dirname(fileURLToPath(import.meta.url));
const PASTA_PUBLICA = path.join(__raiz, 'public');
const ARQUIVO_DADOS = path.join(__raiz, 'confirmados.json');

const PORTA = Number(process.env.PORT) || 3000;

// ---------- dados ----------
async function lerDados() {
  try {
    const lista = JSON.parse(await readFile(ARQUIVO_DADOS, 'utf8'));
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function salvarDados(lista) {
  const temp = ARQUIVO_DADOS + '.tmp';
  await writeFile(temp, JSON.stringify(lista, null, 2), 'utf8');
  await rename(temp, ARQUIVO_DADOS);
}

const contarPessoas = (lista) =>
  lista.reduce((total, c) => total + 1 + (c.acompanhantes || 0), 0);

// ---------- helpers ----------
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

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

async function servirEstatico(res, caminho) {
  const relativo =
    caminho === '/' ? '/index.html' : caminho === '/admin' ? '/admin.html' : caminho;
  const arquivo = path.normalize(path.join(PASTA_PUBLICA, relativo));
  if (!arquivo.startsWith(PASTA_PUBLICA)) return json(res, 403, { erro: 'Acesso negado' });

  const conteudo = await readFile(arquivo);
  const tipo = MIMES[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo });
  res.end(conteudo);
}

// ---------- rotas ----------
const servidor = createServer(async (req, res) => {
  try {
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

    if (req.method === 'GET') return void (await servirEstatico(res, caminho));

    json(res, 404, { erro: 'Não encontrado' });
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Página não encontrada');
    }
    json(res, 500, { erro: 'Erro interno no servidor' });
  }
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log('🍼 Servidor do chá de fralda rodando!');
  console.log(`→ Neste computador:  http://localhost:${PORTA}`);
  console.log(`→ Painel do anfitrião:  http://localhost:${PORTA}/admin`);

  const enderecos = [];
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const rede of interfaces) {
      if (rede.family === 'IPv4' && !rede.internal) enderecos.push(rede.address);
    }
  }
  if (enderecos.length) {
    console.log('→ Link para enviar aos convidados (mesma rede Wi-Fi):');
    for (const endereco of enderecos) console.log(`   http://${endereco}:${PORTA}`);
  } else {
    console.log('→ Nenhum endereço de rede local encontrado — conecte o PC ao Wi-Fi e reinicie.');
  }
  console.log('Os dados ficam salvos em confirmados.json');
});