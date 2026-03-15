export interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export interface AuthPayload {
  access_token: string;
  token_type: 'bearer';
  user_id: string;
  name: string;
  email: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Course Creation
export interface CreateCourseRequest {
  user_id: string;
  query: string;
}

export interface CoursePlan {
  course_plan_id: string;
  title: string;
  level: string;
  goal: string;
  preferred_duration: string;
  raw_plan: any;
  status: 'draft' | 'awaiting_human_approval' | 'approved' | 'rejected';
}

export interface CreateCourseResponse {
  course_plan: CoursePlan;
  lesson_id?: string;
}

// Approval
export interface ApproveCourseRequest {
  course_plan_id: string;
  approved: boolean;
  user_edits?: Record<string, unknown>;
}

export interface ApproveCourseResponse {
  status: string;
  course_plan_id: string;
}

// Lesson
export interface LessonContent {
  lesson_id: string;
  title?: string;
  selected_video?: { url: string; title?: string; thumbnail?: string } | null;
  transcript: string;
  short_summary: string;
  detailed_notes: string;
  key_points: string[];
  quiz_id?: string;
  quiz_questions: QuizQuestion[];
  vector_indexing_status: string;
}

// Quiz
export interface QuizQuestion {
  question_id: string;
  question: string;
  options: string[];
  correct_answer?: string;
}

export interface SubmitQuizRequest {
  quiz_id: string;
  user_id: string;
  course_plan_id?: string;
  answers: Array<{ question_id: string; answer: string }>;
}

export interface SubmitQuizResponse {
  score: number;
  total: number;
  correct?: number;
  passed?: boolean;
  recommendation: string;
  weak_topics: string[];
}

// Tutor
export interface DoubtRequest {
  user_id: string;
  course_plan_id: string;
  question: string;
}

export interface DoubtResponse {
  answer: string;
  source_context?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TutorChatRequest {
  user_id: string;
  course_plan_id: string;
  message: string;
  history?: { role: string; content: string }[];
}

export interface TutorChatResponse {
  reply: string;
}

// Progress
export interface ProgressData {
  lessons_completed: number;
  total_lessons: number;
  average_quiz_score: number;
  attempts: number;
  time_spent_minutes: number;
  quiz_scores: { lesson: string; score: number }[];
  weak_topics: { topic: string; score: number }[];
  recommendations: string[];
}

// Exam
export interface ExamRequest {
  course_plan_id: string;
  user_id: string;
}

export interface ExamResponse {
  exam_id: string;
  questions: QuizQuestion[];
}

export interface ExamSubmitRequest {
  exam_id: string;
  user_id: string;
  answers: Record<string, string>;
}

export interface ExamResult {
  score: number;
  total: number;
  passed: boolean;
  certificate_eligible: boolean;
}

// Certificate
export interface Certificate {
  certificate_id: string;
  user_id: string;
  course_plan_id: string;
  title: string;
  score: number;
  level: string;
  issued_date: string;
}
