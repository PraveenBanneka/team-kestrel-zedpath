// Account screens (CR-001): create an account, log in, reset with the recovery code, and the one-time
// "save your recovery code" screen. A username only: no email or phone number is asked for or stored.
import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_RE, normaliseUsername, type Extras, type MeResponse } from '../../shared/account.ts';
import { ApiFailure, logIn, recover, signUp } from '../account.ts';
import { t } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';

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
        <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label={show ? t('auth.hide') : t('auth.show')}>
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
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const u = normaliseUsername(username);
  const problem =
    !USERNAME_RE.test(u) ? t('auth.err.username')
    : mode === 'recover' && code.replace(/[^A-Za-z0-9]/g, '').length !== 16 ? t('auth.err.code')
    : password.length < (mode === 'login' ? 1 : PASSWORD_MIN) ? (mode === 'login' ? t('auth.err.pw') : t('auth.err.pwShort', { n: PASSWORD_MIN }))
    : mode !== 'login' && password !== confirm ? t('auth.err.match')
    : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true); setError(null);
    if (problem || busy) return;
    setBusy(true);
    try {
      if (mode === 'signup') { const r = await signUp(u, password, profile, extras, invite.trim() || undefined); onSignedUp(r.username, r.recoveryCode); }
      else if (mode === 'login') onLoggedIn(await logIn(u, password));
      else { const r = await recover(u, code, password); onSignedUp(r.username, r.recoveryCode); }
    } catch (x) {
      setError(x instanceof ApiFailure ? x.message : t('auth.err.generic'));
    } finally { setBusy(false); }
  }

  const title = t(`auth.h.${mode}`);
  const lead = t(`auth.lead.${mode}`);
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{title}</h1>
        <p className="subtitle">{lead}</p>
      </div>
      <div className="card stack" style={{ gap: 14 }}>
        <label className="field">
          <span>{t('auth.username')}</span>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={24} aria-invalid={tried && !USERNAME_RE.test(u)} />
          {mode === 'signup' && <span className="helper">{t('auth.usernameHelp')}</span>}
        </label>
        {mode === 'recover' && (
          <label className="field">
            <span>{t('auth.code')}</span>
            <input className="input mono" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={19} />
          </label>)}
        <PasswordField label={mode === 'recover' ? t('auth.newPassword') : t('auth.password')} value={password} onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} invalid={tried && !!problem && password.length < PASSWORD_MIN} />
        {mode !== 'login' && <PasswordField label={t('auth.again')} value={confirm} onChange={setConfirm} autoComplete="new-password"
          invalid={tried && password !== confirm} />}
        {mode === 'signup' && (
          <details className="exact">
            <summary className="source-link"><KeyRound size={14} aria-hidden="true" />{t('auth.senior')}</summary>
            <label className="field">
              <span>{t('auth.invite')}</span>
              <input className="input" value={invite} onChange={e => setInvite(e.target.value)} autoCapitalize="characters" autoCorrect="off"
                spellCheck={false} maxLength={24} placeholder="XXXX-XXXX-XXXX-XXXX" />
              <span className="helper">{t('auth.inviteHelp')}</span>
            </label>
          </details>)}
      </div>
      {tried && problem && <p className="error-text" role="alert">{problem}</p>}
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      <button className="btn filled block" type="submit" disabled={busy}>
        {busy ? t('auth.busy') : t(`auth.btn.${mode}`)}</button>
      <p className="helper" style={{ textAlign: 'center' }}><ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
        {t('auth.scrambled')}</p>
      <div className="stack" style={{ gap: 0, alignItems: 'center' }}>
        {mode !== 'login' && <button type="button" className="btn text" onClick={() => go('/login')}>{t('auth.toLogin')}</button>}
        {mode === 'login' && <button type="button" className="btn text" onClick={() => go('/signup')}>{t('auth.toSignup')}</button>}
        {mode === 'login' && <button type="button" className="btn text" onClick={() => go('/recover')}>{t('auth.forgot')}</button>}
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
        <h1 className="screen-title">{t('rc.h')}</h1>
        <p className="subtitle"><Rich text={t('rc.sub', { u: username })} /></p>
      </div>
      <motion.div className="card code-card" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <KeyRound size={22} aria-hidden="true" />
        <span className="code mono" aria-label={`Recovery code ${code.split('').join(' ')}`}>{code}</span>
        <button className="btn tonal" type="button" onClick={copy}>{copied ? <><Check size={18} aria-hidden="true" />{t('rc.copied')}</> : <><Copy size={18} aria-hidden="true" />{t('rc.copy')}</>}</button>
      </motion.div>
      <div className="alert warn"><TriangleAlert size={20} aria-hidden="true" />{t('rc.warn')}</div>
      <label className="check-row">
        <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />
        <span>{t('rc.saved')}</span>
      </label>
      <button className="btn filled block" disabled={!saved} onClick={onDone}>{t('welcome.continue')}</button>
    </div>
  );
}
