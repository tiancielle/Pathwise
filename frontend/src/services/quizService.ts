import api from './api'

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface AnswerInput {
  questionId: string
  selectedOption: number
  timeSpent: number
}

export interface QuizResult {
  score: number
  total: number
  percentage: number
  recommendations: string[]
  levelUp?: boolean
  newLevel?: string
}

export async function fetchQuestions(subject: string, level: string): Promise<QuizQuestion[]> {
  try {
    const { data } = await api.get('/quiz/questions', { params: { subject, level } })
    return data.questions || data
  } catch {
    return getFallbackQuestions(level)
  }
}

export async function submitQuiz(payload: {
  etudiant_id: number
  answers: AnswerInput[]
  questions: QuizQuestion[]
}): Promise<QuizResult> {
  const { etudiant_id, answers, questions } = payload

  const correct = answers.filter(a => {
    const q = questions.find(q => q.id === a.questionId)
    return q && a.selectedOption === q.correctAnswer
  }).length

  const score = correct
  const total = questions.length
  const percentage = Math.round((score / total) * 100)

  // 🎯 Calcul du nouveau niveau
  const currentLevel = localStorage.getItem('pw_level') || 'debutant'
  const newLevel =
    percentage >= 75 ? 'avance' :
    percentage >= 45 ? 'intermediaire' :
    'debutant'
  
  const levelUp = newLevel !== currentLevel &&
    (newLevel === 'avance' || (newLevel === 'intermediaire' && currentLevel === 'debutant'))

  // 💾 Persistance backend du résultat
  try {
    await api.post('/quiz/result', {
      etudiant_id,
      module_id: localStorage.getItem('pw_subject') || 'machine_learning',
      score: percentage,
      reponses: answers,
      duree: answers.reduce((s, a) => s + a.timeSpent, 0),
    })
  } catch {
    console.warn('Quiz result not saved')
  }

  // 🚀 Mise à jour du niveau si level up
  if (levelUp) {
    localStorage.setItem('pw_level', newLevel)
    try {
      const userId = localStorage.getItem('pw_user_id')
      if (userId) {
        await api.patch(`/profil/${userId}`, { niveau: newLevel })
      }
    } catch {
      console.warn('Level update failed')
    }
  }

  return {
    score,
    total,
    percentage,
    recommendations: percentage >= 75
      ? ['🎉 Excellent ! Cap sur les sujets avancés.']
      : percentage >= 45
      ? ['💪 Bon niveau ! Consolidez vos bases.']
      : ['📚 Continuez sur les fondamentaux.'],
    levelUp,
    newLevel: levelUp ? newLevel : undefined,
  }
}

export async function getQuizHistory(id: number) {
  const { data } = await api.get(`/quiz/history/${id}`)
  return data
}

function getFallbackQuestions(level: string): QuizQuestion[] {
  const advanced = level === 'avance'
  const intermediate = level === 'intermediaire'

  return [
    {
      id: 'q1',
      question: advanced
        ? "Quelle est la différence entre BERT et GPT en termes d'architecture ?"
        : intermediate
        ? "Qu'est-ce que le mécanisme d'attention dans les Transformers ?"
        : "Qu'est-ce que l'overfitting en Machine Learning ?",
      options: advanced ? [
        'BERT est auto-régressif, GPT est bidirectionnel',
        'BERT est bidirectionnel, GPT est auto-régressif',
        'Les deux sont identiques',
        'BERT utilise RNN, GPT utilise CNN',
      ] : intermediate ? [
        'Un mécanisme de mémoire externe',
        'Un mécanisme qui pondère l\'importance de chaque token',
        'Une fonction d\'activation',
        'Un type de normalisation',
      ] : [
        'Le modèle est trop simple',
        'Le modèle mémorise les données d\'entraînement',
        'Le modèle s\'entraîne trop lentement',
        'Manque de données',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'BERT utilise un encodeur bidirectionnel, GPT un décodeur auto-régressif.'
        : intermediate
        ? "L'attention permet au modèle de se concentrer sur les tokens pertinents."
        : "L'overfitting = le modèle mémorise au lieu de généraliser.",
    },
    {
      id: 'q2',
      question: advanced
        ? "Qu'est-ce que le fine-tuning par rapport au pre-training ?"
        : intermediate
        ? "Quelle est la différence entre RNN et Transformer ?"
        : "Quelle technique évite l'overfitting ?",
      options: advanced ? [
        'Ce sont des synonymes',
        'Le fine-tuning adapte un modèle pré-entraîné à une tâche spécifique',
        'Le pre-training est plus rapide',
        'Le fine-tuning utilise plus de données',
      ] : intermediate ? [
        'RNN traite en parallèle, Transformer en séquentiel',
        'Transformer traite en parallèle, RNN en séquentiel',
        'Ils sont identiques',
        'RNN est plus récent',
      ] : [
        'Plus de données',
        'Régularisation L1/L2',
        'Learning rate plus élevé',
        'Moins d\'epochs',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'Le fine-tuning spécialise un modèle général sur une tâche précise avec peu de données.'
        : intermediate
        ? 'Le Transformer traite tous les tokens en parallèle grâce à l\'attention.'
        : 'La régularisation pénalise les poids trop grands.',
    },
    {
      id: 'q3',
      question: advanced
        ? "Qu'est-ce que RAG (Retrieval Augmented Generation) ?"
        : intermediate
        ? "Qu'est-ce qu'un embedding en NLP ?"
        : "Que fait la fonction ReLU ?",
      options: advanced ? [
        'Un type de GAN',
        'Une technique qui combine recherche de documents et génération de texte',
        'Un algorithme d\'optimisation',
        'Un type de tokenization',
      ] : intermediate ? [
        'Un fichier encodé',
        'Une représentation numérique dense d\'un mot',
        'Un modèle de traduction',
        'Un réseau récurrent',
      ] : [
        'Normalise les poids',
        'max(0, x)',
        'Calcule la perte',
        'Applique le dropout',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'RAG récupère des documents pertinents et les injecte dans le contexte du LLM.'
        : intermediate
        ? 'Les embeddings capturent le sens sémantique des mots en espace vectoriel.'
        : 'ReLU = max(0, x), simple et efficace contre le vanishing gradient.',
    },
    {
      id: 'q4',
      question: advanced
        ? "Qu'est-ce que le RLHF ?"
        : intermediate
        ? "Qu'est-ce que la normalisation par batch (Batch Normalization) ?"
        : "Différence entre supervisé et non supervisé ?",
      options: advanced ? [
        'Random Learning with Human Feedback',
        'Reinforcement Learning from Human Feedback',
        'Recursive Learning with Hidden Features',
        'Rapid Learning with High Frequency',
      ] : intermediate ? [
        'Une technique pour augmenter le batch size',
        'Une normalisation des activations par mini-batch',
        'Un type de dropout',
        'Une fonction de perte',
      ] : [
        'Langage différent',
        'Labels vs pas de labels',
        'Vitesse différente',
        'Aucune différence',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'RLHF utilise les préférences humaines pour aligner les LLMs.'
        : intermediate
        ? 'BatchNorm stabilise l\'entraînement en normalisant les activations.'
        : 'Supervisé = données étiquetées. Non supervisé = clustering sans labels.',
    },
    {
      id: 'q5',
      question: advanced
        ? "Qu'est-ce que le Chain-of-Thought prompting ?"
        : intermediate
        ? "Qu'est-ce que le dropout en deep learning ?"
        : "Qu'est-ce qu'une fonction de perte (loss function) ?",
      options: advanced ? [
        'Un type de chaîne de Markov',
        'Une technique de prompting qui force le modèle à raisonner étape par étape',
        'Un algorithme de recherche',
        'Un type d\'architecture',
      ] : intermediate ? [
        'Une technique pour accélérer l\'entraînement',
        'Une technique de régularisation qui désactive aléatoirement des neurones',
        'Un type d\'activation',
        'Une méthode d\'initialisation',
      ] : [
        'Une fonction qui génère des données',
        'Une mesure de l\'erreur entre prédiction et réalité',
        'Un type de neurone',
        'Une méthode d\'optimisation',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'Le Chain-of-Thought force le modèle à décomposer le raisonnement en étapes.'
        : intermediate
        ? 'Le dropout réduit l\'overfitting en désactivant des neurones aléatoirement.'
        : 'La loss mesure l\'erreur — l\'objectif est de la minimiser.',
    },
  ]
}