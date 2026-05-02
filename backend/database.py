"""
PathWise — database.py
Initialisation SQLite + helper get_db()
Tables : etudiants, sessions, learning_paths, quiz_results
"""

import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "pathwise.db"))


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # accès par nom de colonne
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Crée toutes les tables si elles n'existent pas encore."""
    conn = get_db()
    cur = conn.cursor()

    # ── Étudiants ─────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS etudiants (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            nom                 TEXT    NOT NULL,
            email               TEXT    NOT NULL UNIQUE,
            mot_de_passe_hash   TEXT    NOT NULL,
            niveau              TEXT    DEFAULT 'débutant',
            objectifs           TEXT    DEFAULT '',
            date_inscription    TEXT    NOT NULL
        )
    """)

    # ── Sessions d'apprentissage ───────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            etudiant_id     INTEGER NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
            module_nom      TEXT    NOT NULL,
            duree_minutes   INTEGER DEFAULT 0,
            score           REAL    DEFAULT 0.0,
            statut          TEXT    DEFAULT 'en_cours',   -- en_cours | terminé | abandonné
            date_session    TEXT    NOT NULL
        )
    """)

    # ── Parcours d'apprentissage (Learning Paths) ──────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS learning_paths (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            etudiant_id     INTEGER NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
            titre           TEXT    NOT NULL,
            contenu         TEXT    NOT NULL,   -- JSON sérialisé du parcours complet
            duree_estimee_h REAL,
            date_creation   TEXT    NOT NULL
        )
    """)

    # ── Résultats détaillés de quiz ────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quiz_results (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            etudiant_id     INTEGER NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
            session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
            module_nom      TEXT    NOT NULL,
            score           REAL    NOT NULL,   -- 0.0 à 1.0
            nb_questions    INTEGER NOT NULL,
            nb_correctes    INTEGER NOT NULL,
            details         TEXT,               -- JSON : réponses détaillées
            date_quiz       TEXT    NOT NULL
        )
    """)

    # ── Index pour les requêtes fréquentes ────────────────────────────────
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sessions_etudiant   ON sessions(etudiant_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lp_etudiant         ON learning_paths(etudiant_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_quiz_etudiant       ON quiz_results(etudiant_id)")

    conn.commit()
    conn.close()
    print(" Base de données PathWise initialisée avec succès.")


if __name__ == "__main__":
    init_db()