"""
PathWise — rag_pipeline.py
RAG Pipeline : indexation PDFs → ChromaDB + recherche sémantique + Tavily fallback
"""

import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BASE_DIR         = Path(__file__).parent.parent
PDF_DIR          = BASE_DIR / "data" / "resources_raw"
VECTOR_STORE_DIR = BASE_DIR / "data" / "vector_store"
COLLECTION_NAME  = "pathwise_resources"

TAVILY_API_KEY   = os.getenv("TAVILY_API_KEY", "")
CHUNK_SIZE       = 800          # caractères par chunk
CHUNK_OVERLAP    = 100


# ─────────────────────────────────────────────
# HELPERS — CHUNKING TEXTE
# ─────────────────────────────────────────────
def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Découpe un texte long en chunks avec chevauchement."""
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end].strip())
        start += size - overlap
    return [c for c in chunks if len(c) > 50]   # ignorer les trop petits


def file_hash(path: Path) -> str:
    """SHA-256 d'un fichier pour détecter les doublons."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ─────────────────────────────────────────────
# EXTRACTION TEXTE DEPUIS PDF
# ─────────────────────────────────────────────
def extract_pdf_text(pdf_path: Path) -> str:
    """Extrait le texte d'un PDF avec PyMuPDF (fitz) ou pdfplumber en fallback."""
    text = ""
    # Tentative 1 : PyMuPDF (rapide, fiable)
    try:
        import fitz  # pip install pymupdf
        doc = fitz.open(str(pdf_path))
        for page in doc:
            text += page.get_text()
        doc.close()
        if text.strip():
            return text
    except ImportError:
        pass

    # Tentative 2 : pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        if text.strip():
            return text
    except ImportError:
        pass

    # Tentative 3 : PyPDF2
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(str(pdf_path))
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"  Impossible d'extraire {pdf_path.name} : {e}")
        return ""


# ─────────────────────────────────────────────
# CHROMADB — INITIALISATION
# ─────────────────────────────────────────────
def get_chroma_collection():
    """Retourne (ou crée) la collection ChromaDB PathWise."""
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(path=str(VECTOR_STORE_DIR))

        # Embedding par défaut : SentenceTransformers all-MiniLM-L6-v2
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )

        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
        return collection
    except ImportError as e:
        raise RuntimeError(
            f"ChromaDB non installé : pip install chromadb sentence-transformers\n{e}"
        )


# ─────────────────────────────────────────────
# INDEXATION — PDFs → ChromaDB
# ─────────────────────────────────────────────
def index_pdf(pdf_path: Path, collection) -> int:
    """
    Indexe un seul PDF dans ChromaDB.
    Retourne le nombre de chunks ajoutés.
    """
    print(f"   Indexation : {pdf_path.name}")
    text = extract_pdf_text(pdf_path)
    if not text.strip():
        print(f"     ⚠️  Texte vide — ignoré")
        return 0

    chunks = chunk_text(text)
    pdf_hash = file_hash(pdf_path)

    ids, documents, metadatas = [], [], []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{pdf_hash[:12]}_{i}"
        ids.append(chunk_id)
        documents.append(chunk)
        metadatas.append({
            "source": pdf_path.name,
            "path": str(pdf_path),
            "chunk_index": i,
            "total_chunks": len(chunks),
            "file_hash": pdf_hash,
        })

    # Upsert pour éviter les doublons
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    print(f"      {len(chunks)} chunks indexés")
    return len(chunks)


def index_all_pdfs() -> int:
    """
    Indexe tous les PDFs du dossier data/resources_raw/.
    Retourne le nombre total de chunks indexés.
    """
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    pdf_files = list(PDF_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"  Aucun PDF trouvé dans {PDF_DIR}")
        print("    → Téléchargez des cours ML/Python et placez-les dans ce dossier.")
        return 0

    print(f"\n Indexation de {len(pdf_files)} PDF(s) dans ChromaDB...")
    collection = get_chroma_collection()
    total = 0
    for pdf in pdf_files:
        total += index_pdf(pdf, collection)

    print(f"\n Indexation terminée — {total} chunks au total dans '{COLLECTION_NAME}'")
    return total


# ─────────────────────────────────────────────
# RECHERCHE SÉMANTIQUE
# ─────────────────────────────────────────────
def search_resources(query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """
    Recherche sémantique dans ChromaDB.
    Fallback sur Tavily si ChromaDB est vide ou échoue.
    """
    try:
        collection = get_chroma_collection()
        count = collection.count()

        if count == 0:
            print(" Collection vide — fallback Tavily")
            return _tavily_search(query, n_results)

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
            include=["documents", "metadatas", "distances"],
        )

        output = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({
                "contenu": doc,
                "source": meta.get("source", "inconnu"),
                "pertinence": round(1 - dist, 3),   # 1 = parfait
                "chunk_index": meta.get("chunk_index"),
            })

        return output

    except Exception as e:
        print(f"  ChromaDB error : {e} — fallback Tavily")
        return _tavily_search(query, n_results)


def _tavily_search(query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """Recherche web via Tavily comme fallback RAG."""
    if not TAVILY_API_KEY:
        return [{"contenu": "Tavily non configuré. Ajoutez TAVILY_API_KEY dans .env",
                 "source": "système", "pertinence": 0.0}]
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=n_results,
            include_answer=True,
        )
        results = []
        if response.get("answer"):
            results.append({
                "contenu": response["answer"],
                "source": "Tavily (synthèse web)",
                "pertinence": 1.0,
            })
        for r in response.get("results", []):
            results.append({
                "contenu": r.get("content", ""),
                "source": r.get("url", "web"),
                "pertinence": r.get("score", 0.5),
            })
        return results
    except Exception as e:
        return [{"contenu": f"Erreur Tavily : {e}", "source": "système", "pertinence": 0.0}]


# ─────────────────────────────────────────────
# RESSOURCES INTÉGRÉES (seed de démonstration)
# ─────────────────────────────────────────────
SEED_RESOURCES = [
    {
        "id": "seed_ml_001",
        "text": """Machine Learning — Introduction\nLe machine learning (apprentissage automatique) est une branche de l'IA
qui permet aux systèmes d'apprendre à partir de données. On distingue trois paradigmes principaux :
1. Apprentissage supervisé : le modèle apprend à partir de paires (entrée, sortie) étiquetées.
   Exemples : régression linéaire, SVM, forêts aléatoires.
2. Apprentissage non supervisé : le modèle découvre des structures cachées dans des données non étiquetées.
   Exemples : k-means, DBSCAN, ACP.
3. Apprentissage par renforcement : un agent apprend à agir dans un environnement pour maximiser une récompense.
   Exemples : Q-learning, PPO, AlphaGo.""",
        "source": "seed_intro_ml.pdf",
    },
    {
        "id": "seed_python_001",
        "text": """Python pour la Data Science — Bibliothèques essentielles\n
NumPy : calcul matriciel et algèbre linéaire (np.array, np.dot, np.linalg).\n
Pandas : manipulation de DataFrames (read_csv, groupby, merge, fillna).\n
Matplotlib / Seaborn : visualisation (plt.plot, sns.heatmap, sns.pairplot).\n
Scikit-learn : modèles ML clés en main (fit, predict, train_test_split, cross_val_score).\n
TensorFlow / PyTorch : deep learning (réseaux de neurones, GPU, autograd).""",
        "source": "seed_python_ds.pdf",
    },
    {
        "id": "seed_dl_001",
        "text": """Réseaux de neurones — Concepts fondamentaux\n
Un réseau de neurones est composé de couches (layers) : entrée, cachées, sortie.\n
Chaque neurone calcule z = Wx + b puis applique une fonction d'activation (ReLU, sigmoid, softmax).\n
L'entraînement optimise les poids via la rétropropagation du gradient et un optimiseur (SGD, Adam).\n
Le taux d'apprentissage (learning rate) contrôle la vitesse de convergence.\n
Le surapprentissage (overfitting) est régularisé par Dropout, L2, ou early stopping.""",
        "source": "seed_deep_learning.pdf",
    },
    {
        "id": "seed_stats_001",
        "text": """Statistiques pour le ML\n
Probabilité conditionnelle et théorème de Bayes : P(A|B) = P(B|A)·P(A) / P(B).\n
Distributions : normale (gaussienne), binomiale, de Poisson.\n
Métriques de classification : accuracy, précision, rappel, F1-score, AUC-ROC.\n
Métriques de régression : MAE, MSE, RMSE, R².\n
Validation croisée k-fold pour éviter le biais de sélection de données.""",
        "source": "seed_statistiques.pdf",
    },
    {
        "id": "seed_nlp_001",
        "text": """Traitement du Langage Naturel (NLP)\n
Tokenisation : découper le texte en tokens (mots, sous-mots avec BPE).\n
Représentations : TF-IDF, Word2Vec, GloVe, embeddings contextuels (BERT).\n
Tâches NLP : classification de texte, NER, traduction, génération, Q&A.\n
Transformers : architecture attention-based (BERT, GPT, T5, LLaMA).\n
RAG (Retrieval-Augmented Generation) : combiner recherche vectorielle + LLM pour des réponses factuelles.""",
        "source": "seed_nlp.pdf",
    },
]


def seed_demo_resources():
    """Injecte des ressources de démonstration si la collection est vide."""
    try:
        collection = get_chroma_collection()
        if collection.count() == 0:
            print(" Injection des ressources de démonstration...")
            collection.upsert(
                ids=[r["id"] for r in SEED_RESOURCES],
                documents=[r["text"] for r in SEED_RESOURCES],
                metadatas=[{"source": r["source"], "chunk_index": 0, "total_chunks": 1} for r in SEED_RESOURCES],
            )
            print(f"    {len(SEED_RESOURCES)} ressources seed ajoutées")
    except Exception as e:
        print(f"  Seed échoué : {e}")


# ─────────────────────────────────────────────
# SCRIPT DIRECT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    seed_demo_resources()
    n = index_all_pdfs()
    print(f"\nTotal chunks indexés : {n}")
    print("\n Test de recherche : 'régression linéaire'")
    results = search_resources("régression linéaire", n_results=3)
    for i, r in enumerate(results, 1):
        print(f"  [{i}] {r['source']} (pertinence={r['pertinence']})\n      {r['contenu'][:120]}...")