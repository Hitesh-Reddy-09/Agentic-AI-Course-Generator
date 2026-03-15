import { apiClient } from './client';
import type {
  ApiEnvelope,
  AuthPayload,
  RegisterRequest,
  LoginRequest,
  CreateCourseRequest, CreateCourseResponse,
  ApproveCourseRequest, ApproveCourseResponse,
  LessonContent,
  SubmitQuizRequest, SubmitQuizResponse,
  DoubtRequest, DoubtResponse,
  TutorChatRequest, TutorChatResponse,
  ProgressData,
  ExamRequest, ExamResponse,
  Certificate,
} from '@/shared/types';

const unwrap = <T>(payload: ApiEnvelope<T>) => payload.data;

export const courseApi = {
  create: (data: CreateCourseRequest) =>
    apiClient.post<ApiEnvelope<any>>('/courses', data).then((r) => {
      const raw = unwrap(r.data);
      const generated = raw.course_plan || {};
      const normalized: CreateCourseResponse = {
        course_plan: {
          course_plan_id: raw.course_plan_id,
          title: generated.title || 'Generated Course Plan',
          level: generated.level || 'beginner',
          goal: data.query,
          preferred_duration: raw.preferred_duration || 'self-paced',
          raw_plan: generated.raw_plan || generated,
          status: raw.status || 'draft',
        },
        lesson_id: raw.lesson_id,
      };
      return normalized;
    }),

  approve: (data: ApproveCourseRequest) =>
    apiClient.post<ApiEnvelope<any>>('/courses/approve', data).then((r) => {
      const raw = unwrap(r.data);
      const normalized: ApproveCourseResponse = {
        status: raw.status || (data.approved ? 'approved' : 'rejected'),
        course_plan_id: raw.course_plan_id || data.course_plan_id,
      };
      return normalized;
    }),

  getLesson: (lessonId: string, topic?: string, userId?: string, coursePlanId?: string) =>
    apiClient.get<ApiEnvelope<any>>(`/courses/${lessonId}/lesson`, {
      params: {
        ...(topic ? { topic } : {}),
        ...(userId ? { user_id: userId } : {}),
        ...(coursePlanId ? { course_plan_id: coursePlanId } : {}),
      },
    }).then((r) => {
      const raw = unwrap(r.data);
      const selectedVideo = raw.selected_video?.url
        ? raw.selected_video
        : (raw.best_video_url ? { url: raw.best_video_url, title: raw.title || 'Lesson Video' } : null);
      const quizQuestions = Array.isArray(raw.quiz?.questions)
        ? raw.quiz.questions.map((q: any, idx: number) => ({
            question_id: String(q?.question_id || `q${idx + 1}`),
            question: String(q?.question || `Question ${idx + 1}`),
            options: Array.isArray(q?.options) ? q.options.map(String) : [],
            correct_answer: q?.correct_answer ? String(q.correct_answer) : undefined,
          }))
        : [];
      const normalized: LessonContent = {
        lesson_id: raw.lesson_id || lessonId,
        title: raw.title,
        selected_video: selectedVideo,
        transcript: raw.transcript || '',
        short_summary: raw.notes?.short_summary || '',
        detailed_notes: raw.notes?.detailed_notes || '',
        key_points: raw.notes?.key_points || [],
        quiz_id: raw.quiz?.quiz_id,
        quiz_questions: quizQuestions,
        vector_indexing_status: raw.vector_indexing_status || 'unknown',
      };
      return normalized;
    }),

  submitQuiz: (data: SubmitQuizRequest) =>
    apiClient.post<ApiEnvelope<any>>('/courses/quiz/submit', data).then((r) => {
      const raw = unwrap(r.data);
      const result = raw.quiz_result || raw;
      const score = Number(result.score || 0);
      const total = Number(result.total || 0);
      const normalized: SubmitQuizResponse = {
        score,
        total,
        correct: Number(result.correct || 0),
        passed: Boolean(result.passed),
        recommendation: result.recommendation || 'Review key topics and retry.',
        weak_topics: result.weak_topics || [],
      };
      return normalized;
    }),

  getProgress: (coursePlanId: string, userId: string) =>
    apiClient.get<ApiEnvelope<any>>(`/courses/${coursePlanId}/progress/${userId}`).then((r) => {
      const raw = unwrap(r.data);
      const weakTopics = (raw.weak_topics || []).map((topicItem: any) => {
        if (typeof topicItem === 'string') {
          return { topic: topicItem, score: 50 };
        }
        return {
          topic: String(topicItem?.topic || 'weak topic'),
          score: Number(topicItem?.score || 50),
        };
      });
      const normalized: ProgressData = {
        lessons_completed: Number(raw.lessons_completed || 0),
        total_lessons: Number(raw.total_lessons || 1),
        average_quiz_score: Number(raw.average_quiz_score || 0),
        attempts: Number(raw.attempts_count || 0),
        time_spent_minutes: Number(raw.time_spent_minutes || 0),
        quiz_scores: raw.quiz_scores || [{ lesson: 'L1', score: Number(raw.average_quiz_score || 0) }],
        weak_topics: weakTopics,
        recommendations: raw.recommendations || [],
      };
      return normalized;
    }),

  startExam: (data: ExamRequest) =>
    apiClient.post<ApiEnvelope<any>>('/courses/exam', data).then((r) => {
      const raw = unwrap(r.data);
      const exam = raw.exam || {};
      const normalized: ExamResponse = {
        exam_id: raw.exam_id || data.course_plan_id,
        questions: exam.questions || [],
      };
      return normalized;
    }),

  getCertificate: (coursePlanId: string, userId: string) =>
    apiClient.get<ApiEnvelope<any>>(`/courses/${coursePlanId}/certificate/${userId}`).then((r) => {
      const raw = unwrap(r.data);
      const normalized: Certificate = {
        certificate_id: raw.certificate_id || '',
        user_id: raw.user_id || userId,
        course_plan_id: raw.course_plan_id || coursePlanId,
        title: 'AI Course Completion Certificate',
        score: Number(raw.final_score || 0),
        level: raw.level || 'beginner',
        issued_date: raw.issued_at || new Date().toISOString(),
      };
      return normalized;
    }),
};

export const tutorApi = {
  askDoubt: (data: DoubtRequest) =>
    apiClient.post<ApiEnvelope<any>>('/tutor/doubt', data).then((r) => {
      const raw = unwrap(r.data);
      const normalized: DoubtResponse = {
        answer: raw.rag_answer || raw.answer || 'No answer available yet.',
        source_context: raw.source_context,
      };
      return normalized;
    }),

  chat: (data: TutorChatRequest) =>
    apiClient.post<ApiEnvelope<any>>('/tutor/chat', data).then((r) => {
      const raw = unwrap(r.data);
      const normalized: TutorChatResponse = {
        reply: raw.tutor_answer || raw.reply || 'Tutor is currently unavailable.',
      };
      return normalized;
    }),
};

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiEnvelope<AuthPayload>>('/auth/register', data).then((r) => unwrap(r.data)),

  login: (data: LoginRequest) =>
    apiClient.post<ApiEnvelope<AuthPayload>>('/auth/login', data).then((r) => unwrap(r.data)),
};
