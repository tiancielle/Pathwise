import api from './api'
import type { AuthUser } from '../types'

export interface RegisterInput {
  nom: string
  email: string
  mot_de_passe: string  // ← changé
  niveau: 'debutant' | 'intermediaire' | 'avance'
  objectifs: string
}

export interface AuthResponse {
  access_token: string
  etudiant_id: number  // ← changé (backend renvoie etudiant_id pas etudiant)
  nom: string
  token_type: string
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  localStorage.setItem('pw_token', data.access_token)
  localStorage.setItem('pw_user_id', String(data.etudiant_id))
  localStorage.setItem('pw_user', JSON.stringify({ 
    id: data.etudiant_id, 
    nom: data.nom,
    email: input.email,
    niveau: input.niveau,
    objectifs: input.objectifs
  }))
  return data
}

export async function login(email: string, mot_de_passe: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, mot_de_passe })
  localStorage.setItem('pw_token', data.access_token)
  localStorage.setItem('pw_user_id', String(data.etudiant_id))
  localStorage.setItem('pw_user', JSON.stringify({
    id: data.etudiant_id,
    nom: data.nom,
    email,
    niveau: '',
    objectifs: ''
  }))
  return data
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me')
  return data
}

export function logout(): void {
  localStorage.clear()
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('pw_user')
  return raw ? JSON.parse(raw) : null
}

export function getStoredToken(): string | null {
  return localStorage.getItem('pw_token')
}