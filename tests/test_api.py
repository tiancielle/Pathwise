#!/usr/bin/env python3
"""
PathWise — tests/test_api.py
Tests automatiques de toutes les routes FastAPI.

Usage :
    # Lancer le serveur d'abord :
    cd backend && uvicorn main:app --reload --port 8000

    # Puis dans un autre terminal :
    python tests/test_api.py
    python tests/test_api.py --url http://localhost:8000
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime

BASE_URL = "http://localhost:8000"
TOKEN    = None
EID      = None

PASS = "✅"
FAIL = "❌"
SKIP = "⏭️ "

results = {"pass": 0, "fail": 0, "skip": 0}


# ─────────────────────────────────────────────
# HELPERS HTTP
# ─────────────────────────────────────────────
def req(method: str, path: str, body=None, auth=False) -> tuple[int, dict]:
    url = BASE_URL + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if auth and TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    try:
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(request) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def check(label: str, status: int, data: dict, expect_status=200, expect_key=None):
    ok = status == expect_status
    if ok and expect_key:
        ok = expect_key in data

    symbol = PASS if ok else FAIL
    key_name = results["pass"] if ok else results["fail"]
    results["pass" if ok else "fail"] += 1

    detail = ""
    if not ok:
        detail = f" → HTTP {status} | {json.dumps(data)[:120]}"

    print(f"  {symbol}  {label}{detail}")
    return ok, data


# ─────────────────────────────────────────────
# TESTS
# ─────────────────────────────────────────────
def test_health():
    print("\n Health Check")
    s, d = req("GET", "/")
    check("GET /  → status running", s, d, 200, "status")


def test_auth():
    global TOKEN, EID
    print("\n Auth")

    ts = str(int(time.time()))
    email = f"test_{ts}@emsi.ma"

    # Register
    s, d = req("POST", "/api/auth/register", {
        "nom": "Hiba Test", "email": email,
        "mot_de_passe": "Password123!", "niveau": "intermédiaire",
        "objectifs": "Maîtriser le ML"
    })
    ok, d = check("POST /api/auth/register", s, d, 201, "access_token")
    if ok:
        TOKEN = d["access_token"]
        EID   = d["etudiant_id"]

    # Login
    s, d = req("POST", "/api/auth/login", {"email": email, "mot_de_passe": "Password123!"})
    ok, d = check("POST /api/auth/login", s, d, 200, "access_token")
    if ok:
        TOKEN = d["access_token"]

    # Login mauvais mdp
    s, d = req("POST", "/api/auth/login", {"email": email, "mot_de_passe": "mauvais"})
    check("POST /api/auth/login mauvais mdp → 401", s, d, 401)

    # /me
    s, d = req("GET", "/api/auth/me", auth=True)
    check("GET /api/auth/me", s, d, 200, "email")


def test_profil():
    print("\n Profil")
    if not EID:
        print(f"  {SKIP}  Tests ignorés (auth échoué)")
        results["skip"] += 3
        return

    s, d = req("GET", f"/api/profil/{EID}", auth=True)
    check("GET /api/profil/{id}", s, d, 200, "nom")

    s, d = req("PATCH", f"/api/profil/{EID}", {"niveau": "avancé"}, auth=True)
    check("PATCH /api/profil/{id}", s, d, 200)


def test_learning_path():
    print("\n  Learning Path")
    if not EID:
        print(f"  {SKIP}  Tests ignorés")
        results["skip"] += 3
        return

    parcours = {
        "modules": [
            {"nom": "Python Bases", "duree_h": 4, "ressources": ["intro_python.pdf"]},
            {"nom": "NumPy & Pandas", "duree_h": 6, "ressources": ["pandas_guide.pdf"]},
            {"nom": "Scikit-learn", "duree_h": 8, "ressources": ["sklearn_doc.pdf"]},
        ],
        "competences_cibles": ["Python", "ML supervisé"],
        "genere_le": datetime.utcnow().isoformat(),
    }

    # Create
    s, d = req("POST", "/api/learning-path", {
        "etudiant_id": EID,
        "titre": "Parcours ML pour débutant",
        "contenu": parcours,
        "duree_estimee_h": 18.0,
    }, auth=True)
    ok, d = check("POST /api/learning-path", s, d, 201, "id")
    path_id = d.get("id") if ok else None

    # Get
    s, d = req("GET", f"/api/learning-path/{EID}", auth=True)
    check("GET /api/learning-path/{id}", s, d, 200)

    # Delete
    if path_id:
        s, d = req("DELETE", f"/api/learning-path/{path_id}", auth=True)
        check("DELETE /api/learning-path/{id}", s, d, 200)


def test_sessions():
    print("\n Sessions")
    if not EID:
        print(f"  {SKIP}  Tests ignorés")
        results["skip"] += 2
        return

    s, d = req("POST", f"/api/sessions?etudiant_id={EID}&module_nom=Python Bases&duree_minutes=45&score=0.8&statut=terminé", auth=True)
    check("POST /api/sessions", s, d, 201, "id")

    s, d = req("GET", f"/api/sessions/{EID}", auth=True)
    check("GET /api/sessions/{id}", s, d, 200)


def test_quiz():
    print("\n Quiz")
    if not EID:
        print(f"  {SKIP}  Tests ignorés")
        results["skip"] += 3
        return

    s, d = req("POST", "/api/quiz/result", {
        "etudiant_id": EID,
        "module_nom": "Python Bases",
        "score": 0.75,
        "nb_questions": 10,
        "nb_correctes": 7,
        "details": {"q1": "correct", "q2": "incorrect"},
    }, auth=True)
    check("POST /api/quiz/result", s, d, 201)

    s, d = req("GET", f"/api/quiz/score?etudiant_id={EID}", auth=True)
    check("GET /api/quiz/score", s, d, 200, "score_moyen")

    s, d = req("GET", f"/api/quiz/history/{EID}", auth=True)
    check("GET /api/quiz/history/{id}", s, d, 200)


def test_rag():
    print("\n RAG / Ressources")
    s, d = req("GET", "/api/ressources?query=machine+learning&n=3")
    check("GET /api/ressources?query=machine learning", s, d, 200, "results")


def test_dashboard():
    print("\nDashboard")
    if not EID:
        print(f"  {SKIP}  Tests ignorés")
        results["skip"] += 1
        return
    s, d = req("GET", f"/api/dashboard/{EID}", auth=True)
    check("GET /api/dashboard/{id}", s, d, 200, "etudiant")


def test_security():
    print("\n Sécurité")
    # Accès sans token → 403
    s, d = req("GET", f"/api/profil/{EID or 1}")
    check("GET /api/profil sans token → 403", s, d, 403)

    # Token invalide
    old_token, globals()["TOKEN"] = TOKEN, "token.invalide.xxx"
    s, d = req("GET", "/api/auth/me", auth=True)
    check("GET /api/auth/me token invalide → 401", s, d, 401)
    globals()["TOKEN"] = old_token


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    global BASE_URL

    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    BASE_URL = args.url.rstrip("/")

    print("=" * 60)
    print("  PathWise API — Tests automatiques")
    print(f"  Serveur : {BASE_URL}")
    print(f"  Date    : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    test_health()
    test_auth()
    test_profil()
    test_learning_path()
    test_sessions()
    test_quiz()
    test_rag()
    test_dashboard()
    test_security()

    total = results["pass"] + results["fail"] + results["skip"]
    print(f"""
{'=' * 60}
  Résultats : {results['pass']}/{total - results['skip']} passés
   {results['pass']} réussis  |   {results['fail']} échoués  |    {results['skip']} ignorés
{'=' * 60}""")

    if results["fail"] > 0:
        print("\n Assurez-vous que le serveur tourne : uvicorn main:app --reload --port 8000")
        sys.exit(1)
    else:
        print("\n Tous les tests sont passés !")


if __name__ == "__main__":
    main()