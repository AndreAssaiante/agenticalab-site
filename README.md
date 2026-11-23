# agenticalab.com.br

Site estático da AgenticaLab: Landing, Brandbook, Soluções e uma página por produto.
Não precisa instalar nada. Só Node 18 ou mais novo.

## Estrutura

```
src/                  páginas e arquivos do site
  index.html          landing (/)
  solucoes/index.html lista de soluções (/solucoes/)
  brandbook/          brandbook completo (/brandbook/), fica como está
  404.html
  assets/css/site.css estilo único de todas as páginas
  assets/img/         imagens
partials/             head, header (menu) e footer, compartilhados
data/produtos.json    conteúdo dos produtos (1 entrada = 1 página)
content/blog/         posts do Blog em Markdown (1 arquivo = 1 post; veja content/blog/README.md)
blog.mjs              gera Blog, categorias, paginação, RSS, llms.txt e llms-full.txt
templates/produto.html layout das páginas de produto
build.mjs             gera o site em dist/
```

## Como gerar

```
node build.mjs
```

O site pronto fica em `dist/`. Para ver no computador: `npx serve dist` (ou qualquer servidor estático).

## Como ajustar

- **Menu e rodapé:** edite `partials/header.html` e `partials/footer.html`. Muda em todas as páginas.
- **Cores e fontes:** `src/assets/css/site.css` (variáveis no topo).
- **Produtos:** edite `data/produtos.json`. Para criar um produto novo, copie uma entrada e troque o `slug`. A página `/solucoes/<slug>/`, o card em Soluções, o rodapé e o sitemap são gerados sozinhos.
- **Página nova:** crie `src/<nome>/index.html` começando com o bloco de configuração:

```
<!--
title: Título da página
description: Descrição para o Google
nav: solucoes
-->
<main> ... </main>
```

Nos templates, `{{campo}}` insere texto e `{{{campo}}}` insere HTML.

## Publicar no Cloudflare Pages

1. Cloudflare > Workers & Pages > projeto `agenticalab`, conectado a este repositório.
2. Production branch: `main` · Build command: `node build.mjs` · Build output directory: `dist`
3. Cada PR ganha um link de prévia; o merge na `main` publica no ar.
4. Em Custom domains, adicione `agenticalab.com.br` (e `www`). Se o domínio estiver em outro provedor, aponte o DNS ou mude os nameservers para o Cloudflare.

Edições feitas pelo agente da VPS seguem o `AGENTE.md`.

## Pendente

- O formulário da landing (`#lead-form`) ainda não envia para lugar nenhum. Destino em discussão (Supabase).
- Textos dos produtos são rascunho para revisão. Números de exemplo devem ser marcados como ilustrativos até serem medidos.
