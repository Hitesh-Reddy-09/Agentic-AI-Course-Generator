import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./features/landing/LandingPage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import CourseCreatePage from "./features/course/CourseCreatePage";
import LessonViewerPage from "./features/lesson/LessonViewerPage";
import QuizPage from "./features/quiz/QuizPage";
import TutorChatPage from "./features/tutor/TutorChatPage";
import ProgressPage from "./features/progress/ProgressPage";
import ExamCertPage from "./features/exam/ExamCertPage";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/create" element={<ProtectedRoute><CourseCreatePage /></ProtectedRoute>} />
          <Route path="/approval" element={<Navigate to="/create" replace />} />
          <Route path="/lesson" element={<ProtectedRoute><LessonViewerPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/tutor" element={<ProtectedRoute><TutorChatPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/exam" element={<ProtectedRoute><ExamCertPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
