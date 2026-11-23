# Instruções para o agente que edita o site

Você edita o site agenticalab.com.br a pedido do Andre. Toda mudança vira um pull request (PR) no GitHub. Quem aprova e publica é sempre o Andre, fazendo o merge. A branch `main` é protegida: o GitHub recusa push direto nela. Depois do merge, o Cloudflare Pages publica sozinho.

## Regras que não mudam

- Nunca faça push na branch principal (`main`). Sempre trabalhe numa branch nova.
- Nunca faça merge, nem aprove o próprio PR.
- Este repositório é público: tudo o que você escrever aqui fica visível para qualquer pessoa.
- Nunca coloque token, senha ou chave em arquivo do repositório.
- Um pedido = um PR. Se o Andre pedir duas coisas sem relação, abra dois PRs.

## Regras da marca

- O nome é sempre "AgenticaLab", numa palavra.
- Use só as cores da marca: `#1E1E25`, `#6B3BF5`, `#FF6B2C`, `#F4F2F7` e `#B7AAC4`. Fontes: Inter e Space Grotesk.
- O botão principal diz "Quero um diagnóstico gratuito". O público é chamado de "Dono de Negócio".
- Não invente resultado. Número só entra se for medido. Exemplo ou número que não foi medido leva o aviso "ilustrativo".
- "10+ horas por semana" é hipótese e não pode aparecer como promessa.
- Não há tagline enquanto o Andre não definir uma.

## Onde fica cada coisa

| O que mudar | Arquivo |
| --- | --- |
| Landing (página inicial) | `src/index.html` |
| Página Soluções | `src/solucoes/index.html` |
| Textos dos produtos (cards, páginas, slug) | `data/produtos.json` |
| Layout das páginas de produto e textos fixos delas | `templates/produto.html` |
| Menu | `partials/header.html` |
| Rodapé | `partials/footer.html` |
| Cores, fontes, espaçamentos | `src/assets/css/site.css` |
| Post do Blog | `content/blog/AAAA-MM-DD-slug.md` (formato em `content/blog/README.md`) |
| Layout do Blog e dos posts | `templates/blog.html`, `templates/post.html`, `blog.mjs` |
| Imagens | `src/assets/img/` |
| Página nova | `src/<nome>/index.html`, começando pelo bloco de configuração (veja `README.md`) |

O Brandbook (`src/brandbook/`) é interno: não mude, não coloque link para ele no menu nem no rodapé.

Para esconder um bloco, apague o trecho do HTML ou o campo no JSON. Não use `display:none`.

## Passo a passo de cada pedido

1. Atualize a branch principal: `git fetch origin main` e crie a sua a partir dela: `git checkout -b agente/<resumo-curto> origin/main`.
2. Faça a mudança nos arquivos da tabela acima.
3. Gere o site e confira se não deu erro: `node build.mjs`. A saída lista as páginas geradas. Se der erro, corrija antes de seguir.
4. Faça o commit com uma mensagem em português que diga o que mudou: `git add -A && git commit -m "Landing: troca o título do topo"`.
5. Envie a branch: `git push -u origin agente/<resumo-curto>`.
6. Abra o PR com base na branch principal:
   `gh pr create --base main --title "<o que mudou>" --body "<o pedido do Andre e a lista do que foi alterado>"`
7. Responda ao Andre com o link do PR. O Cloudflare comenta no PR um link de prévia em 1 ou 2 minutos; mande esse link também quando aparecer.

Se o Andre pedir ajuste no mesmo assunto, faça novos commits na mesma branch. O PR e a prévia se atualizam sozinhos.

## Se algo der errado

- Se o pedido não estiver claro, pergunte antes de mexer.
- Se `node build.mjs` falhar e você não souber corrigir, não abra o PR: mande ao Andre o erro e o que tentou.
- Se o push for recusado, não force. Avise o Andre.
