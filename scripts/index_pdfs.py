#!/usr/bin/env python3
"""
PathWise — scripts/index_pdfs.py
Script autonome pour indexer tous les PDFs dans ChromaDB.

Usage :
    python scripts/index_pdfs.py                  # indexe tous les PDFs
    python scripts/index_pdfs.py --reset          # vide la collection puis réindexe
    python scripts/index_pdfs.py --seed           # ajoute les ressources de démo
    python scripts/index_pdfs.py --test "query"   # teste une recherche
"""

import sys
import os
import argparse
from pathlib import Path

# Ajouter backend/ au path Python
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from rag_pipeline import (
    index_all_pdfs,
    search_resources,
    seed_demo_resources,
    get_chroma_collection,
    PDF_DIR,
    COLLECTION_NAME,
)


def cmd_reset(collection):
    print(f"  Suppression de la collection '{COLLECTION_NAME}'...")
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(Path(__file__).parent.parent / "data" / "vector_store"))
        client.delete_collection(COLLECTION_NAME)
        print("    Collection supprimée")
    except Exception as e:
        print(f"     {e}")


def cmd_stats(collection):
    n = collection.count()
    print(f"\n Collection '{COLLECTION_NAME}'")
    print(f"   Chunks indexés : {n}")
    if n > 0:
        sample = collection.get(limit=5, include=["metadatas"])
        sources = set(m.get("source", "?") for m in sample["metadatas"])
        print(f"   Sources (échantillon) : {', '.join(sources)}")


def main():
    parser = argparse.ArgumentParser(description="PathWise — Indexeur PDF ChromaDB")
    parser.add_argument("--reset", action="store_true", help="Vide la collection avant d'indexer")
    parser.add_argument("--seed",  action="store_true", help="Ajoute les ressources de démonstration")
    parser.add_argument("--test",  metavar="QUERY",     help="Teste une recherche après indexation")
    parser.add_argument("--stats", action="store_true", help="Affiche les stats de la collection")
    args = parser.parse_args()

    print("=" * 60)
    print("   PathWise — Indexeur RAG (ChromaDB)")
    print("   EMSI 2026 | Nasri Hiba & Sabir Malak")
    print("=" * 60)

    collection = get_chroma_collection()

    if args.stats:
        cmd_stats(collection)
        return

    if args.reset:
        cmd_reset(collection)
        collection = get_chroma_collection()

    if args.seed:
        seed_demo_resources()

    # Vérifier PDFs disponibles
    pdfs = list(PDF_DIR.glob("*.pdf"))
    print(f"\n Dossier : {PDF_DIR}")
    print(f"   PDFs trouvés : {len(pdfs)}")
    if pdfs:
        for p in pdfs:
            print(f"    {p.name} ({p.stat().st_size // 1024} Ko)")

    # Indexer
    nb = index_all_pdfs()

    # Stats finales
    cmd_stats(get_chroma_collection())

    # Test de recherche
    if args.test:
        print(f"\n Recherche : '{args.test}'")
        results = search_resources(args.test, n_results=5)
        for i, r in enumerate(results, 1):
            print(f"\n  [{i}] Source : {r['source']} | Pertinence : {r['pertinence']}")
            print(f"       {r['contenu'][:200].strip()}...")

    print("\n Terminé !")


if __name__ == "__main__":
    main()