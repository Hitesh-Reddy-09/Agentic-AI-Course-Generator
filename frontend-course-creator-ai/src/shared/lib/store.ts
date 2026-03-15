import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthPayload, CoursePlan, ChatMessage } from '@/shared/types';

interface AppState {
  token: string;
  userName: string;
  userEmail: string;
  userId: string;
  login: (auth: AuthPayload) => void;
  logout: () => void;
  setUserId: (id: string) => void;
  currentCoursePlan: CoursePlan | null;
  setCoursePlan: (plan: CoursePlan | null) => void;
  planHistory: CoursePlan[];
  addPlanVersion: (plan: CoursePlan) => void;
  tutorMessages: ChatMessage[];
  addTutorMessage: (msg: ChatMessage) => void;
  clearTutorMessages: () => void;
  doubtMessages: ChatMessage[];
  addDoubtMessage: (msg: ChatMessage) => void;
  clearDoubtMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: '',
      userName: '',
      userEmail: '',
      userId: '',
      login: (auth) => set({
        token: auth.access_token,
        userId: auth.user_id,
        userName: auth.name,
        userEmail: auth.email,
      }),
      logout: () => set({
        token: '',
        userId: '',
        userName: '',
        userEmail: '',
        currentCoursePlan: null,
        tutorMessages: [],
        doubtMessages: [],
      }),
      setUserId: (id) => set({ userId: id }),
      currentCoursePlan: null,
      setCoursePlan: (plan) => set({ currentCoursePlan: plan }),
      planHistory: [],
      addPlanVersion: (plan) => set((s) => ({ planHistory: [...s.planHistory, plan] })),
      tutorMessages: [],
      addTutorMessage: (msg) => set((s) => ({ tutorMessages: [...s.tutorMessages, msg] })),
      clearTutorMessages: () => set({ tutorMessages: [] }),
      doubtMessages: [],
      addDoubtMessage: (msg) => set((s) => ({ doubtMessages: [...s.doubtMessages, msg] })),
      clearDoubtMessages: () => set({ doubtMessages: [] }),
    }),
    { name: 'aura-learning-store' }
  )
);
