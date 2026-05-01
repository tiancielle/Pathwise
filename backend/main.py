from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any
import sqlite3
import json

app = FastAPI()

class Profil(BaseModel):
    nom: str
    email: str = ""
    profil: dict

@app.post("/api/profil")
def sauvegarder_profil(data: Profil):
    conn = sqlite3.connect("pathwise.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO etudiants (nom, email, profil) VALUES (?, ?, ?)",
        (data.nom, data.email, json.dumps(data.profil))
    )
    conn.commit()
    etudiant_id = cursor.lastrowid
    conn.close()
    return {"status": "ok", "etudiant_id": etudiant_id}

@app.get("/api/profil/{nom}")
def get_profil(nom: str):
    conn = sqlite3.connect("pathwise.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM etudiants WHERE nom = ?", (nom,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "nom": row[1], "profil": json.loads(row[3])}
    return {"error": "Étudiant non trouvé"}

from rag_pipeline import get_resources

class ResourceRequest(BaseModel):
    module: str
    niveau: str

@app.post("/api/ressources")
def get_ressources(data: ResourceRequest):
    results = get_resources(data.module, data.niveau)
    return {"status": "ok", "source": results["source"], "ressources": results["results"]}

class QuizResult(BaseModel):
    etudiant_id: int
    module: str
    reponses: list[Any]

@app.post("/api/quiz/score")
def calculer_score(data: QuizResult):
    total = len(data.reponses)
    correct = sum(
        1 for r in data.reponses
        if isinstance(r, dict) and r.get("reponse") == r.get("correct")
    )
    score = (correct / total) * 100 if total > 0 else 0
    lacune = score < 60

    conn = sqlite3.connect("pathwise.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (etudiant_id, module, score) VALUES (?, ?, ?)",
        (data.etudiant_id, data.module, score)
    )
    conn.commit()
    conn.close()

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "lacune": lacune,
        "recommandation": "Réviser le module" if lacune else "Module validé "
    }