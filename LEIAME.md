# CatálogoA2

Catálogo de produtos leve, responsivo e sem dependências de build — suporta 400+ produtos.

## Estrutura de arquivos

```
catalogoA2/
├── index.html          # Página principal
├── css/
│   └── custom.css      # Estilos complementares ao Tailwind
├── js/
│   └── app.js          # Toda a lógica do catálogo
├── data/
│   └── produtos.json   # Base de dados dos produtos (edite aqui!)
└── assets/
    └── images/         # Imagens locais (opcional)
```

## Como adicionar produtos

Edite o arquivo `data/produtos.json`. Cada produto segue este formato:

```json
{
  "id": 99,
  "nome": "Nome do Produto",
  "categoria": "Categoria",
  "preco": 199.90,
  "precoAntigo": 249.90,        // null se não houver desconto
  "descricao": "Descrição completa do produto.",
  "imagens": [
    "https://url-da-imagem-1.jpg",
    "https://url-da-imagem-2.jpg",   // opcional (até 3 imagens)
    "https://url-da-imagem-3.jpg"    // opcional
  ],
  "video": "https://www.youtube.com/embed/ID_DO_VIDEO",  // null se não houver
  "estoque": 10,                // 0 = exibe como esgotado
  "destaque": false,            // true = badge dourado
  "tags": ["tag1", "tag2"],     // para busca
  "linkSite": "https://seusite.com.br/produto/slug-do-produto"  // link para o seu site
}
```

> O botão **"Ver no Site"** abre `linkSite` em uma nova aba. Se o produto estiver com `estoque: 0`, o botão fica desabilitado. Se `linkSite` for omitido ou `null`, o botão não aparece.

### Como obter o link embed do YouTube

1. Acesse o vídeo no YouTube
2. Clique em **Compartilhar → Incorporar**
3. Copie apenas a URL do `src` do iframe, ex: `https://www.youtube.com/embed/dQw4w9WgXcQ`

## Como rodar localmente

**Opção 1 — VS Code Live Server** (recomendado)  
Instale a extensão Live Server e clique em "Go Live".

**Opção 2 — Python**  
```bash
python3 -m http.server 8080
# acesse http://localhost:8080
```

**Opção 3 — Node.js**  
```bash
npx serve .
```

> ⚠️ Não abra o `index.html` diretamente como arquivo local (`file://`) pois o `fetch()` do JSON será bloqueado pelo navegador. Use um servidor HTTP.

## Configurações do catálogo (`js/app.js`)

```js
const CONFIG = {
  PRODUTOS_POR_PAGINA: 24,   // quantos cards por página
  DELAY_BUSCA_MS: 300,       // debounce da busca em ms
};
```

## Funcionalidades

- ✅ Suporte a 400+ produtos com paginação
- ✅ Filtro por categoria (gerado automaticamente)
- ✅ Busca por nome, descrição e tags com debounce
- ✅ Ordenação por preço, destaque e nome
- ✅ Modal detalhado com galeria de imagens (1–3)
- ✅ Player de vídeo do YouTube embutido no modal
- ✅ Indicador de estoque (disponível / últimas unidades / esgotado)
- ✅ Badges de desconto calculados automaticamente
- ✅ Lazy loading em todas as imagens
- ✅ Skeleton loading enquanto carrega
- ✅ Acessível: ARIA labels, foco por teclado, Escape fecha o modal
- ✅ Responsivo: 2 colunas no mobile até 6 no desktop
- ✅ Zero dependências de build — TailwindCSS via CDN
