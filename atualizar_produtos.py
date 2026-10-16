#!/usr/bin/env python3
"""
atualizar_produtos.py
---------------------
Lê o arquivo produtos.csv e atualiza o produtos.json com os campos:
  - nome, categoria, preco, precoAntigo, estoque, video

Campos não listados no CSV (imagens, descricao, tags, linkSite, destaque)
são preservados exatamente como estão no JSON.

Uso:
    python3 atualizar_produtos.py
    python3 atualizar_produtos.py --csv data/outro.csv
    python3 atualizar_produtos.py --dry-run   (mostra o que mudaria sem salvar)
"""

import json
import csv
import argparse
import copy
from pathlib import Path

# ── Caminhos padrão ───────────────────────────────────────────────────────────
BASE_DIR  = Path(__file__).parent
CSV_PATH  = BASE_DIR / "data" / "produtos.csv"
JSON_PATH = BASE_DIR / "data" / "produtos.json"

# ── Campos que o CSV pode atualizar ──────────────────────────────────────────
CAMPOS_ATUALIZAVEIS = {"nome", "categoria", "preco", "precoAntigo", "estoque", "video"}


def converter_valor(campo, valor):
    """Converte o valor string do CSV para o tipo correto do JSON."""
    if campo in ("preco", "precoAntigo"):
        if valor == "" or valor is None:
            return None
        return float(valor)
    if campo == "estoque":
        return int(valor)
    # nome, categoria, video — string pura
    return valor if valor != "" else (None if campo == "precoAntigo" else "")


def carregar_csv(caminho):
    """Retorna um dicionário {id: {campos...}} a partir do CSV (separador ;)."""
    dados = {}
    with open(caminho, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for linha in reader:
            pid = linha.get("id", "").strip()
            if not pid:
                continue
            dados[pid] = {k.strip(): v.strip() for k, v in linha.items()}
    return dados


def aplicar_atualizacoes(produtos_json, dados_csv, dry_run=False):
    """Aplica as atualizações do CSV no JSON. Retorna (lista_atualizada, resumo)."""
    produtos = copy.deepcopy(produtos_json)
    resumo = []

    # Indexa o JSON por id para busca rápida
    indice = {str(p["id"]): i for i, p in enumerate(produtos)}

    for pid, linha_csv in dados_csv.items():
        if pid not in indice:
            resumo.append(f"  ⚠️  ID {pid} ({linha_csv.get('nome','?')}) não encontrado no JSON — ignorado")
            continue

        idx = indice[pid]
        produto = produtos[idx]
        alteracoes = []

        for campo in CAMPOS_ATUALIZAVEIS:
            if campo not in linha_csv:
                continue
            novo = converter_valor(campo, linha_csv[campo])
            antigo = produto.get(campo)

            # Normaliza None vs "" para comparação
            if antigo == novo:
                continue
            if antigo is None and novo == "":
                continue
            if antigo == "" and novo is None:
                continue

            alteracoes.append(f"{campo}: {repr(antigo)} → {repr(novo)}")
            if not dry_run:
                produto[campo] = novo

        if alteracoes:
            resumo.append(f"  ✅  [{pid}] {produto['nome']}")
            for alt in alteracoes:
                resumo.append(f"       {alt}")
        
    return produtos, resumo


def main():
    parser = argparse.ArgumentParser(description="Atualiza produtos.json a partir de produtos.csv")
    parser.add_argument("--csv",     default=str(CSV_PATH), help="Caminho do CSV de entrada")
    parser.add_argument("--json",    default=str(JSON_PATH), help="Caminho do JSON a atualizar")
    parser.add_argument("--dry-run", action="store_true",   help="Simula sem salvar alterações")
    args = parser.parse_args()

    csv_path  = Path(args.csv)
    json_path = Path(args.json)

    # ── Validações ────────────────────────────────────────────────────────────
    if not csv_path.exists():
        print(f"❌ CSV não encontrado: {csv_path}")
        return
    if not json_path.exists():
        print(f"❌ JSON não encontrado: {json_path}")
        return

    # ── Carrega arquivos ──────────────────────────────────────────────────────
    print(f"📂 Lendo CSV:  {csv_path}")
    dados_csv = carregar_csv(csv_path)
    print(f"   {len(dados_csv)} produtos no CSV\n")

    print(f"📂 Lendo JSON: {json_path}")
    with open(json_path, encoding="utf-8") as f:
        produtos_json = json.load(f)
    print(f"   {len(produtos_json)} produtos no JSON\n")

    # ── Aplica atualizações ───────────────────────────────────────────────────
    modo = "🔍 SIMULAÇÃO (dry-run)" if args.dry_run else "🔄 Aplicando alterações"
    print(f"{modo}\n" + "─" * 50)

    produtos_atualizados, resumo = aplicar_atualizacoes(
        produtos_json, dados_csv, dry_run=args.dry_run
    )

    if resumo:
        print("\n".join(resumo))
    else:
        print("  ✨ Nenhuma alteração detectada — JSON já está atualizado.")

    # ── Salva ─────────────────────────────────────────────────────────────────
    if not args.dry_run:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(produtos_atualizados, f, ensure_ascii=False, indent=2)
        alterados = sum(1 for r in resumo if r.strip().startswith("✅"))
        print(f"\n✅ produtos.json salvo com {alterados} produto(s) atualizado(s).")
    else:
        print("\n⚠️  Modo dry-run: nenhum arquivo foi modificado.")


if __name__ == "__main__":
    main()
