// Envia o confirmados.json local (do PC) para o Blob Storage da Vercel — rodar UMA VEZ.
// Como usar:
//   1) Conecte o Blob Storage no projeto na Vercel (aba Storage > Create > Blob > Connect)
//   2) Copie o valor de BLOB_READ_WRITE_TOKEN (visível na conexão do store)
//   3) No PowerShell, nesta pasta:
//        $env:BLOB_READ_WRITE_TOKEN="cole-o-token-aqui"; node importar.js
// Se não quiser importar o histórico, ignore este arquivo — a lista começa vazia na nuvem.

import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Defina BLOB_READ_WRITE_TOKEN antes de rodar (veja as instruções no topo deste arquivo).');
  process.exit(1);
}

const raiz = path.dirname(fileURLToPath(import.meta.url));
const lista = JSON.parse(await readFile(path.join(raiz, 'confirmados.json'), 'utf8'));
if (!Array.isArray(lista)) throw new Error('confirmados.json não é uma lista');

const resultado = await put('confirmados.json', JSON.stringify(lista, null, 2), {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
});

console.log(`✅ ${lista.length} confirmação(ões) enviadas para a nuvem:`);
console.log(resultado.url);