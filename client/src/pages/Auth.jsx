import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Field, Spinner } from '../components/ui';
import { BookStack, Bow, Sparkle, Sprig, Teacup } from '../components/decor/Decor';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="gingham relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-oat-100/30 via-transparent to-oat-100/80" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Bow className="h-9 w-12" />
            <span className="font-serif text-3xl font-semibold">Readscape</span>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <Sprig className="absolute -top-28 -left-6 h-40 w-32" />
            <Sprig className="absolute -top-20 right-0 h-32 w-24" flip />
            <div className="flex items-end justify-center gap-2">
              <Teacup className="w-40" />
              <BookStack className="w-60" tones={['silver', 'mist', 'rose']} ribbon />
            </div>
          </div>
          <blockquote className="max-w-md rounded-2xl bg-oat-50/85 p-6 shadow-soft">
            <p className="font-serif text-2xl leading-snug text-cocoa italic">“A reader lives a thousand lives before he dies.”</p>
            <footer className="mt-2 text-sm text-cocoa-500">— George R.R. Martin</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-page">
          <div className="mb-8 text-center lg:text-left">
            <Bow className="mx-auto mb-3 h-10 w-14 lg:hidden" />
            <h1 className="text-[40px] leading-none">{title}</h1>
            <p className="mt-2 flex items-center justify-center gap-2 text-cocoa-500 lg:justify-start">
              {subtitle} <Sparkle className="size-3" />
            </p>
          </div>
          {children}
          <p className="mt-8 text-center text-sm text-cocoa-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} className="input pr-11" autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 icon-btn size-8" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.identifier, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Your library has missed you" footer={<>New to Readscape? <Link to="/signup" className="font-semibold text-cocoa underline-offset-2 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email or username">
          <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} className="input" autoComplete="username" required autoFocus />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
        </Field>
        {error && <p className="rounded-xl bg-cocoa-50 px-3.5 py-2.5 text-sm text-cocoa-700" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner />}Log in</button>
      </form>
    </AuthShell>
  );
}

export function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: k === 'username' ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Begin your library" subtitle="A cosy home for every book you love" footer={<>Already have an account? <Link to="/login" className="font-semibold text-cocoa underline-offset-2 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name">
          <input value={form.displayName} onChange={set('displayName')} className="input" autoComplete="name" maxLength={50} autoFocus />
        </Field>
        <Field label="Username" hint="Letters, numbers and underscores">
          <input value={form.username} onChange={set('username')} className="input" autoComplete="username" required minLength={3} maxLength={24} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} className="input" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        {error && <p className="rounded-xl bg-cocoa-50 px-3.5 py-2.5 text-sm text-cocoa-700" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner />}Create account</button>
      </form>
    </AuthShell>
  );
}
