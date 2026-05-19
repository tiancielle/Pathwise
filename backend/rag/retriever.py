"""
PathWise — rag/retriever.py
Cache mémoire simple autour de search_resources() (ChromaDB).

Pourquoi :
  - ChromaDB fait un calcul de similarité vectorielle à chaque appel.
  - Si l'étudiant envoie la même question plusieurs fois dans /api/chat,
    on évite des appels inutiles et la réponse est instantanée.

Fonctionnement :
  - Clé de cache = (query normalisée, n_results)
  - TTL = 5 minutes (configurable via CACHE_TTL_SECONDS dans .env)
  - Taille max = 100 entrées (LRU manuel simple)
  - Thread-safe via threading.Lock (FastAPI utilise des threads)
"""

import time
import threading
import os
from typing import Any

from rag_pipeline import search_resources as _search_resources

# ── Configuration ────────────────────────────────────────────
TTL     = int(os.getenv("CACHE_TTL_SECONDS", "300"))   # 5 min par défaut
MAX_SIZE = int(os.getenv("CACHE_MAX_SIZE",   "100"))   # 100 entrées max

# ── Cache interne ─────────────────────────────────────────────
# Structure : { cache_key: {"result": [...], "expires_at": float} }
_cache: dict[str, dict] = {}
_lock  = threading.Lock()


def _make_key(query: str, n_results: int) -> str:
    """Normalise la requête pour maximiser les hits de cache."""
    return f"{query.lower().strip()}::{n_results}"


def _evict_expired() -> None:
    """Supprime les entrées expirées. Appelé avant chaque écriture."""
    now = time.time()
    expired = [k for k, v in _cache.items() if v["expires_at"] < now]
    for k in expired:
        del _cache[k]


def _evict_oldest() -> None:
    """Supprime l'entrée la plus ancienne si le cache est plein."""
    if len(_cache) >= MAX_SIZE:
        oldest_key = min(_cache, key=lambda k: _cache[k]["expires_at"])
        del _cache[oldest_key]


def cached_search(query: str, n_results: int = 3) -> list[Any]:
    """
    Wrapper cacheé autour de search_resources().

    Usage dans main.py — remplacer :
        from rag_pipeline import search_resources
        results = search_resources(body.message, n_results=3)

    Par :
        from rag.retriever import cached_search
        results = cached_search(body.message, n_results=3)

    Le reste du code ne change pas — même format de retour.
    """
    key = _make_key(query, n_results)

    # — Lecture (cache hit ?)
    with _lock:
        entry = _cache.get(key)
        if entry and entry["expires_at"] > time.time():
            return entry["result"]          #  Cache HIT — retour immédiat

    # — Cache miss → appel ChromaDB
    result = _search_resources(query, n_results=n_results)

    # — Écriture dans le cache
    with _lock:
        _evict_expired()
        _evict_oldest()
        _cache[key] = {
            "result":     result,
            "expires_at": time.time() + TTL,
        }

    return result


def cache_stats() -> dict:
    """
    Retourne des statistiques sur l'état du cache.
    Utile pour le endpoint /api/debug/cache (optionnel).
    """
    now = time.time()
    with _lock:
        total     = len(_cache)
        actives   = sum(1 for v in _cache.values() if v["expires_at"] > now)
        expired   = total - actives
    return {
        "total_entries":   total,
        "active_entries":  actives,
        "expired_entries": expired,
        "ttl_seconds":     TTL,
        "max_size":        MAX_SIZE,
    }


def clear_cache() -> int:
    """
    Vide entièrement le cache.
    Appelable après une ré-indexation des PDFs pour forcer
    la prise en compte des nouveaux documents.
    Retourne le nombre d'entrées supprimées.
    """
    with _lock:
        n = len(_cache)
        _cache.clear()
    return n
