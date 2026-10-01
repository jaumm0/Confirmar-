# 🍼 Chá de Fralda — Confirmação de Presença

Sistema simples: os convidados abrem o link, digitam o nome e confirmam.
Você acompanha tudo no painel do anfitrião.

## Como rodar

```bash
node server.js
```

Ao iniciar, o terminal mostra os links:

- **Neste computador:** `http://localhost:3000`
- **Para os convidados:** `http://SEU-IP:3000` (funciona para quem estiver na **mesma rede Wi-Fi** que o PC)
- **Painel do anfitrião:** `http://localhost:3000/admin`

> Se o Windows perguntar sobre o firewall na primeira execução, clique em **"Permitir acesso"** (redes privadas).

## Painel do anfitrião

Acesse `/admin` — **sem senha**, conforme pedido. Qualquer pessoa com o link pode ver a lista e remover confirmações; para proteger de novo com senha, basta pedir.

## Personalizar a página

Abra `public/index.html` e procure os blocos marcados com **✏️ EDITE AQUI**:
título, mensagem, data, horário e local. Campos deixados como `''` ficam escondidos.

## Como funciona

- Confirmação duplicada com o **mesmo nome atualiza** o registro (evita duplicados por engano).
- O convidado pode informar acompanhantes e deixar um recado.
- Dados ficam em `confirmados.json` — para backup, basta copiar esse arquivo.
- A lista de nomes aparece na página pública; recados e horários só no painel.

## Deixar o site acessível pela internet

**Jeito rápido (link HTTPS descartável):** dê dois cliques em **`publicar.bat`**.
Ele sobe o servidor e cria um túnel Cloudflare; a URL `https://algo.trycloudflare.com`
aparece no terminal — copie e mande no grupo. Detalhes:

- A URL **muda toda vez** que você religar (é descartável mesmo).
- O link funciona **enquanto a janela estiver aberta e o PC ligado**.
- O túnel usa o `cloudflared` já instalado na máquina.

## Publicar na Vercel (URL fixa, sem precisar do PC ligado)

A Vercel não deixa gravar arquivos no disco das funções, então o `confirmados.json`
passa a viver como **arquivo na nuvem via Vercel Blob** — não é um banco de dados,
é apenas o mesmo arquivo, alojado online.

1. Importe esta pasta como projeto na [vercel.com](https://vercel.com) (upload ou Git).
2. No projeto: **Storage → Create → Blob → Connect to project**
   (isso injeta a variável `BLOB_READ_WRITE_TOKEN` automaticamente).
3. Publique de novo para a nova configuração valer.
4. **Migrar as confirmações já existentes no PC (uma vez só):** copie o valor de
   `BLOB_READ_WRITE_TOKEN` da conexão e rode no PowerShell, nesta pasta:
   `$env:BLOB_READ_WRITE_TOKEN="cole-o-token-aqui"; node importar.js`
5. Teste a página e o `/admin` no link da Vercel.

Detalhes: as rotas de `/api/*` viraram a função `api/[[...caminho]].js`
(same API que o `server.js`), o `public/` é servido estático via `vercel.json`,
e `node server.js` continua funcionando normal no PC com o `confirmados.json` local.

> Nota: este sistema é para um evento pequeno e roda em HTTP simples — adequado para lista de presença, não para dados sensíveis.