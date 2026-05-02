#!/usr/bin/env python3
"""
PathWise — scripts/download_resources.py
Télécharge des PDFs de cours ML/Python libres de droits depuis des sources légales.

Sources utilisées :
  - GitHub (cours open-source)
  - arXiv (papiers libres)
  - Cours .pdf publics (universités, tutoriels)

Usage :
    python scripts/download_resources.py
    python scripts/download_resources.py --list     # liste seulement
    python scripts/download_resources.py --max 5    # limite à 5 fichiers
"""

import urllib.request
import argparse
import sys
from pathlib import Path
import time

PDF_DIR = Path(__file__).parent.parent / "data" / "resources_raw"

# ─────────────────────────────────────────────
# RESSOURCES LIBRES DE DROITS (CC / MIT / public domain)
# ─────────────────────────────────────────────
FREE_RESOURCES = [
    # ── Introductions ML ──────────────────────────────────────────────────
    {
        "nom": "intro_machine_learning_notes.pdf",
        "url": "https://cs229.stanford.edu/notes2022fall/main_notes.pdf",
        "desc": "CS229 Stanford — Notes ML complètes (Andrew Ng)",
        "taille_approx": "~2 Mo",
    },
    {
        "nom": "python_data_science_handbook_sample.pdf",
        "url": "https://jakevdp.github.io/PythonDataScienceHandbook/notebooks/PythonDataScienceHandbook.pdf",
        "desc": "Python Data Science Handbook (Jake VanderPlas) — O'Reilly open",
        "taille_approx": "~30 Mo",
    },
    # ── Deep Learning ─────────────────────────────────────────────────────
    {
        "nom": "deep_learning_goodfellow_ch1.pdf",
        "url": "https://www.deeplearningbook.org/contents/intro.html",
        "desc": "Deep Learning (Goodfellow et al.) — Introduction (HTML, converti)",
        "taille_approx": "HTML only",
    },
    # ── NLP ───────────────────────────────────────────────────────────────
    {
        "nom": "attention_is_all_you_need.pdf",
        "url": "https://arxiv.org/pdf/1706.03762",
        "desc": "Vaswani et al. — Attention Is All You Need (Transformers)",
        "taille_approx": "~2 Mo",
    },
    {
        "nom": "bert_paper.pdf",
        "url": "https://arxiv.org/pdf/1810.04805",
        "desc": "Devlin et al. — BERT: Pre-training of Deep Bidirectional Transformers",
        "taille_approx": "~500 Ko",
    },
    # ── RAG ───────────────────────────────────────────────────────────────
    {
        "nom": "rag_original_paper.pdf",
        "url": "https://arxiv.org/pdf/2005.11401",
        "desc": "Lewis et al. — Retrieval-Augmented Generation for NLP",
        "taille_approx": "~1 Mo",
    },
    # ── Python ────────────────────────────────────────────────────────────
    {
        "nom": "python_tutorial_officiel.pdf",
        "url": "https://docs.python.org/3/archives/python-3.12.0-docs-pdf-a4.zip",
        "desc": "Documentation Python officielle (PDF A4)",
        "taille_approx": "~20 Mo (ZIP)",
    },
]


def download_pdf(url: str, dest: Path, timeout: int = 30) -> bool:
    """Télécharge un PDF depuis une URL. Retourne True si succès."""
    try:
        headers = {
            "User-Agent": "PathWise-Educational-Bot/1.0 (EMSI 2026 Project)"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            content = response.read()

        # Vérification basique que c'est un PDF ou contenu binaire valide
        if len(content) < 100:
            return False

        dest.write_bytes(content)
        return True

    except Exception as e:
        print(f"       Erreur téléchargement : {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="PathWise — Téléchargeur de ressources PDF")
    parser.add_argument("--list",  action="store_true", help="Liste seulement sans télécharger")
    parser.add_argument("--max",   type=int, default=None, help="Nombre max de fichiers à télécharger")
    args = parser.parse_args()

    print("=" * 60)
    print("  PathWise — Téléchargeur de ressources ML/Python")
    print("  Sources libres de droits (arXiv, cours publics)")
    print("=" * 60)
    print(f"\n Destination : {PDF_DIR}\n")

    resources = FREE_RESOURCES[:args.max] if args.max else FREE_RESOURCES

    if args.list:
        for i, r in enumerate(resources, 1):
            print(f"  [{i}] {r['nom']}")
            print(f"       {r['desc']}")
            print(f"       Taille : {r['taille_approx']}")
            print()
        return

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    success, skip, fail = 0, 0, 0

    for i, resource in enumerate(resources, 1):
        dest = PDF_DIR / resource["nom"]
        print(f"[{i}/{len(resources)}] {resource['nom']}")
        print(f"    {resource['desc']}")

        if dest.exists():
            print(f"      Déjà téléchargé ({dest.stat().st_size // 1024} Ko) — ignoré")
            skip += 1
            continue

        if resource["taille_approx"] == "HTML only":
            print(f"      Ressource HTML — non téléchargeable comme PDF direct")
            skip += 1
            continue

        print(f"      Téléchargement depuis arXiv/web...")
        ok = download_pdf(resource["url"], dest)
        if ok:
            size = dest.stat().st_size // 1024
            print(f"     Téléchargé ({size} Ko)")
            success += 1
        else:
            fail += 1

        time.sleep(1)  # Politesse serveur

    print(f"\n Résultat : {success} téléchargés, {skip} ignorés, {fail} échecs")
    print(f" PDFs disponibles dans : {PDF_DIR}")
    print("\n  Lancez maintenant : python scripts/index_pdfs.py --seed")

    # Guide manuel si téléchargements ont échoué
    if fail > 0:
        print("""
  Certains téléchargements ont échoué (accès réseau ou URL changée).
    Vous pouvez ajouter manuellement des PDFs dans :
      data/resources_raw/

    Sources recommandées (libres de droits) :
    • https://arxiv.org/abs/1706.03762  (Transformers)
    • https://arxiv.org/abs/1810.04805  (BERT)
    • https://arxiv.org/abs/2005.11401  (RAG)
    • https://cs229.stanford.edu/notes2022fall/main_notes.pdf
    • https://d2l.ai/d2l-en.pdf         (Dive into Deep Learning)
        """)


if __name__ == "__main__":
    main()