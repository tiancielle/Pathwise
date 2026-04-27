from fastapi import FastAPI
from pydantic import BaseModel
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