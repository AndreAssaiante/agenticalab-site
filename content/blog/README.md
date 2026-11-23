# Como publicar no Blog

Cada post é **um arquivo Markdown** nesta pasta. O `node build.mjs` transforma o arquivo em página (`/blog/<slug>/`), coloca o post na lista do Blog, na página da categoria, no `sitemap.xml`, no feed RSS (`/blog/feed.xml`) e no `/llms.txt` e `/llms-full.txt` (para assistentes de IA). Não é preciso mexer em HTML.

## 1. Nome do arquivo

`AAAA-MM-DD-slug.md`, por exemplo `2026-12-01-atendimento-no-whatsapp.md`.

O slug vira o endereço: `https://agenticalab.com.br/blog/atendimento-no-whatsapp/`. Use só letras minúsculas, números e hífen, sem acento. Depois de publicado, não troque o slug: o endereço antigo deixaria de existir.

## 2. Cabeçalho (front-matter)

```
---
titulo: Atendimento no WhatsApp com agente: o que automatizar primeiro
descricao: As perguntas que se repetem, quando passar para um humano e como não perder o tom da marca.
data: 2026-12-01
atualizado: 2026-12-03
autor: Equipe AgenticaLab
categoria: atendimento
tags: [whatsapp, atendimento, primeiros passos]
imagem: /assets/img/agenticalab-shop-whatsapp.jpg
imagem_alt: Conversa de atendimento no WhatsApp
draft: false
faq:
  - q: O agente responde sozinho a qualquer pergunta?
    a: Não. Ele responde o que foi combinado e passa para uma pessoa do time o que estiver fora disso.
---
```

| Campo | Obrigatório | Para que serve |
| --- | --- | --- |
| `titulo` | sim | Título da página, do Google e das redes. Até uns 65 caracteres. |
| `descricao` | sim | Resumo que aparece no Google e nos cards. Entre 120 e 160 caracteres. |
| `data` | sim | Data de publicação (AAAA-MM-DD). Se faltar, vale a data do nome do arquivo. |
| `atualizado` | não | Data da última revisão. Aparece na página e no sitemap. |
| `autor` | não | Padrão: Equipe AgenticaLab. |
| `categoria` | sim | Uma destas: `atendimento`, `comercial`, `marketing`, `operacoes`, `casos`. |
| `tags` | não | Palavras-chave. Ajudam nos posts relacionados. |
| `imagem` | não | Capa (1200x630 de preferência) em `src/assets/img/`. Padrão: imagem do painel de agentes. |
| `imagem_alt` | não | Descrição da capa, para acessibilidade. |
| `draft` | não | `true` = rascunho: aparece só na prévia do PR, nunca no site, no sitemap ou no RSS. |
| `faq` | não | Perguntas e respostas no fim do post. Viram o bloco "Perguntas frequentes" e o FAQPage para o Google. |

Se faltar um campo obrigatório ou a categoria não existir, o build para e diz qual arquivo corrigir.

## 3. Texto

- Comece direto no primeiro parágrafo. O título (h1) vem do cabeçalho: não repita com `#`.
- Use `##` para as seções e `###` para subtópicos. Com duas seções `##` ou mais, a página ganha o sumário "Neste artigo".
- Aceita: **negrito**, *itálico*, [links](https://agenticalab.com.br/solucoes/), listas com `-` ou `1.`, citações com `>`, imagens `![descrição](/assets/img/arquivo.jpg)` e blocos de código.
- Links para páginas do próprio site ajudam no SEO: soluções, outros posts, o diagnóstico (`/#contato`).

## 4. Regras de conteúdo (as mesmas do site)

- O nome é sempre "AgenticaLab". O público é o "Dono de Negócio".
- Não invente resultado. Número só entra se for medido; exemplo não medido leva o aviso "ilustrativo".
- Responda a pergunta do título logo no começo: é isso que buscadores e assistentes de IA citam.
- Um post por assunto, com frases curtas e exemplos concretos.

## 5. Publicar

1. Crie o arquivo numa branch nova (`agente/post-<slug>`), como manda o `AGENTE.md`.
2. Rode `node build.mjs` e confira se o post aparece na lista de páginas geradas.
3. Abra o PR. A prévia do Cloudflare mostra o post, inclusive se ainda for rascunho.
4. O Andre revisa e faz o merge. O post vai ao ar sozinho, já no sitemap, no RSS e no llms.txt.

O exemplo `2026-11-24-o-que-e-um-agente-de-ia.md` mostra o formato completo e está como rascunho.
