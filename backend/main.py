"""
PathWise — FastAPI Backend
EMSI 2026 | Nasri Hiba & Sabir Malak | Mme Hasnâa Chaabi
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import bcrypt
import jwt
import os
import json
import httpx
import shutil
from datetime import datetime, timedelta
from dotenv import load_dotenv
import asyncio

from database import get_db, init_db
from rag_pipeline import search_resources, index_all_pdfs

# load_dotenv()
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
from mcp_client import mcp_get_context

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
JWT_SECRET     = os.getenv("JWT_SECRET", "pathwise_secret_emsi_2026")
JWT_ALGORITHM  = "HS256"
JWT_EXPIRY_H   = 24

# ── GitHub Models (GPT-4o-mini) ───────────────
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_API_KEY")
AZURE_ENDPOINT = "https://models.inference.ai.azure.com/chat/completions"
GPT_MODEL      = "gpt-4o-mini"

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

# ── Nouveaux schémas ─────────────────────────
class ChatRequest(BaseModel):
    message: str
    etudiant_id: int

class ExternalResource(BaseModel):
    title: str
    url: str
    description: str
    type: str        # "article" | "video" | "documentation" | "web"

class ChatResponse(BaseModel):
    reply: str
    sources: List[str]                        # noms PDFs locaux (contexte explication)
    external_resources: List[ExternalResource]  # vraies ressources externes Tavily

class QuizRequest(BaseModel):
    subject: str
    level: str          # "débutant" | "intermédiaire" | "avancé"
    profile_id: int

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]   # exactement 4 options
    correctAnswer: int   # index 0–3
    explanation: str

class QuizQuestionsResponse(BaseModel):
    questions: List[QuizQuestion]

# ── Schémas Learning Path ────────────────────
class GenerateLearningPathRequest(BaseModel):
    etudiant_id: int
    subject: str        # "machine learning", "react", "python"...
    level: Optional[str] = None   # si None → récupéré depuis le profil

class ModuleCompleteRequest(BaseModel):
    etudiant_id: int
    completed: bool

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
# HELPER — Appel GPT-4o-mini via GitHub Models
# ─────────────────────────────────────────────
async def call_gpt(messages: list, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    """
    Envoie une liste de messages à GPT-4o-mini via GitHub Models (Azure endpoint)
    et retourne le contenu textuel de la réponse.
    Lève une HTTPException 502 si l'API est injoignable.
    """
    if not GITHUB_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_TOKEN manquant dans le fichier .env"
        )

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GPT_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(AZURE_ENDPOINT, headers=headers, json=payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Erreur GitHub Models : {e.response.status_code} — {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Impossible de joindre GitHub Models : {str(e)}"
            )

    data = response.json()
    return data["choices"][0]["message"]["content"]

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
# PROFIL — /api/profil
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
# @app.post("/api/quiz/result", status_code=201, tags=["Quiz"],
#           summary="Enregistre le résultat détaillé d'un quiz")
# def save_quiz_result(body: QuizResultCreate, current=Depends(get_current_user)):
#     require_same_user(body.etudiant_id, current)
#     db = get_db()
#     cur = db.execute(
#         """INSERT INTO quiz_results
#            (etudiant_id, session_id, module_nom, score, nb_questions, nb_correctes, details, date_quiz)
#            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
#         (
#             body.etudiant_id,
#             body.session_id,
#             body.module_nom,
#             body.score,
#             body.nb_questions,
#             body.nb_correctes,
#             json.dumps(body.details or {}, ensure_ascii=False),
#             datetime.utcnow().isoformat(),
#         ),
#     )
#     db.commit()
#     return {"id": cur.lastrowid, "message": "Résultat enregistré"}
# ── Mettez cette fonction AVANT toutes les routes ──
async def notify_n8n_background(webhook: str, etudiant_id: int, module: str, path_id: int):
    """Notifie n8n en arrière-plan sans bloquer."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(webhook, json={
                "etudiant_id": etudiant_id,
                "module": module,
                "path_id": path_id,
                "reponses": []
            })
    except Exception:
        pass


# ── Route quiz/result — version corrigée ──
@app.post("/api/quiz/result", status_code=201, tags=["Quiz"])
async def save_quiz_result(body: QuizResultCreate, current=Depends(get_current_user)):
    require_same_user(body.etudiant_id, current)
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

    # Notifier n8n adapter en arrière-plan
    n8n_base = os.getenv("N8N_BASE_URL", "http://localhost:5678")
    asyncio.create_task(notify_n8n_background(
        f"{n8n_base}/webhook-test/pathwise-adapter",
        body.etudiant_id,
        body.module_nom,
        0
    ))

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
    db = get_db()
    rows = db.execute(
        """SELECT id, module_nom, score, nb_questions, nb_correctes, date_quiz
           FROM quiz_results WHERE etudiant_id = ?
           ORDER BY date_quiz DESC""",
        (etudiant_id,),
    ).fetchall()
    return [dict(r) for r in rows]

class QuizFeedbackRequest(BaseModel):
    etudiant_id: int
    module_nom: str
    questions: List[dict]  # [{id, question, correctAnswer, selected, options}]

class QuizFeedbackResponse(BaseModel):
    historique: List[dict]  # [{id, question, correct, selected_text, correct_text, status}]
    ressources_par_question: dict  # {question_id: [ExternalResource]}

@app.post("/api/quiz/feedback", response_model=QuizFeedbackResponse, tags=["Quiz"],
          summary="Retourne historique vrai/faux + ressources Tavily sur questions ratées")
async def get_quiz_feedback(body: QuizFeedbackRequest, current=Depends(get_current_user)):
    """
    Reçoit les questions + réponses de l'étudiant.
    Retourne :
    - historique : chaque question avec statut ✅/❌
    - ressources_par_question : pour chaque question ratée, 2 ressources Tavily
    """
    historique = []
    questions_fausses = []

    for q in body.questions:
        correct = q.get("correctAnswer", -1)
        selected = q.get("selected", -1)
        options = q.get("options", [])
        is_correct = correct == selected

        historique.append({
            "id":            q.get("id"),
            "question":      q.get("question", ""),
            "status":        "✅ Correct" if is_correct else "❌ Incorrect",
            "selected_text": options[selected] if 0 <= selected < len(options) else "—",
            "correct_text":  options[correct]  if 0 <= correct  < len(options) else "—",
            "explanation":   q.get("explanation", ""),
        })

        if not is_correct:
            questions_fausses.append(q)

    # Tavily sur chaque question fausse
    ressources_par_question = {}
    for q in questions_fausses:
        query = f"{body.module_nom} {q.get('question', '')[:80]}"
        tavily_results = await search_tavily(query, n=2)
        ressources_par_question[str(q.get("id"))] = [r.dict() for r in tavily_results]

    return QuizFeedbackResponse(
        historique=historique,
        ressources_par_question=ressources_par_question,
    )


# ─────────────────────────────────────────────
# TRAÇABILITÉ — /api/trace
# ─────────────────────────────────────────────
class TraceRequest(BaseModel):
    etudiant_id: int
    module_nom: str
    titre: str
    url: str
    type_ressource: str   # video | article | exercice | documentation | web
    source: Optional[str] = "externe"

@app.post("/api/trace", status_code=201, tags=["Traçabilité"],
          summary="Enregistre une ressource consultée par l'étudiant")
def trace_ressource(body: TraceRequest, current=Depends(get_current_user)):
    """
    Appelé chaque fois qu'un étudiant clique sur une ressource
    (bouton Commencer, lien chat, ressource quiz...).
    Permet à l'enseignante de voir exactement ce que l'étudiant a consulté.
    """
    require_same_user(body.etudiant_id, current)
    db = get_db()
    db.execute(
        """INSERT INTO ressources_consultees
           (etudiant_id, module_nom, titre, url, type_ressource, source, date_consultation)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (body.etudiant_id, body.module_nom, body.titre,
         body.url, body.type_ressource, body.source,
         datetime.utcnow().isoformat())
    )
    db.commit()
    return {"message": "Ressource enregistrée"}

@app.get("/api/trace/{etudiant_id}", tags=["Traçabilité"],
         summary="Historique des ressources consultées par l'étudiant")
def get_trace(etudiant_id: int, current=Depends(get_current_user)):
    require_same_user(etudiant_id, current)
    db = get_db()
    rows = db.execute(
        """SELECT id, module_nom, titre, url, type_ressource, source, date_consultation
           FROM ressources_consultees WHERE etudiant_id = ?
           ORDER BY date_consultation DESC""",
        (etudiant_id,)
    ).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/trace/admin/all", tags=["Traçabilité"],
         summary="(Enseignante) Voir toutes les ressources consultées par tous les étudiants")
def get_trace_all(current=Depends(get_current_user)):
    """Route pour Mme Chaabi — voir la traçabilité complète."""
    db = get_db()
    rows = db.execute(
        """SELECT r.id, e.nom as etudiant_nom, r.module_nom, r.titre,
                  r.url, r.type_ressource, r.source, r.date_consultation
           FROM ressources_consultees r
           JOIN etudiants e ON e.id = r.etudiant_id
           ORDER BY r.date_consultation DESC""",
    ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/quiz/questions", response_model=QuizQuestionsResponse, tags=["Quiz"],
          summary="Génère 5 QCM variés via GPT-4o-mini selon le sujet et le niveau")
async def generate_quiz_questions(body: QuizRequest, current=Depends(get_current_user)):
    """
    Génère 5 questions QCM via GPT-4o-mini.

    Les 5 questions couvrent des catégories variées dans cet ordre :
    1. Définition / concept théorique
    2. Application pratique / code
    3. Détection d'erreur ou comportement inattendu
    4. Comparaison entre deux concepts proches
    5. Scénario réel ou synthèse

    Le modèle retourne du JSON pur — parsé et validé avant envoi au frontend.
    """
    QUIZ_SYSTEM_PROMPT = """Tu es un générateur de QCM pédagogiques pour étudiants en informatique.
Tu réponds UNIQUEMENT avec du JSON valide, sans markdown, sans balises, sans texte autour.
Le JSON doit respecter exactement ce schéma :
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}
Règles absolues :
- "options" contient EXACTEMENT 4 chaînes commençant par A., B., C., D.
- "correctAnswer" est l'index (0, 1, 2 ou 3) de la bonne réponse dans "options"
- "explanation" explique pourquoi c'est la bonne réponse (2-3 phrases)
- Toutes les questions et réponses sont en FRANÇAIS
- Pas de répétition entre les 5 questions"""

    user_prompt = f"""Génère exactement 5 questions QCM sur le sujet : **{body.subject}**
Niveau cible : **{body.level}**

Assure-toi que les 5 questions couvrent ces catégories dans cet ordre :
1. Définition / concept théorique
2. Application pratique / code
3. Détection d'erreur ou de comportement inattendu
4. Comparaison entre deux concepts proches
5. Scénario réel ou synthèse"""

    messages = [
        {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]

    raw = await call_gpt(messages, temperature=0.8, max_tokens=1500)

    # Nettoyage défensif des éventuels backticks markdown
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```").strip()

    # Parsing JSON
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Le modèle n'a pas retourné du JSON valide : {str(e)}\nRéponse brute : {raw[:300]}"
        )

    # Validation et normalisation
    raw_questions = data.get("questions", [])
    if not raw_questions:
        raise HTTPException(status_code=500, detail="Le modèle a retourné 0 questions.")

    validated = []
    for idx, q in enumerate(raw_questions[:5], 1):
        options = q.get("options", [])
        # Compléter ou tronquer si le modèle a fait une erreur
        while len(options) < 4:
            options.append(f"{'ABCD'[len(options)]}. Option non disponible")
        options = options[:4]

        correct = max(0, min(3, int(q.get("correctAnswer", 0))))  # clamp 0-3

        validated.append(QuizQuestion(
            id=idx,
            question=q.get("question", f"Question {idx}"),
            options=options,
            correctAnswer=correct,
            explanation=q.get("explanation", "Pas d'explication disponible."),
        ))

    return QuizQuestionsResponse(questions=validated)

# ─────────────────────────────────────────────
# RESSOURCES — /api/ressources
# ─────────────────────────────────────────────
HITL_ENABLED     = os.getenv("HITL_ENABLED", "false").lower() == "true"
N8N_HITL_WEBHOOK = os.getenv("N8N_HITL_WEBHOOK", "")

@app.get("/api/ressources", tags=["Ressources"])
async def get_ressources(query: str = "machine learning", n: int = 5):
    hitl_enabled = os.getenv("HITL_ENABLED", "false").lower() == "true"
    n8n_webhook  = os.getenv("N8N_HITL_WEBHOOK", "")
    if hitl_enabled and n8n_webhook:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # r = await client.post(n8n_webhook, json={"query": query, "n": n})
                # return r.json()
                r = await client.post(n8n_webhook, json={
                    "query": query,
                    "module": query,      # ← ajouter
                    "niveau": "débutant", # ← ajouter
                    "n": n
                })
        except Exception:
            results = search_resources(query, n_results=n)
            return {"query": query, "results": results}
    else:
        results = search_resources(query, n_results=n)
        return {"query": query, "results": results}
    

@app.get("/api/ressources/direct", tags=["Ressources"],
         summary="Route interne pour n8n — RAG direct sans HITL")
def get_ressources_direct(query: str = "machine learning", n: int = 5):
    """Route appelée par n8n uniquement — évite la boucle infinie HITL."""
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
# CHAT IA — /api/chat  (RAG + GPT-4o-mini)
# ─────────────────────────────────────────────
async def search_tavily(query: str, n: int = 4) -> list[ExternalResource]:
    """
    Recherche de ressources externes via Tavily API.
    Retourne des articles, vidéos YouTube, docs officielles.
    Retourne [] si la clé est absente ou si l'appel échoue.
    """
    tavily_key = os.getenv("TAVILY_API_KEY", "")
    if not tavily_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key":              tavily_key,
                    "query":                f"{query} tutorial explication ressources",
                    "search_depth":         "basic",
                    "include_answer":       False,
                    "include_raw_content":  False,
                    "max_results":          n,
                    "include_domains":      [
                        "youtube.com", "medium.com", "towardsdatascience.com",
                        "arxiv.org", "developer.mozilla.org", "docs.python.org",
                        "kaggle.com", "coursera.org", "openai.com", "huggingface.co",
                        "geeksforgeeks.org", "freecodecamp.org", "github.com"
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    resources = []
    for r in data.get("results", []):
        url   = r.get("url", "")
        title = r.get("title", "Ressource")
        desc  = r.get("content", "")[:200]

        # Détecter le type de ressource
        if "youtube.com" in url or "youtu.be" in url:
            rtype = "video"
        elif any(d in url for d in ["arxiv.org", "docs.", "developer."]):
            rtype = "documentation"
        elif any(d in url for d in ["medium.com", "towardsdatascience.com",
                                     "freecodecamp.org", "geeksforgeeks.org"]):
            rtype = "article"
        else:
            rtype = "web"

        resources.append(ExternalResource(
            title=title,
            url=url,
            description=desc,
            type=rtype,
        ))

    return resources


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat IA"],
          summary="Agent conversationnel — ChromaDB (explication) + Tavily (ressources externes)")

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat IA"],
          summary="Agent conversationnel — ChromaDB (explication) + Tavily (ressources externes)")
async def chat_with_agent(body: ChatRequest, current=Depends(get_current_user)):
    """
    Agent IA conversationnel.

    Flux :
      1. Récupère le profil étudiant pour personnaliser le ton.
      2. ChromaDB  → chunks des PDFs uploadés par l'étudiant (contexte d'explication).
      3. Tavily    → ressources externes réelles (articles, YouTube, docs).
      4. GPT reçoit le contexte local et génère une explication claire.
      5. Retourne { reply, sources (PDFs locaux), external_resources (Tavily) }.
    """
    # — 1. Profil étudiant
    profil_context = ""
    try:
        db = get_db()
        row = db.execute(
            "SELECT niveau, objectifs FROM etudiants WHERE id = ?",
            (body.etudiant_id,)
        ).fetchone()
        if row:
            profil_context = (
                f"L'étudiant a un niveau **{row['niveau']}** "
                f"et ses objectifs sont : {row['objectifs']}."
            )
    except Exception:
        pass

    # — 2. ChromaDB : contexte local pour l'explication (PDFs uploadés)
    rag_results    = search_resources(body.message, n_results=3)
    context_blocks: list[str] = []
    pdf_sources:    list[str] = []

    for i, res in enumerate(rag_results, 1):
        content = res.get("contenu", res.get("content", res.get("document", "")))
        source  = res.get("source", res.get("metadata", {}).get("source", f"Document {i}"))
        if content and source != "système":
            context_blocks.append(f"[Extrait {i} — {source}]\n{content}")
            pdf_sources.append(source)

    context_text = "\n\n".join(context_blocks) if context_blocks else ""

    # — 3. Tavily : ressources externes en parallèle
    external_resources = await search_tavily(body.message, n=4)

    # — MCP Filesystem : liste les fichiers disponibles
    mcp_context = await mcp_get_context(body.message)

    # — 4. Prompt GPT — axé explication, pas recommandation de ressources
    has_context = bool(context_text)
    system_prompt = f"""Tu es PathWise, un assistant pédagogique intelligent pour étudiants en informatique à l'EMSI.
{f"Contexte étudiant : {profil_context}" if profil_context else ""}

Ton rôle :
- Expliquer clairement le concept demandé en français.
- Être pédagogique, structuré et encourageant.
- Adapter le niveau de détail au profil de l'étudiant.
{f'''
Tu as accès aux extraits des documents uploadés par l'étudiant.
Utilise-les PRIORITAIREMENT pour expliquer, en citant le document si pertinent.

--- EXTRAITS DES DOCUMENTS ---
{context_text}
--- FIN DES EXTRAITS ---''' if has_context else "Utilise tes connaissances générales pour expliquer."}
{f"""
--- FICHIERS MCP DISPONIBLES ---
{mcp_context}
--- FIN MCP ---""" if mcp_context else ""}

NE PAS mentionner de liens ou ressources externes dans ta réponse — elles sont affichées séparément."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": body.message},
    ]

    # — 5. Appel GPT
    reply = await call_gpt(messages, temperature=0.6, max_tokens=800)

    return ChatResponse(
        reply=reply,
        sources=pdf_sources,
        external_resources=external_resources,
    )


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

    # — 5 dernières activités (quiz + sessions mélangés)
    sessions_recentes = []

    quiz_recents = db.execute(
        """SELECT module_nom, score, date_quiz as date
           FROM quiz_results WHERE etudiant_id = ?
           ORDER BY date_quiz DESC LIMIT 5""",
        (etudiant_id,),
    ).fetchall()
    for q in quiz_recents:
        sessions_recentes.append({
            "type":       "quiz",
            "titre":      q["module_nom"],
            "date":       q["date"],
            "score":      round(q["score"] * 100, 1),
            "duree":      None,
        })

    sessions_db = db.execute(
        """SELECT module_nom, duree_minutes, date_session as date, statut
           FROM sessions WHERE etudiant_id = ?
           ORDER BY date_session DESC LIMIT 5""",
        (etudiant_id,),
    ).fetchall()
    for s in sessions_db:
        sessions_recentes.append({
            "type":   "session",
            "titre":  s["module_nom"],
            "date":   s["date"],
            "score":  None,
            "duree":  s["duree_minutes"],
        })

    # Trier par date décroissante et garder les 5 plus récentes
    sessions_recentes.sort(key=lambda x: x["date"] or "", reverse=True)
    sessions_recentes = sessions_recentes[:5]

    # Compter modules complétés dans tous les parcours
    modules_completes = 0
    all_paths = db.execute(
        "SELECT contenu FROM learning_paths WHERE etudiant_id = ?", (etudiant_id,)
    ).fetchall()
    for p in all_paths:
        contenu = json.loads(p["contenu"]) if isinstance(p["contenu"], str) else p["contenu"]
        for m in contenu.get("modules", []):
            if m.get("completed"):
                modules_completes += 1

    return {
        "etudiant": etudiant,
        "quiz": {
            "nb_quiz":        stats_quiz["nb"],
            "score_moyen":    round((stats_quiz["avg_score"] or 0) * 100, 1),
            "meilleur_score": round((stats_quiz["best"] or 0) * 100, 1),
        },
        "sessions": {
            "nb_sessions":   stats_sessions["nb"],
            "temps_total_h": round((stats_sessions["total_min"] or 0) / 60, 1),
        },
        "modules_completes":  modules_completes,
        "dernier_parcours":   dict(last_path) if last_path else None,
        "sessions_recentes":  sessions_recentes,
    }

# ─────────────────────────────────────────────
# UPLOAD PDF — /api/upload
# ─────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE_MB   = 20

@app.post("/api/upload", tags=["Upload"],
          summary="Upload un PDF/DOCX — sauvegarde dans resources_raw/ et indexe dans ChromaDB")
async def upload_document(
    file: UploadFile = File(...),
    current=Depends(get_current_user)
):
    """
    Reçoit un fichier PDF ou DOCX uploadé par l'étudiant,
    le sauvegarde dans data/resources_raw/ et l'indexe immédiatement dans ChromaDB.

    Après cet appel, le fichier est disponible pour le RAG dans /api/chat.
    """
    # — Vérification extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté : {ext}. Formats acceptés : PDF, DOCX, TXT"
        )

    # — Vérification taille (lecture partielle)
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux : {size_mb:.1f} MB (max {MAX_FILE_SIZE_MB} MB)"
        )

    # — Dossier de destination
    resources_dir = Path(__file__).parent.parent / "data" / "resources_raw"
    resources_dir.mkdir(parents=True, exist_ok=True)

    # — Nom de fichier sécurisé (éviter les collisions)
    safe_filename = f"{Path(file.filename).stem}_{int(datetime.utcnow().timestamp())}{ext}"
    dest_path = resources_dir / safe_filename

    # — Sauvegarde sur disque
    with open(dest_path, "wb") as f:
        f.write(contents)

    # — Ré-indexation ChromaDB
    try:
        nb_indexed = index_all_pdfs()
        indexed_ok = True
    except Exception as e:
        indexed_ok = False
        nb_indexed = 0

    # — Vider le cache RAG pour prendre en compte le nouveau fichier
    try:
        from rag.retriever import clear_cache
        clear_cache()
    except Exception:
        pass

    return {
        "message":    f"✅ '{file.filename}' uploadé et indexé avec succès",
        "filename":   safe_filename,
        "size_mb":    round(size_mb, 2),
        "indexed":    indexed_ok,
        "nb_chunks":  nb_indexed,
    }

# ─────────────────────────────────────────────
# GENERATE LEARNING PATH — /api/learning-path/generate
# ─────────────────────────────────────────────
@app.post("/api/learning-path/generate", status_code=201, tags=["Learning Path"],
          summary="Génère un vrai parcours personnalisé via GPT-4o-mini + Tavily")
async def generate_learning_path(body: GenerateLearningPathRequest, current=Depends(get_current_user)):
    """
    Génère un parcours d'apprentissage VRAIMENT personnalisé.

    Flux :
      1. Récupère le profil (niveau, objectifs) depuis SQLite.
      2. Tavily cherche 6 vraies ressources sur le sujet.
      3. GPT génère 5-6 modules ordonnés avec URLs réelles.
      4. Sauvegarde en DB et retourne le parcours.
    """
    require_same_user(body.etudiant_id, current)
    db = get_db()

    # — 1. Profil étudiant
    row = db.execute(
        "SELECT niveau, objectifs, nom FROM etudiants WHERE id = ?",
        (body.etudiant_id,)
    ).fetchone()
    niveau   = body.level or (row["niveau"] if row else "intermédiaire")
    objectifs = row["objectifs"] if row else ""
    nom      = row["nom"] if row else "l'étudiant"

    # — 2. Tavily : vraies ressources sur le sujet
    tavily_key = os.getenv("TAVILY_API_KEY", "")
    ressources_tavily = []
    if tavily_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key":      tavily_key,
                        "query":        f"{body.subject} cours tutoriel {niveau} français",
                        "search_depth": "basic",
                        "max_results":  6,
                        "include_domains": [
                            "youtube.com", "medium.com", "towardsdatascience.com",
                            "openclassrooms.com", "coursera.org", "kaggle.com",
                            "geeksforgeeks.org", "freecodecamp.org", "github.com",
                            "developer.mozilla.org", "docs.python.org", "huggingface.co"
                        ],
                    },
                )
                resp.raise_for_status()
                for r in resp.json().get("results", []):
                    url = r.get("url", "")
                    if "youtube.com" in url:
                        rtype = "video"
                    elif any(d in url for d in ["docs.", "developer.", "huggingface."]):
                        rtype = "documentation"
                    elif any(d in url for d in ["medium.com", "towardsdatascience.com",
                                                 "freecodecamp.org", "geeksforgeeks.org",
                                                 "openclassrooms.com"]):
                        rtype = "article"
                    else:
                        rtype = "web"
                    ressources_tavily.append({
                        "titre": r.get("title", ""),
                        "url":   url,
                        "type":  rtype,
                        "desc":  r.get("content", "")[:150],
                    })
        except Exception:
            pass

    # — 3. GPT génère le parcours avec ces vraies ressources
    ressources_context = "\n".join([
        f"- [{r['type']}] {r['titre']} → {r['url']}"
        for r in ressources_tavily
    ]) or "Aucune ressource trouvée — génère des modules avec des URLs YouTube pertinentes."

    system_prompt = """Tu es un expert en pédagogie et en ingénierie de formation.
Tu génères des parcours d'apprentissage personnalisés en JSON pur, sans markdown ni backticks.
Le JSON doit respecter EXACTEMENT ce schéma :
{
  "modules": [
    {
      "id": "1",
      "ordre": 1,
      "titre": "Titre du module",
      "description": "Description pédagogique de 1-2 phrases.",
      "type": "video",
      "url": "https://...",
      "duree": "20 min",
      "difficulte": "Facile",
      "completed": false
    }
  ]
}
Règles :
- Entre 5 et 6 modules, ordonnés du plus simple au plus avancé
- "type" : "video" | "article" | "exercice" | "documentation"
- "url" : URL RÉELLE depuis les ressources fournies — jamais "#"
- "difficulte" : "Facile" | "Moyen" | "Avancé"
- Tout en français
- JSON pur uniquement, aucun texte autour"""

    user_prompt = f"""Génère un parcours d'apprentissage sur : **{body.subject}**
Niveau de l'étudiant : **{niveau}**
Objectifs : {objectifs or "Maîtriser les fondamentaux et progresser vers la pratique"}

Voici les vraies ressources disponibles — utilise leurs URLs dans les modules :
{ressources_context}

Crée 5-6 modules progressifs qui couvrent : introduction → concepts clés → pratique → projet."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt},
    ]

    raw = await call_gpt(messages, temperature=0.7, max_tokens=2000)

    # Nettoyage défensif
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```").strip()

    try:
        contenu = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback : générer des modules avec URLs YouTube si GPT échoue
        contenu = {"modules": [
            {"id": str(i), "ordre": i, "titre": f"{t} {body.subject}",
             "description": d, "type": tp,
             "url": f"https://www.youtube.com/results?search_query={body.subject.replace(' ', '+')}+{t.replace(' ', '+')}",
             "duree": dur, "difficulte": diff, "completed": False}
            for i, (t, d, tp, dur, diff) in enumerate([
                ("Introduction à", "Découvrez les fondamentaux.", "video", "20 min", "Facile"),
                ("Concepts clés de", "Les notions théoriques essentielles.", "article", "15 min", "Facile"),
                ("Pratique :", "Exercices guidés pas à pas.", "exercice", "30 min", "Moyen"),
                ("Approfondissement :", "Techniques avancées.", "video", "25 min", "Moyen"),
                ("Projet :", "Appliquez tout ce que vous avez appris.", "exercice", "45 min", "Avancé"),
            ], 1)
        ]}

    # Validation et correction des URLs vides
    for i, m in enumerate(contenu.get("modules", []), 1):
        m["id"] = str(i)
        m["ordre"] = i
        m["completed"] = False
        if not m.get("url") or m["url"] == "#":
            query = f"{m.get('titre', body.subject)} {body.subject}"
            if m.get("type") == "video":
                m["url"] = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
            else:
                m["url"] = f"https://www.google.com/search?q={query.replace(' ', '+')}"

    # — 4. Sauvegarde en DB
    titre = f"Parcours {body.subject} — niveau {niveau}"
    cur = db.execute(
        """INSERT INTO learning_paths (etudiant_id, titre, contenu, duree_estimee_h, date_creation)
           VALUES (?, ?, ?, ?, ?)""",
        (
            body.etudiant_id,
            titre,
            json.dumps(contenu, ensure_ascii=False),
            round(len(contenu.get("modules", [])) * 0.5, 1),
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

    return {
        "id":      cur.lastrowid,
        "titre":   titre,
        "contenu": contenu,
        "message": f"✅ Parcours '{body.subject}' généré avec {len(contenu.get('modules', []))} modules",
    }


# ─────────────────────────────────────────────
# COMPLÉTER UN MODULE — PATCH /api/learning-path/module/{module_id}/complete
# ─────────────────────────────────────────────
@app.patch("/api/learning-path/module/{path_id}/complete", tags=["Learning Path"],
           summary="Marque un module comme complété/non-complété dans le parcours")
def complete_module(path_id: int, module_id: str, body: ModuleCompleteRequest, current=Depends(get_current_user)):
    """
    Met à jour le statut 'completed' d'un module dans le JSON du parcours.
    path_id   = ID du learning_path en DB
    module_id = ID du module dans le JSON (query param)
    """
    require_same_user(body.etudiant_id, current)
    db = get_db()

    row = db.execute(
        "SELECT contenu, etudiant_id FROM learning_paths WHERE id = ?", (path_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if row["etudiant_id"] != body.etudiant_id:
        raise HTTPException(status_code=403, detail="Accès interdit")

    contenu = json.loads(row["contenu"]) if isinstance(row["contenu"], str) else row["contenu"]

    # Trouver et mettre à jour le module
    module_found = False
    for m in contenu.get("modules", []):
        if str(m.get("id")) == str(module_id):
            m["completed"] = body.completed
            module_found = True
            break

    if not module_found:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' introuvable dans ce parcours")

    db.execute(
        "UPDATE learning_paths SET contenu = ? WHERE id = ?",
        (json.dumps(contenu, ensure_ascii=False), path_id)
    )
    db.commit()

    nb_completes = sum(1 for m in contenu.get("modules", []) if m.get("completed"))
    nb_total     = len(contenu.get("modules", []))

    return {
        "message":       f"Module {'complété' if body.completed else 'remis en cours'}",
        "module_id":     module_id,
        "completed":     body.completed,
        "progression":   f"{nb_completes}/{nb_total} modules complétés",
    }

class AdaptRequest(BaseModel):
    etudiant_id: int
    module_nom: str
    score: float        # 0.0 – 1.0
    path_id: int

@app.post("/api/learning-path/adapt", tags=["Learning Path"],
          summary="Adapte le parcours selon le score du quiz")
async def adapt_learning_path(body: AdaptRequest, current=Depends(get_current_user)):
    require_same_user(body.etudiant_id, current)
    db = get_db()

    row = db.execute(
        "SELECT contenu FROM learning_paths WHERE id = ? AND etudiant_id = ?",
        (body.path_id, body.etudiant_id)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    contenu = json.loads(row["contenu"]) if isinstance(row["contenu"], str) else row["contenu"]
    modules = contenu.get("modules", [])
    score_pct = body.score * 100

    if score_pct < 60:
        # Score insuffisant → ajouter module de révision
        nouveau_module = {
            "id": str(len(modules) + 1),
            "ordre": len(modules) + 1,
            "titre": f"Révision — {body.module_nom}",
            "description": f"Module de révision car score insuffisant ({score_pct:.0f}%). Reprenez les bases.",
            "type": "video",
            "url": f"https://www.youtube.com/results?search_query={body.module_nom.replace(' ', '+')}+revision+debutant",
            "duree": "20 min",
            "difficulte": "Facile",
            "completed": False,
        }
        modules.append(nouveau_module)
        contenu["modules"] = modules
        action = "revision_ajoutee"
        message = f"Score insuffisant ({score_pct:.0f}%) — module de révision ajouté"
    else:
        # Score suffisant → marquer module comme complété
        for m in modules:
            if m.get("titre", "").lower() == body.module_nom.lower() or body.module_nom.lower() in m.get("titre", "").lower():
                m["completed"] = True
                break
        contenu["modules"] = modules
        action = "module_valide"
        message = f"Module validé ({score_pct:.0f}%) ✅"

    db.execute(
        "UPDATE learning_paths SET contenu = ? WHERE id = ?",
        (json.dumps(contenu, ensure_ascii=False), body.path_id)
    )
    db.commit()

    return {
        "action":   action,
        "message":  message,
        "score":    score_pct,
        "modules":  len(modules),
    }

@app.get("/api/quiz/score/internal", tags=["Quiz"])
def get_quiz_score_internal(etudiant_id: int):
    """Route interne pour n8n — pas d'auth JWT requise."""
    db = get_db()
    row = db.execute(
        "SELECT AVG(score) as score_moyen, COUNT(*) as nb_quiz FROM quiz_results WHERE etudiant_id = ?",
        (etudiant_id,),
    ).fetchone()
    score = round((row["score_moyen"] or 0) * 100, 1)
    return {"etudiant_id": etudiant_id, "score": score, "nb_quiz": row["nb_quiz"]}

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