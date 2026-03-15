import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/shared/lib/store';
import {
  BookOpen, CheckCircle, PlayCircle, HelpCircle,
  MessageSquare, BarChart3, Award, Sparkles, ArrowRight
} from 'lucide-react';

const steps = [
  'Profile & Query',
  'AI Plan Generation',
  'Human Approval',
  'Video Lessons',
  'Quizzes',
  'Progress Tracking',
  'Final Exam',
  'Certificate',
];

const features = [
  { icon: Sparkles, title: 'AI-Powered Planning', desc: 'Intelligent course plans tailored to your learning goals and level.' },
  { icon: PlayCircle, title: 'YouTube Lessons', desc: 'Curated video content with auto-generated notes and summaries.' },
  { icon: HelpCircle, title: 'Doubt Assistant', desc: 'RAG-powered Q&A that answers from your course materials.' },
  { icon: MessageSquare, title: 'Tutor Chat', desc: 'Conversational AI tutor for guidance and explanations.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Track progress, identify weak areas, get recommendations.' },
  { icon: Award, title: 'Certification', desc: 'Earn a certificate after passing the final exam.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const }
  }),
};

export default function LandingPage() {
  const token = useAppStore((s) => s.token);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-bold font-display text-foreground">Aura Learning</span>
          <div className="flex items-center gap-2">
            {!token && (
              <>
                <Link to="/login">
                  <Button size="sm" variant="outline">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
            {token && (
              <Link to="/create">
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Learning
            </span>
            <h1 className="text-4xl font-extrabold font-display text-foreground sm:text-5xl lg:text-6xl leading-tight">
              Generate Your Perfect
              <br />
              <span className="text-primary">Learning Path</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Tell us what you want to learn. Our AI builds a structured course with videos, quizzes,
              tutoring, and certification — all personalized to your level.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/create">
                <Button size="lg" className="gap-2 text-base px-8">
                  Generate My Course
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/progress">
                <Button variant="outline" size="lg" className="text-base">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        {/* Gradient orb */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Workflow */}
      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold font-display text-foreground sm:text-3xl mb-12">
            How It Works
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {steps.map((step, i) => (
              <motion.div
                key={step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{step}</span>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-1 hidden sm:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold font-display text-foreground sm:text-3xl mb-12">
            Everything You Need to Learn
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold font-display text-foreground sm:text-3xl">
            Ready to Start Learning?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Create your first AI-generated course in under a minute.
          </p>
          <Link to="/create">
            <Button size="lg" className="mt-8 gap-2 px-8">
              <BookOpen className="h-4 w-4" />
              Generate My Course
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
