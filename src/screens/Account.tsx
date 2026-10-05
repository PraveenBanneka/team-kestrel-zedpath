// Account screens (CR-001): create an account, log in, reset with the recovery code, and the one-time
// "save your recovery code" screen. A username only: no email or phone number is asked for or stored.
import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_RE, normaliseUsername, type Extras, type MeResponse } from '../../shared/account.ts';
import { ApiFailure, logIn, recover, signUp } from '../account.ts';

type Mode = 'signup' | 'login' | 'recover';

function PasswordField({ label, value, onChange, autoComplete, invalid }: { label: string; value: string; onChange: (v: string) => void;
  autoComplete: 'new-password' | 'current-password'; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-wrap">
        <input className="input" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete} aria-invalid={invalid} maxLength={PASSWORD_MAX} />
        <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
      </span>
    </label>
  );
}

export function AuthScreen({ mode, profile, extras, go, onSignedUp, onLoggedIn }: {
  mode: Mode; profile: ProfileInput | null; extras: Extras; go: (to: string) => void;
  onSignedUp: (username: string, recoveryCode: string) => void; onLoggedIn: (me: MeResponse) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const u = normaliseUsername(username);
  const problem =
    !USERNAME_RE.test(u) ? 'Usernames are 3 to 24 characters: letters, numbers, dot or underscore'
    : mode === 'recover' && code.replace(/[^A-Za-z0-9]/g, '').length !== 16 ? 'Enter the 16-character recovery code'
    : password.length < (mode === 'login' ? 1 : PASSWORD_MIN) ? (mode === 'login' ? 'Enter your password' : `Passwords need at least ${PASSWORD_MIN} characters`)
    : mode !== 'login' && password !== confirm ? 'The two passwords do not match'
    : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true); setError(null);
    if (problem || busy) return;
    setBusy(true);
    try {
      if (mode === 'signup') { const r = await signUp(u, password, profile, extras); onSignedUp(r.username, r.recoveryCode); }
      else if (mode === 'login') onLoggedIn(await logIn(u, password));
      else { const r = await recover(u, code, password); onSignedUp(r.username, r.recoveryCode); }
    } catch (x) {
      setError(x instanceof ApiFailure ? x.message : 'Something went wrong. Try again');
    } finally { setBusy(false); }
  }

  const title = { signup: 'Create your account', login: 'Log in', recover: 'Reset your password' }[mode];
  const lead = {
    signup: 'Keep your details safe and open ZedPath on any phone or laptop with everything already filled in. Just a username: no email or phone number.',
    login: 'Welcome back. Your details will appear on this device.',
    recover: 'Use the recovery code you saved when you created your account. It works once; you will get a new one.',
  }[mode];
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{title}</h1>
        <p className="subtitle">{lead}</p>
      </div>
      <div className="card stack" style={{ gap: 14 }}>
        <label className="field">
          <span>Username</span>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={24} aria-invalid={tried && !USERNAME_RE.test(u)} />
          {mode === 'signup' && <span className="helper">Letters, numbers, dot or underscore. Not your real name if you prefer.</span>}
        </label>
        {mode === 'recover' && (
          <label className="field">
            <span>Recovery code</span>
            <input className="input mono" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={19} />
          </label>)}
        <PasswordField label={mode === 'recover' ? 'New password' : 'Password'} value={password} onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} invalid={tried && !!problem && password.length < PASSWORD_MIN} />
        {mode !== 'login' && <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password"
          invalid={tried && password !== confirm} />}
      </div>
      {tried && problem && <p className="error-text" role="alert">{problem}</p>}
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      <button className="btn filled block" type="submit" disabled={busy}>
        {busy ? 'Securing your password…' : { signup: 'Create account', login: 'Log in', recover: 'Reset password' }[mode]}</button>
      <p className="helper" style={{ textAlign: 'center' }}><ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
        Your password is scrambled on this phone before it is sent. ZedPath never sees it.</p>
      <div className="stack" style={{ gap: 0, alignItems: 'center' }}>
        {mode !== 'login' && <button type="button" className="btn text" onClick={() => go('/login')}>Already have an account? Log in</button>}
        {mode === 'login' && <button type="button" className="btn text" onClick={() => go('/signup')}>New here? Create an account</button>}
        {mode === 'login' && <button type="button" className="btn text" onClick={() => go('/recover')}>Forgot your password?</button>}
      </div>
    </form>
  );
}

export function RecoveryCodeScreen({ username, code, onDone }: { username: string; code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`ZedPath recovery code for ${username}: ${code}`); setCopied(true); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">Save your recovery code</h1>
        <p className="subtitle">If you ever forget your password, this code is the only way back into <b>{username}</b>. ZedPath cannot send reset emails.</p>
      </div>
      <motion.div className="card code-card" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <KeyRound size={22} aria-hidden="true" />
        <span className="code mono" aria-label={`Recovery code ${code.split('').join(' ')}`}>{code}</span>
        <button className="btn tonal" type="button" onClick={copy}>{copied ? <><Check size={18} aria-hidden="true" />Copied</> : <><Copy size={18} aria-hidden="true" />Copy</>}</button>
      </motion.div>
      <div className="alert warn"><TriangleAlert size={20} aria-hidden="true" />Write it down or keep it in your notes. You will not see this code again.</div>
      <label className="check-row">
        <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />
        <span>I have saved my recovery code</span>
      </label>
      <button className="btn filled block" disabled={!saved} onClick={onDone}>Continue</button>
    </div>
  );
}
