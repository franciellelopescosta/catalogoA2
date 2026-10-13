/**
 * CatálogoA2 - Sistema de catálogo de produtos
 * Suporta 400+ produtos com paginação, filtros e modal detalhado
 */

const CONFIG = {
  PRODUTOS_POR_PAGINA: 24,
  DELAY_BUSCA_MS: 300,
};

// Estado global da aplicação
const state = {
  produtos: [],
  filtrados: [],
  paginaAtual: 1,
  categoriaSelecionada: 'todas',
  termoBusca: '',
  ordenacao: 'padrao',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Inicialização ────────────────────────────────────────────────────────────

async function init() {
  mostrarSkeleton();
  try {
    const resp = await fetch('./data/produtos.json');
    if (!resp.ok) throw new Error('Erro ao carregar produtos');
    state.produtos = await resp.json();
  } catch (e) {
    mostrarErro(e.message);
    return;
  }
  construirCategorias();
  aplicarFiltros();
  registrarEventos();
}

// ─── Categorias ───────────────────────────────────────────────────────────────

function construirCategorias() {
  const cats = ['todas', ...new Set(state.produtos.map((p) => p.categoria))];
  const nav = $('#categorias-nav');
  nav.innerHTML = cats
    .map(
      (c) => `
    <button
      data-cat="${c}"
      class="cat-btn px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
             ${c === 'todas'
               ? 'bg-indigo-600 text-white shadow-md'
               : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400 hover:text-indigo-600'}"
    >${c === 'todas' ? '🏷️ Todas' : c}</button>`
    )
    .join('');
}

// ─── Filtros e Ordenação ──────────────────────────────────────────────────────

function aplicarFiltros() {
  let lista = [...state.produtos];

  if (state.categoriaSelecionada !== 'todas') {
    lista = lista.filter((p) => p.categoria === state.categoriaSelecionada);
  }

  if (state.termoBusca) {
    const t = state.termoBusca.toLowerCase();
    lista = lista.filter(
      (p) =>
        p.nome.toLowerCase().includes(t) ||
        p.descricao.toLowerCase().includes(t) ||
        p.tags.some((tag) => tag.toLowerCase().includes(t))
    );
  }

  switch (state.ordenacao) {
    case 'menor-preco':  lista.sort((a, b) => a.preco - b.preco); break;
    case 'maior-preco':  lista.sort((a, b) => b.preco - a.preco); break;
    case 'destaque':     lista.sort((a, b) => Number(b.destaque) - Number(a.destaque)); break;
    case 'nome-az':      lista.sort((a, b) => a.nome.localeCompare(b.nome)); break;
  }

  state.filtrados = lista;
  state.paginaAtual = 1;
  renderizarGrid();
  renderizarPaginacao();
  atualizarContador();
}

// ─── Renderização do Grid ─────────────────────────────────────────────────────

function renderizarGrid() {
  const inicio = (state.paginaAtual - 1) * CONFIG.PRODUTOS_POR_PAGINA;
  const fim    = inicio + CONFIG.PRODUTOS_POR_PAGINA;
  const pagina = state.filtrados.slice(inicio, fim);
  const grid   = $('#grid-produtos');

  if (pagina.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-24 text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p class="text-lg font-medium">Nenhum produto encontrado</p>
        <p class="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
      </div>`;
    return;
  }

  grid.innerHTML = pagina.map(renderCard).join('');

  requestAnimationFrame(() => {
    $$('.produto-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 30);
    });
  });
}

function renderCard(p) {
  const desconto  = p.precoAntigo
    ? Math.round(((p.precoAntigo - p.preco) / p.precoAntigo) * 100)
    : null;
  const semEstoque = p.estoque === 0;

  return `
  <article
    class="produto-card group bg-white rounded-2xl shadow-sm border border-gray-100
           hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes de ${p.nome}"
  >
    <div class="relative overflow-hidden aspect-square bg-gray-50">
      <img
        src="${p.imagens[0]}" alt="${p.nome}" loading="lazy"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${semEstoque ? 'opacity-50' : ''}"
        onerror="this.src='https://placehold.co/400x400/f3f4f6/9ca3af?text=Sem+Imagem'"
      />
      <div class="absolute top-2 left-2 flex flex-col gap-1">
        ${desconto   ? `<span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-${desconto}%</span>` : ''}
        ${p.destaque ? `<span class="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">⭐ Destaque</span>` : ''}
        ${semEstoque ? `<span class="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Esgotado</span>` : ''}
      </div>
      ${p.video ? `
        <div class="absolute bottom-2 right-2 bg-red-600 rounded-full p-1.5 shadow-lg opacity-90">
          <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>` : ''}
      ${p.imagens.length > 1 ? `
        <div class="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
          📷 ${p.imagens.length}
        </div>` : ''}
    </div>

    <div class="p-4 flex flex-col gap-2">
      <span class="text-xs font-medium text-indigo-500 uppercase tracking-wide">${p.categoria}</span>
      <h3 class="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
        ${p.nome}
      </h3>
      <p class="text-xs text-gray-400 line-clamp-2 leading-relaxed">${p.descricao}</p>
      <div class="mt-auto pt-2 flex items-end justify-between">
        <div>
          ${p.precoAntigo ? `<p class="text-xs text-gray-400 line-through">R$ ${p.precoAntigo.toFixed(2).replace('.', ',')}</p>` : ''}
          <p class="text-lg font-bold text-gray-900">R$ ${p.preco.toFixed(2).replace('.', ',')}</p>
        </div>
        <button
          class="ver-mais text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white
                 font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          data-id="${p.id}"
        >Ver mais</button>
      </div>
    </div>
  </article>`;
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function renderizarPaginacao() {
  const total = Math.ceil(state.filtrados.length / CONFIG.PRODUTOS_POR_PAGINA);
  const pag   = $('#paginacao');

  if (total <= 1) { pag.innerHTML = ''; return; }

  const atual = state.paginaAtual;
  const pages = calcularJanelaPaginas(atual, total);

  pag.innerHTML = `
    <nav class="flex items-center gap-1" aria-label="Paginação">
      <button data-page="${atual - 1}" ${atual === 1 ? 'disabled' : ''}
        class="pag-btn px-3 py-2 rounded-lg text-sm font-medium transition-all
               ${atual === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}">
        ← Anterior
      </button>
      ${pages.map((p) =>
          p === '...'
            ? `<span class="px-2 py-2 text-gray-400 text-sm">…</span>`
            : `<button data-page="${p}"
                 class="pag-btn w-9 h-9 rounded-lg text-sm font-medium transition-all
                        ${p === atual ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}">
                 ${p}
               </button>`
        ).join('')}
      <button data-page="${atual + 1}" ${atual === total ? 'disabled' : ''}
        class="pag-btn px-3 py-2 rounded-lg text-sm font-medium transition-all
               ${atual === total ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}">
        Próximo →
      </button>
    </nav>`;
}

function calcularJanelaPaginas(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (atual > 3) pages.push('...');
  for (let i = Math.max(2, atual - 1); i <= Math.min(total - 1, atual + 1); i++) pages.push(i);
  if (atual < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ─── Modal de Produto ─────────────────────────────────────────────────────────

function abrirModal(id) {
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) return;

  const modal    = $('#modal');
  const conteudo = $('#modal-conteudo');

  const desconto = produto.precoAntigo
    ? Math.round(((produto.precoAntigo - produto.preco) / produto.precoAntigo) * 100)
    : null;

  conteudo.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-6 max-h-[85vh] overflow-y-auto lg:overflow-hidden">

      <div class="lg:w-1/2 flex flex-col gap-3 lg:overflow-y-auto lg:max-h-[80vh] shrink-0">
        <div id="midia-principal" class="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
          <img src="${produto.imagens[0]}" alt="${produto.nome}" class="w-full h-full object-cover"
               onerror="this.src='https://placehold.co/600x600/f3f4f6/9ca3af?text=Sem+Imagem'"/>
        </div>
        <div class="flex gap-2 flex-wrap">
          ${produto.imagens.map((img, i) => `
            <button class="miniatura w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                           ${i === 0 ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-400'}"
                    data-index="${i}" data-tipo="imagem" data-src="${img}">
              <img src="${img}" alt="Imagem ${i + 1}" class="w-full h-full object-cover" loading="lazy"
                   onerror="this.src='https://placehold.co/64x64/f3f4f6/9ca3af?text=?'"/>
            </button>`).join('')}
          ${produto.video ? `
            <button class="miniatura w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200
                           hover:border-red-400 relative bg-red-50 flex items-center justify-center transition-all"
                    data-tipo="video" data-src="${produto.video}">
              <svg class="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span class="absolute bottom-0 inset-x-0 bg-red-500 text-white text-[9px] text-center py-0.5">▶ Video</span>
            </button>` : ''}
        </div>
      </div>

      <div class="lg:w-1/2 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[80vh] lg:pr-1">
        <div>
          <span class="text-xs font-semibold text-indigo-500 uppercase tracking-widest">${produto.categoria}</span>
          <h2 class="text-2xl font-bold text-gray-900 mt-1 leading-tight">${produto.nome}</h2>
        </div>

        <div class="flex flex-wrap gap-2">
          ${produto.destaque ? `<span class="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">⭐ Produto em Destaque</span>` : ''}
          ${produto.estoque === 0
            ? `<span class="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">Sem estoque</span>`
            : produto.estoque <= 5
            ? `<span class="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">⚠️ Últimas ${produto.estoque} unidades</span>`
            : `<span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">✓ Em estoque</span>`}
          ${produto.video ? `<span class="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">▶ Com vídeo</span>` : ''}
        </div>

        <div class="bg-gray-50 rounded-xl p-4">
          ${produto.precoAntigo ? `
            <div class="flex items-center gap-2 mb-1">
              <span class="text-gray-400 text-sm line-through">R$ ${produto.precoAntigo.toFixed(2).replace('.', ',')}</span>
              <span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-${desconto}% OFF</span>
            </div>` : ''}
          <p class="text-3xl font-extrabold text-gray-900">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
          ${produto.precoAntigo ? `<p class="text-xs text-green-600 mt-1">Você economiza R$ ${(produto.precoAntigo - produto.preco).toFixed(2).replace('.', ',')}</p>` : ''}
        </div>

        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-1">Descrição</h3>
          <p class="text-sm text-gray-500 leading-relaxed">${produto.descricao}</p>
        </div>

        <div class="flex flex-wrap gap-1.5">
          ${produto.tags.map((t) => `<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full">#${t}</span>`).join('')}
        </div>

        <div class="mt-auto pt-2">
          ${produto.linkSite
            ? `<a href="${produto.linkSite}" target="_blank" rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full
                         bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                         py-3 px-6 rounded-xl transition-all duration-200 active:scale-95
                         ${produto.estoque === 0 ? 'opacity-50 pointer-events-none' : ''}"
                  ${produto.estoque === 0 ? 'aria-disabled="true" tabindex="-1"' : ''}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                ${produto.estoque === 0 ? 'Produto Esgotado' : 'Ver no Site'}
              </a>`
            : `<p class="text-center text-sm text-gray-400 py-3">Link do produto não configurado</p>`}
        </div>
      </div>
    </div>`;

  // Eventos das miniaturas
  conteudo.querySelectorAll('.miniatura').forEach((btn) => {
    btn.addEventListener('click', () => {
      conteudo.querySelectorAll('.miniatura').forEach((b) => {
        b.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-200', 'border-red-400');
        b.classList.add('border-gray-200');
      });

      const tipo  = btn.dataset.tipo;
      const src   = btn.dataset.src;
      const midia = conteudo.querySelector('#midia-principal');

      if (tipo === 'video') {
        btn.classList.add('border-red-400');
        midia.innerHTML = `
          <iframe src="${src}?autoplay=1&rel=0" class="w-full h-full" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen title="Vídeo de ${produto.nome}"></iframe>`;
      } else {
        btn.classList.add('border-indigo-500', 'ring-2', 'ring-indigo-200');
        midia.innerHTML = `
          <img src="${src}" alt="${produto.nome}" class="w-full h-full object-cover"
               onerror="this.src='https://placehold.co/600x600/f3f4f6/9ca3af?text=Sem+Imagem'"/>`;
      }
    });
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
  setTimeout(() => conteudo.focus(), 50);
}

function fecharModal() {
  const modal  = $('#modal');
  const iframe = modal.querySelector('iframe');
  if (iframe) iframe.src = '';
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

// ─── Utilitários de UI ────────────────────────────────────────────────────────

function atualizarContador() {
  const el    = $('#contador');
  const total = state.filtrados.length;
  const inicio = (state.paginaAtual - 1) * CONFIG.PRODUTOS_POR_PAGINA + 1;
  const fim    = Math.min(state.paginaAtual * CONFIG.PRODUTOS_POR_PAGINA, total);
  if (total === 0) { el.textContent = 'Nenhum produto'; return; }
  el.textContent = `Exibindo ${inicio}–${fim} de ${total} produto${total > 1 ? 's' : ''}`;
}

function mostrarSkeleton() {
  $('#grid-produtos').innerHTML = Array(8).fill(0).map(() => `
    <div class="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div class="aspect-square bg-gray-200"></div>
      <div class="p-4 space-y-2">
        <div class="h-3 bg-gray-200 rounded w-1/3"></div>
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        <div class="h-3 bg-gray-200 rounded w-full"></div>
        <div class="h-3 bg-gray-200 rounded w-4/5"></div>
        <div class="flex justify-between items-end mt-3">
          <div class="h-6 bg-gray-200 rounded w-1/3"></div>
          <div class="h-7 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>`).join('');
}

function mostrarErro(msg) {
  $('#grid-produtos').innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-24 text-red-400">
      <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="font-medium">${msg}</p>
    </div>`;
}

// ─── Impressão / PDF ──────────────────────────────────────────────────────────

function imprimirCatalogo() {
  const lista = state.filtrados;
  if (lista.length === 0) {
    alert('Nenhum produto para imprimir com os filtros atuais.');
    return;
  }

  const btn = $('#btn-imprimir');
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
    <span class="hidden sm:inline">Preparando…</span>`;

  const catLabel = state.categoriaSelecionada === 'todas'
    ? 'Todos os Produtos'
    : state.categoriaSelecionada;

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Remove iframe anterior se existir
  const antigo = document.getElementById('print-frame');
  if (antigo) antigo.remove();

  // Cria iframe oculto — não é bloqueado por popup blocker
  const frame = document.createElement('iframe');
  frame.id = 'print-frame';
  frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(montarHTMLImpressao(lista, catLabel, dataAtual));
  doc.close();

  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(restaurarBotaoImprimir, 1000);
    }, 900);
  };
}

function restaurarBotaoImprimir() {
  const btn = $('#btn-imprimir');
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
    </svg>
    <span class="hidden sm:inline">Baixar PDF</span>`;
}

function montarHTMLImpressao(lista, catLabel, dataAtual) {
  const totalCats = [...new Set(lista.map((p) => p.categoria))].length;
  const totalDest = lista.filter((p) => p.destaque).length;

  const estilos = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #fff; color: #111827; }

    .capa {
      width: 100%; min-height: 100vh;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      page-break-after: always; break-after: page;
      padding: 60px 40px; text-align: center; color: #fff;
    }
    .capa-logo {
      width: 72px; height: 72px;
      background: rgba(255,255,255,0.15); border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 28px;
    }
    .capa-logo svg { width: 40px; height: 40px; }
    .capa h1 { font-size: 52px; font-weight: 800; letter-spacing: -1px; line-height: 1.1; }
    .capa h2 { font-size: 26px; font-weight: 600; margin-top: 12px; opacity: 0.85; }
    .capa-linha { width: 80px; height: 4px; background: rgba(255,255,255,0.4); border-radius: 4px; margin: 28px auto; }
    .capa-meta { font-size: 15px; opacity: 0.7; }
    .capa-aviso {
      margin-top: 16px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 12px;
      line-height: 1.6;
      opacity: 0.85;
      max-width: 520px;
    }
    .capa-stats {
      display: flex; gap: 32px; margin-top: 48px;
      background: rgba(255,255,255,0.1); border-radius: 20px; padding: 24px 40px;
    }
    .capa-stat { text-align: center; }
    .capa-stat strong { display: block; font-size: 36px; font-weight: 800; }
    .capa-stat span { font-size: 13px; opacity: 0.75; margin-top: 4px; display: block; }

    .secao-header {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0 8px;
      border-bottom: 2px solid #4f46e5;
      margin: 20px 0 16px;
    }
    .secao-header h2 {
      font-size: 18px; font-weight: 700; color: #4f46e5;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .secao-count {
      font-size: 12px; color: #6b7280; background: #f3f4f6;
      padding: 3px 10px; border-radius: 99px;
    }

    .print-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 14px; padding: 0 0 20px;
    }

    .print-card {
      border: 1px solid #e5e7eb; border-radius: 12px;
      overflow: hidden; background: #fff;
      page-break-inside: avoid; break-inside: avoid;
      display: flex; flex-direction: column;
    }
    .print-card.esgotado { opacity: 0.55; }
    .print-card-img { position: relative; aspect-ratio: 1; background: #f9fafb; overflow: hidden; }
    .print-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .badge-desconto {
      position: absolute; top: 6px; left: 6px;
      background: #ef4444; color: #fff;
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
    }
    .badge-destaque {
      position: absolute; top: 6px; right: 6px;
      background: #f59e0b; color: #fff;
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
    }
    .badge-esgotado {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.55); color: #fff;
      font-size: 10px; font-weight: 600; text-align: center; padding: 4px 0;
    }

    .print-card-body {
      padding: 10px 11px 12px;
      display: flex; flex-direction: column; gap: 4px; flex: 1;
    }
    .print-categoria {
      font-size: 9px; font-weight: 600; color: #6366f1;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .print-nome {
      font-size: 12px; font-weight: 700; color: #111827; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .print-desc {
      font-size: 9.5px; color: #6b7280; line-height: 1.45; margin-top: 1px;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .print-preco-wrap {
      margin-top: auto; padding-top: 7px;
      display: flex; align-items: baseline; gap: 6px;
    }
    .print-preco { font-size: 15px; font-weight: 800; color: #111827; }
    .print-preco-antigo { font-size: 10px; color: #9ca3af; text-decoration: line-through; }
    .print-link {
      font-size: 8.5px; color: #6366f1; margin-top: 5px;
      display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    @page { size: A4 portrait; margin: 14mm 12mm 16mm; }
  `;

  const secoes = gerarSecoesPrint(lista);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Catálogo A2 — ${catLabel}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>${estilos}</style>
</head>
<body>
  <div class="capa">
    <div class="capa-logo">
      <svg fill="none" stroke="white" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
      </svg>
    </div>
    <h1>CatálogoA2</h1>
    <h2>${catLabel}</h2>
    <div class="capa-linha"></div>
    <p class="capa-meta">Gerado em ${dataAtual}</p>
    <p class="capa-aviso">
      ⚠️ Os preços exibidos neste catálogo são informativos e podem sofrer alterações sem aviso prévio.
      Consulte sempre o site para conferir o valor atualizado antes de finalizar sua compra.
    </p>
    <div class="capa-stats">
      <div class="capa-stat">
        <strong>${lista.length}</strong>
        <span>Produto${lista.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="capa-stat">
        <strong>${totalCats}</strong>
        <span>Categoria${totalCats !== 1 ? 's' : ''}</span>
      </div>
      <div class="capa-stat">
        <strong>${totalDest}</strong>
        <span>Destaque${totalDest !== 1 ? 's' : ''}</span>
      </div>
    </div>
  </div>
  <div>${secoes}</div>
</body>
</html>`;
}

function gerarSecoesPrint(lista) {
  if (state.categoriaSelecionada !== 'todas') {
    return `
      <div class="secao-header">
        <h2>${state.categoriaSelecionada}</h2>
        <span class="secao-count">${lista.length} produto${lista.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="print-grid">${lista.map(renderCardPrint).join('')}</div>`;
  }

  const grupos = lista.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = [];
    acc[p.categoria].push(p);
    return acc;
  }, {});

  return Object.entries(grupos).map(([cat, produtos]) => `
    <div class="secao-header">
      <h2>${cat}</h2>
      <span class="secao-count">${produtos.length} produto${produtos.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="print-grid">${produtos.map(renderCardPrint).join('')}</div>
  `).join('');
}

function renderCardPrint(p) {
  const desconto   = p.precoAntigo
    ? Math.round(((p.precoAntigo - p.preco) / p.precoAntigo) * 100)
    : null;
  const semEstoque = p.estoque === 0;

  return `
    <div class="print-card ${semEstoque ? 'esgotado' : ''}">
      <div class="print-card-img">
        <img src="${p.imagens[0]}" alt="${p.nome}"
             onerror="this.src='https://placehold.co/300x300/f3f4f6/9ca3af?text=Sem+Imagem'"/>
        ${desconto   ? `<span class="badge-desconto">-${desconto}%</span>` : ''}
        ${p.destaque ? `<span class="badge-destaque">★ Destaque</span>`   : ''}
        ${semEstoque ? `<span class="badge-esgotado">Esgotado</span>`      : ''}
      </div>
      <div class="print-card-body">
        <span class="print-categoria">${p.categoria}</span>
        <h3 class="print-nome">${p.nome}</h3>
        <p class="print-desc">${p.descricao}</p>
        <div class="print-preco-wrap">
          ${p.precoAntigo
            ? `<span class="print-preco-antigo">R$ ${p.precoAntigo.toFixed(2).replace('.', ',')}</span>`
            : ''}
          <span class="print-preco">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
        </div>
        ${p.linkSite
          ? `<span class="print-link">${p.linkSite.replace(/^https?:\/\//, '')}</span>`
          : ''}
      </div>
    </div>`;
}

// ─── Registro de Eventos ──────────────────────────────────────────────────────

let timerBusca;
function registrarEventos() {

  $('#busca').addEventListener('input', (e) => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(() => {
      state.termoBusca = e.target.value.trim();
      aplicarFiltros();
    }, CONFIG.DELAY_BUSCA_MS);
  });

  $('#ordenacao').addEventListener('change', (e) => {
    state.ordenacao = e.target.value;
    aplicarFiltros();
  });

  $('#categorias-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    $$('.cat-btn').forEach((b) => {
      b.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
      b.classList.add('bg-white', 'text-gray-600', 'border', 'border-gray-200');
    });
    btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
    btn.classList.remove('bg-white', 'text-gray-600', 'border', 'border-gray-200');
    state.categoriaSelecionada = btn.dataset.cat;
    aplicarFiltros();
  });

  $('#grid-produtos').addEventListener('click', (e) => {
    const btn  = e.target.closest('.ver-mais');
    const card = e.target.closest('.produto-card');
    if (btn && !btn.disabled) {
      e.stopPropagation();
      abrirModal(Number(btn.dataset.id));
    } else if (card) {
      abrirModal(Number(card.dataset.id));
    }
  });

  $('#grid-produtos').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.produto-card');
      if (card) { e.preventDefault(); abrirModal(Number(card.dataset.id)); }
    }
  });

  $('#paginacao').addEventListener('click', (e) => {
    const btn = e.target.closest('.pag-btn');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    const max  = Math.ceil(state.filtrados.length / CONFIG.PRODUTOS_POR_PAGINA);
    if (page < 1 || page > max) return;
    state.paginaAtual = page;
    renderizarGrid();
    renderizarPaginacao();
    atualizarContador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModal();
  });
  $('#btn-fechar-modal').addEventListener('click', fecharModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });

  $('#btn-imprimir').addEventListener('click', imprimirCatalogo);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
