// AgenticaLab · capa padrão dos posts (1200x630) com o título, na identidade da marca.
// Gera SVG sempre; gera PNG (para redes sociais e Google) quando o pacote @resvg/resvg-js está instalado.
// No Cloudflare Pages o "npm install" roda sozinho por causa do package.json. Sem o pacote, o post usa a imagem padrão.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Obs.: as fontes do brandbook são variáveis e o gerador usa o peso padrão; o contorno da mesma cor engrossa o traço.
// Quebra o título em linhas pela largura estimada (Inter bold ~0,56 da altura por caractere).
function linhas(texto, tamanho, largura) {
  const max = Math.floor(largura / (tamanho * 0.56)), out = [];
  let atual = '';
  for (const p of String(texto).split(/\s+/)) {
    if ((atual + ' ' + p).trim().length > max && atual) { out.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
  }
  if (atual) out.push(atual);
  return out;
}

export function svgCapa({ titulo, categoria }) {
  let tam = 72, ls = linhas(titulo, tam, 1000);
  while (ls.length > 4 && tam > 44) { tam -= 6; ls = linhas(titulo, tam, 1000); }
  if (ls.length > 5) { ls = ls.slice(0, 5); ls[4] = ls[4].replace(/\s*\S*$/, '') + '…'; }
  const alt = tam * 1.12, topo = 250 + Math.max(0, (4 - ls.length)) * alt * 0.35;
  const grade = Array.from({ length: 18 }, (_, i) => `<path d="M${i * 70} 0V${H}" />`).join('') + Array.from({ length: 10 }, (_, i) => `<path d="M0 ${i * 70}H${W}" />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g" cx="0.9" cy="0.05" r="0.75"><stop offset="0" stop-color="#6B3BF5" stop-opacity=".45"/><stop offset="1" stop-color="#6B3BF5" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".85" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#1E1E25"/>
  <g stroke="#F4F2F7" stroke-opacity=".05" stroke-width="1" mask="url(#m)">${grade}</g>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g transform="translate(96 84) scale(0.2)"><path fill="#6B3BF5" d="M160 9 C178 9 193 19 202 35 L307 221 C316 237 305 248 288 248 H272 C261 248 253 243 247 232 L145 55 C132 33 139 9 160 9Z"/><path fill="#F4F2F7" d="M153 9 C174 6 189 18 186 36 C185 42 183 47 179 53 L77 231 C70 243 63 248 49 248 H31 C13 248 5 234 13 220 L123 32 C130 19 139 11 153 9Z"/><path fill="#FF6B2C" d="M96 211 H223 L244 248 H75Z"/></g>
  <text x="170" y="123" font-family="Space Grotesk" font-weight="700" font-size="34" fill="#F4F2F7" stroke="#F4F2F7" stroke-width="1.2" letter-spacing="-0.5">AgenticaLab</text>
  ${categoria ? `<text x="96" y="${topo - tam - 12}" font-family="Inter" font-weight="800" font-size="22" fill="#FF6B2C" stroke="#FF6B2C" stroke-width="0.8" letter-spacing="4">${esc(String(categoria).toUpperCase())}</text>` : ''}
  ${ls.map((l, i) => `<text x="96" y="${topo + i * alt}" font-family="Inter" font-weight="800" font-size="${tam}" fill="#F4F2F7" stroke="#F4F2F7" stroke-width="${(tam * 0.045).toFixed(1)}" stroke-linejoin="round" letter-spacing="${-tam * 0.02}">${esc(l)}</text>`).join('\n  ')}
  <rect x="96" y="${H - 96}" width="64" height="6" fill="#FF6B2C"/>
  <text x="180" y="${H - 86}" font-family="Inter" font-weight="600" font-size="24" fill="#B7AAC4">agenticalab.com.br/blog</text>
</svg>`;
}

let renderer; // undefined = ainda não tentou; null = indisponível
async function carregar(root) {
  if (renderer !== undefined) return renderer;
  try {
    const { Resvg } = await import('@resvg/resvg-js');
    const fontFiles = ['Inter.ttf', 'SpaceGrotesk.ttf'].map(f => join(root, 'src', 'brandbook', 'fontes', f));
    fontFiles.forEach(f => readFileSync(f)); // confere se as fontes existem
    renderer = svg => new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  } catch (e) {
    console.log(`Aviso: capas em PNG desligadas (${e.code || e.message}). Rode "npm install" para gerar as capas dos posts.`);
    renderer = null;
  }
  return renderer;
}

// Devolve o PNG (Buffer) ou null quando o gerador não está disponível.
export async function pngCapa(root, dados) {
  const r = await carregar(root);
  return r ? r(svgCapa(dados)) : null;
}
