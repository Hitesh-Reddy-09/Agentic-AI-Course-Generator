import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { authApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (auth) => {
      login(auth);
      toast({ title: 'Account created', description: 'Welcome to Aura Learning.' });
      navigate('/create');
    },
    onError: (err: Error) => {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-display text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start your personalized AI course journey</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="name">Name</label>
            <Input id="name" {...register('name')} className="mt-1.5" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
            <Input id="email" type="email" {...register('email')} className="mt-1.5" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
            <Input id="password" type="password" {...register('password')} className="mt-1.5" />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create Account
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center">
          Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
