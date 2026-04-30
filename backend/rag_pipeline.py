import chromadb
from sentence_transformers import SentenceTransformer
from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()

# ── ChromaDB local ──────────────────────────────────────────
chroma_client = chromadb.PersistentClient(path="../data/vector_store")
collection = chroma_client.get_or_create_collection(name="pathwise_resources")

# ── Modèle d'embeddings ─────────────────────────────────────
encoder = SentenceTransformer("all-MiniLM-L6-v2")

def add_resource(doc_id: str, text: str, metadata: dict):
    """Ajoute une ressource dans ChromaDB"""
    embedding = encoder.encode(text).tolist()
    collection.add(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[text],
        metadatas=[metadata]
    )
    print(f" Ressource ajoutée : {doc_id}")

def search_local(query: str, n_results: int = 3):
    """Cherche dans ChromaDB"""
    embedding = encoder.encode(query).tolist()
    results = collection.query(
        query_embeddings=[embedding],
        n_results=n_results
    )
    return results

def search_web(query: str):
    """Cherche sur le web via Tavily"""
    tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))
    results = tavily.search(
        query=query,
        search_depth="basic",
        max_results=5
    )
    return results["results"]

def get_resources(module: str, niveau: str):
    """
    Logique principale :
    - niveau débutant → ChromaDB local
    - niveau intermédiaire/avancé → Tavily web search
    """
    if niveau == "débutant":
        results = search_local(module)
        if results and results["documents"][0]:
            return {"source": "local", "results": results}
    
    # Fallback ou niveaux supérieurs → web
    web_results = search_web(f"{module} tutorial {niveau} français")
    return {"source": "web", "results": web_results}

if __name__ == "__main__":
    # Test : ajouter une ressource exemple
    add_resource(
        doc_id="python-bases-001",
        text="Python est un langage de programmation. Les variables permettent de stocker des données.",
        metadata={"module": "python-bases", "type": "cours", "niveau": "débutant"}
    )
    print("Test ChromaDB OK")
    
    # Test recherche web
    print("\nTest Tavily...")
    results = search_web("Python bases débutant tutoriel")
    for r in results[:2]:
        print(f"- {r['title']} : {r['url']}")