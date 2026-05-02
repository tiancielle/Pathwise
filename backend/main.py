"""
PathWise — FastAPI Backend

"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

from database import get_db, init_db
from rag_pipeline import search_resources, index_all_pdfs

# load_dotenv()
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
JWT_SECRET     = os.getenv("JWT_SECRET", "pathwise_secret_emsi_2026")
JWT_ALGORITHM  = "HS256"
JWT_EXPIRY_H   = 24

app = FastAPI(
    title="PathWise API",
    description="Système multi-agent de personnalisation de parcours d'apprentissage — EMSI 2026",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # En prod : restreindre au domaine React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ─────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()

# ─────────────────────────────────────────────
# SCHÉMAS PYDANTIC
# ─────────────────────────────────────────────
class RegisterRequest(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    niveau: Optional[str] = "débutant"           # débutant / intermédiaire / avancé
    objectifs: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    mot_de_passe: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    etudiant_id: int
    nom: str

class LearningPathCreate(BaseModel):
    etudiant_id: int
    titre: str
    contenu: dict                                 # JSON complet du parcours généré
    duree_estimee_h: Optional[float] = None

class QuizResultCreate(BaseModel):
    etudiant_id: int
    session_id: Optional[int] = None
    module_nom: str
    score: float                                  # 0.0 – 1.0
    nb_questions: int
    nb_correctes: int
    details: Optional[dict] = None               # réponses détaillées

class ProfilUpdate(BaseModel):
    nom: Optional[str] = None
    niveau: Optional[str] = None
    objectifs: Optional[str] = None

# ─────────────────────────────────────────────
# HELPERS JWT
# ─────────────────────────────────────────────
def create_token(etudiant_id: int, email: str) -> str:
    payload = {
        "sub": str(etudiant_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_H),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré — reconnectez-vous")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(credentials.credentials)


def require_same_user(etudiant_id: int, current: dict = Depends(get_current_user)):
    """Vérifie que l'utilisateur connecté accède uniquement à ses propres données."""
    if int(current["sub"]) != etudiant_id:
        raise HTTPException(status_code=403, detail="Accès interdit à ce profil")
    return current

# ─────────────────────────────────────────────
# AUTH — /api/auth
# ─────────────────────────────────────────────
@app.post("/api/auth/register", response_model=TokenResponse, status_code=201,
          tags=["Auth"], summary="Inscription d'un nouvel étudiant")
def register(body: RegisterRequest):
    db = get_db()
    # Vérifier unicité email
    existing = db.execute("SELECT id FROM etudiants WHERE email = ?", (body.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")

    hashed = bcrypt.hashpw(body.mot_de_passe.encode(), bcrypt.gensalt()).decode()

    cur = db.execute(
        """INSERT INTO etudiants (nom, email, mot_de_passe_hash, niveau, objectifs, date_inscription)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (body.nom, body.email, hashed, body.niveau, body.objectifs, datetime.utcnow().isoformat()),
    )
    db.commit()
    eid = cur.lastrowid
    token = create_token(eid, body.email)
    return TokenResponse(access_token=token, etudiant_id=eid, nom=body.nom)


@app.post("/api/auth/login", response_model=TokenResponse,
          tags=["Auth"], summary="Connexion + obtention du JWT")
def login(body: LoginRequest):
    db = get_db()
    row = db.execute(
        "SELECT id, nom, mot_de_passe_hash FROM etudiants WHERE email = ?", (body.email,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not bcrypt.checkpw(body.mot_de_passe.encode(), row["mot_de_passe_hash"].encode()):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(row["id"], body.email)
    return TokenResponse(access_token=token, etudiant_id=row["id"], nom=row["nom"])


@app.get("/api/auth/me", tags=["Auth"], summary="Profil de l'utilisateur connecté")
def me(current: dict = Depends(get_current_user)):
    db = get_db()
    row = db.execute(
        "SELECT id, nom, email, niveau, objectifs, date_inscription FROM etudiants WHERE id = ?",
        (int(current["sub"]),),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return dict(row)

# ─────────────────────────────────────────────
# PROFIL — /api/profil  (route existante + mise à jour)
# ─────────────────────────────────────────────
@app.get("/api/profil/{etudiant_id}", tags=["Profil"])
def get_profil(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()
    row = db.execute(
        "SELECT id, nom, email, niveau, objectifs, date_inscription FROM etudiants WHERE id = ?",
        (etudiant_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    return dict(row)


@app.patch("/api/profil/{etudiant_id}", tags=["Profil"])
def update_profil(etudiant_id: int, body: ProfilUpdate, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()
    updates, params = [], []
    if body.nom:
        updates.append("nom = ?"); params.append(body.nom)
    if body.niveau:
        updates.append("niveau = ?"); params.append(body.niveau)
    if body.objectifs is not None:
        updates.append("objectifs = ?"); params.append(body.objectifs)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    params.append(etudiant_id)
    db.execute(f"UPDATE etudiants SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()
    return {"message": "Profil mis à jour"}

# ─────────────────────────────────────────────
# LEARNING PATH — /api/learning-path
# ─────────────────────────────────────────────
@app.get("/api/learning-path/{etudiant_id}", tags=["Learning Path"],
         summary="Récupère le dernier parcours généré pour un étudiant")
def get_learning_path(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()
    rows = db.execute(
        """SELECT id, titre, contenu, duree_estimee_h, date_creation
           FROM learning_paths WHERE etudiant_id = ?
           ORDER BY date_creation DESC""",
        (etudiant_id,),
    ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Aucun parcours trouvé pour cet étudiant")
    import json
    result = []
    for r in rows:
        d = dict(r)
        d["contenu"] = json.loads(d["contenu"]) if isinstance(d["contenu"], str) else d["contenu"]
        result.append(d)
    return result


@app.post("/api/learning-path", status_code=201, tags=["Learning Path"],
          summary="Sauvegarde un parcours généré par les agents n8n")
def save_learning_path(body: LearningPathCreate, current=Depends(get_current_user)):
    require_same_user(body.etudiant_id, current)
    import json
    db = get_db()
    cur = db.execute(
        """INSERT INTO learning_paths (etudiant_id, titre, contenu, duree_estimee_h, date_creation)
           VALUES (?, ?, ?, ?, ?)""",
        (
            body.etudiant_id,
            body.titre,
            json.dumps(body.contenu, ensure_ascii=False),
            body.duree_estimee_h,
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()
    return {"id": cur.lastrowid, "message": "Parcours sauvegardé avec succès"}


@app.delete("/api/learning-path/{path_id}", tags=["Learning Path"])
def delete_learning_path(path_id: int, current=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT etudiant_id FROM learning_paths WHERE id = ?", (path_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    require_same_user(row["etudiant_id"], current)
    db.execute("DELETE FROM learning_paths WHERE id = ?", (path_id,))
    db.commit()
    return {"message": "Parcours supprimé"}

# ─────────────────────────────────────────────
# SESSIONS — /api/sessions
# ─────────────────────────────────────────────
@app.get("/api/sessions/{etudiant_id}", tags=["Sessions"],
         summary="Historique complet des sessions d'apprentissage")
def get_sessions(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()
    rows = db.execute(
        """SELECT id, module_nom, duree_minutes, score, date_session, statut
           FROM sessions WHERE etudiant_id = ?
           ORDER BY date_session DESC""",
        (etudiant_id,),
    ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/sessions", status_code=201, tags=["Sessions"])
def create_session(
    etudiant_id: int,
    module_nom: str,
    duree_minutes: int = 0,
    score: float = 0.0,
    statut: str = "en_cours",
    current=Depends(get_current_user),
):
    require_same_user(etudiant_id, current)
    db = get_db()
    cur = db.execute(
        """INSERT INTO sessions (etudiant_id, module_nom, duree_minutes, score, date_session, statut)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (etudiant_id, module_nom, duree_minutes, score, datetime.utcnow().isoformat(), statut),
    )
    db.commit()
    return {"id": cur.lastrowid, "message": "Session créée"}

# ─────────────────────────────────────────────
# QUIZ — /api/quiz
# ─────────────────────────────────────────────
@app.post("/api/quiz/result", status_code=201, tags=["Quiz"],
          summary="Enregistre le résultat détaillé d'un quiz")
def save_quiz_result(body: QuizResultCreate, current=Depends(get_current_user)):
    require_same_user(body.etudiant_id, current)
    import json
    db = get_db()
    cur = db.execute(
        """INSERT INTO quiz_results
           (etudiant_id, session_id, module_nom, score, nb_questions, nb_correctes, details, date_quiz)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            body.etudiant_id,
            body.session_id,
            body.module_nom,
            body.score,
            body.nb_questions,
            body.nb_correctes,
            json.dumps(body.details or {}, ensure_ascii=False),
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()
    return {"id": cur.lastrowid, "message": "Résultat enregistré"}


@app.get("/api/quiz/score", tags=["Quiz"])
def get_quiz_score(etudiant_id: int, current=Depends(get_current_user)):
    """Route existante — score moyen global de l'étudiant."""
    require_same_user(etudiant_id, current)
    db = get_db()
    row = db.execute(
        "SELECT AVG(score) as score_moyen, COUNT(*) as nb_quiz FROM quiz_results WHERE etudiant_id = ?",
        (etudiant_id,),
    ).fetchone()
    return {"etudiant_id": etudiant_id, "score_moyen": row["score_moyen"] or 0.0, "nb_quiz": row["nb_quiz"]}


@app.get("/api/quiz/history/{etudiant_id}", tags=["Quiz"])
def get_quiz_history(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    import json
    db = get_db()
    rows = db.execute(
        """SELECT id, module_nom, score, nb_questions, nb_correctes, date_quiz
           FROM quiz_results WHERE etudiant_id = ?
           ORDER BY date_quiz DESC""",
        (etudiant_id,),
    ).fetchall()
    return [dict(r) for r in rows]

# ─────────────────────────────────────────────
# RESSOURCES — /api/ressources (route existante + RAG)
# ─────────────────────────────────────────────
@app.get("/api/ressources", tags=["Ressources"],
         summary="Recherche RAG dans ChromaDB (PDFs indexés)")
def get_ressources(query: str = "machine learning", n: int = 5):
    try:
        results = search_resources(query, n_results=n)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur RAG : {str(e)}")


@app.post("/api/ressources/index", tags=["Ressources"],
          summary="(Admin) Déclenche l'indexation de tous les PDFs dans data/resources_raw/")
def trigger_indexing(current=Depends(get_current_user)):
    try:
        nb = index_all_pdfs()
        return {"message": f"{nb} PDFs indexés avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# STATS & DASHBOARD — /api/dashboard
# ─────────────────────────────────────────────
@app.get("/api/dashboard/{etudiant_id}", tags=["Dashboard"])
def get_dashboard(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()

    etudiant = dict(db.execute(
        "SELECT id, nom, email, niveau, objectifs FROM etudiants WHERE id = ?", (etudiant_id,)
    ).fetchone() or {})

    stats_quiz = db.execute(
        "SELECT COUNT(*) nb, AVG(score) avg_score, MAX(score) best FROM quiz_results WHERE etudiant_id = ?",
        (etudiant_id,),
    ).fetchone()

    stats_sessions = db.execute(
        "SELECT COUNT(*) nb, SUM(duree_minutes) total_min FROM sessions WHERE etudiant_id = ?",
        (etudiant_id,),
    ).fetchone()

    last_path = db.execute(
        "SELECT titre, date_creation FROM learning_paths WHERE etudiant_id = ? ORDER BY date_creation DESC LIMIT 1",
        (etudiant_id,),
    ).fetchone()

    return {
        "etudiant": etudiant,
        "quiz": {
            "nb_quiz": stats_quiz["nb"],
            "score_moyen": round((stats_quiz["avg_score"] or 0) * 100, 1),
            "meilleur_score": round((stats_quiz["best"] or 0) * 100, 1),
        },
        "sessions": {
            "nb_sessions": stats_sessions["nb"],
            "temps_total_h": round((stats_sessions["total_min"] or 0) / 60, 1),
        },
        "dernier_parcours": dict(last_path) if last_path else None,
    }

# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "app": "PathWise API",
        "version": "2.0.0",
        "status": "running",
        "projet": "EMSI 2026",
        "etudiantes": ["Nasri Hiba", "Sabir Malak"],
    }