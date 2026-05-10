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

// Helper pour adapter la réponse API vers le format QuizQuestion[]
function _adaptQuestions(data: any): QuizQuestion[] {
  if (Array.isArray(data)) return data
  
  if (data?.questions && Array.isArray(data.questions)) return data.questions
  
  if (data?.id && data?.question) return [data]
  
  return []
}

// Helper pour générer les recommandations selon le score
function _buildRecommendations(percentage: number): string[] {
  if (percentage >= 75) {
    return ['Excellent ! Cap sur les sujets avances.']
  } else if (percentage >= 45) {
    return ['Bon niveau ! Consolidez vos bases.']
  } else {
    return ['Continuez sur les fondamentaux.']
  }
}

export async function fetchQuestions(
  subject: string, 
  level: string, 
  profileId?: number
): Promise<QuizQuestion[]> {
  try {
    const { data } = await api.post('/quiz/questions', {
      subject,
      level,
      profile_id: profileId || 0,
    })
    return _adaptQuestions(data.questions || data)
  } catch (error) {
    console.warn('Fetch questions failed, using fallback:', error)
    return getFallbackQuestions(level)
  }
}

export async function submitQuiz(payload: {
  etudiant_id: number
  answers: AnswerInput[]
  questions: QuizQuestion[]
}): Promise<QuizResult> {
  const { etudiant_id, answers, questions } = payload

  const correctCount = answers.filter(a => {
    const q = questions.find(q => q.id === a.questionId)
    return q && a.selectedOption === q.correctAnswer
  }).length

  const total = questions.length || answers.length
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0

  try {
    await api.post('/quiz/result', {
      etudiant_id,
      module_nom: localStorage.getItem('pw_subject') || 'machine_learning',
      score: percentage / 100,
      nb_questions: total,
      nb_correctes: correctCount,
      session_id: null,
      details: {
        answers: answers.map(a => ({
          question_id: a.questionId,
          selected: a.selectedOption,
          time_spent: a.timeSpent,
        }))
      },
    })
  } catch {
    console.warn('Quiz result not saved')
  }

  return {
    score: correctCount,
    total,
    percentage,
    recommendations: _buildRecommendations(percentage),
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
        ? "Quelle est la difference entre BERT et GPT en termes d'architecture ?"
        : intermediate
        ? "Qu'est-ce que le mecanisme d'attention dans les Transformers ?"
        : "Qu'est-ce que l'overfitting en Machine Learning ?",
      options: advanced ? [
        'BERT est auto-regressif, GPT est bidirectionnel',
        'BERT est bidirectionnel, GPT est auto-regressif',
        'Les deux sont identiques',
        'BERT utilise RNN, GPT utilise CNN',
      ] : intermediate ? [
        'Un mecanisme de memoire externe',
        'Un mecanisme qui pondere l\'importance de chaque token',
        'Une fonction d\'activation',
        'Un type de normalisation',
      ] : [
        'Le modele est trop simple',
        'Le modele memorise les donnees d\'entrainement',
        'Le modele s\'entraine trop lentement',
        'Manque de donnees',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'BERT utilise un encodeur bidirectionnel, GPT un decodeur auto-regressif.'
        : intermediate
        ? "L'attention permet au modele de se concentrer sur les tokens pertinents."
        : "L'overfitting = le modele memorise au lieu de generaliser.",
    },
    {
      id: 'q2',
      question: advanced
        ? "Qu'est-ce que le fine-tuning par rapport au pre-training ?"
        : intermediate
        ? "Quelle est la difference entre RNN et Transformer ?"
        : "Quelle technique evite l'overfitting ?",
      options: advanced ? [
        'Ce sont des synonymes',
        'Le fine-tuning adapte un modele pre-entraine a une tache specifique',
        'Le pre-training est plus rapide',
        'Le fine-tuning utilise plus de donnees',
      ] : intermediate ? [
        'RNN traite en parallele, Transformer en sequentiel',
        'Transformer traite en parallele, RNN en sequentiel',
        'Ils sont identiques',
        'RNN est plus recent',
      ] : [
        'Plus de donnees',
        'Regularisation L1/L2',
        'Learning rate plus eleve',
        'Moins d\'epochs',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'Le fine-tuning specialise un modele general sur une tache precise avec peu de donnees.'
        : intermediate
        ? 'Le Transformer traite tous les tokens en parallele grace a l\'attention.'
        : 'La regularisation penalise les poids trop grands.',
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
        'Une technique qui combine recherche de documents et generation de texte',
        'Un algorithme d\'optimisation',
        'Un type de tokenization',
      ] : intermediate ? [
        'Un fichier encode',
        'Une representation numerique dense d\'un mot',
        'Un modele de traduction',
        'Un reseau recurrent',
      ] : [
        'Normalise les poids',
        'max(0, x)',
        'Calcule la perte',
        'Applique le dropout',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'RAG recupere des documents pertinents et les injecte dans le contexte du LLM.'
        : intermediate
        ? 'Les embeddings capturent le sens semantique des mots en espace vectoriel.'
        : 'ReLU = max(0, x), simple et efficace contre le vanishing gradient.',
    },
    {
      id: 'q4',
      question: advanced
        ? "Qu'est-ce que le RLHF ?"
        : intermediate
        ? "Qu'est-ce que la normalisation par batch (Batch Normalization) ?"
        : "Difference entre supervise et non supervise ?",
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
        'Langage different',
        'Labels vs pas de labels',
        'Vitesse differente',
        'Aucune difference',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'RLHF utilise les preferences humaines pour aligner les LLMs.'
        : intermediate
        ? 'BatchNorm stabilise l\'entrainement en normalisant les activations.'
        : 'Supervise = donnees etiquetees. Non supervise = clustering sans labels.',
    },
    {
      id: 'q5',
      question: advanced
        ? "Qu'est-ce que le Chain-of-Thought prompting ?"
        : intermediate
        ? "Qu'est-ce que le dropout en deep learning ?"
        : "Qu'est-ce qu'une fonction de perte (loss function) ?",
      options: advanced ? [
        'Un type de chaine de Markov',
        'Une technique de prompting qui force le modele a raisonner etape par etape',
        'Un algorithme de recherche',
        'Un type d\'architecture',
      ] : intermediate ? [
        'Une technique pour accelerer l\'entrainement',
        'Une technique de regularisation qui desactive aleatoirement des neurones',
        'Un type d\'activation',
        'Une methode d\'initialisation',
      ] : [
        'Une fonction qui genere des donnees',
        'Une mesure de l\'erreur entre prediction et realite',
        'Un type de neurone',
        'Une methode d\'optimisation',
      ],
      correctAnswer: 1,
      explanation: advanced
        ? 'Le Chain-of-Thought force le modele a decomposer le raisonnement en etapes.'
        : intermediate
        ? 'Le dropout reduit l\'overfitting en desactivant des neurones aleatoirement.'
        : 'La loss mesure l\'erreur — l\'objectif est de la minimiser.',
    },
  ]
}