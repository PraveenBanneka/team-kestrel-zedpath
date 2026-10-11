// Account screens: create an account, log in, reset with the recovery code, the one-time "save your recovery code"
// screen, and "complete your account". CR-003 (2026-10-11): an account is required, with full name, email, Sri Lankan
// mobile and date of birth, each with its stated purpose and recorded consent (shared/contact.ts, migration 0007).
import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_RE, normaliseUsername, type Extras, type MeResponse } from '../../shared/account.ts';
import { ApiFailure, logIn, recover, saveContact, signUp } from '../account.ts';
import { parseContact, CONSENT_VERSION, type Contact, type ContactField } from '../../shared/contact.ts';
import { t } from '../i18n/index.ts';
import { DEMO_CONTACT, DEMO_PASSWORD, DEMO_USERNAME, demoOn } from '../demo.ts';
import { Rich } from '../i18n/Rich.tsx';

type Mode = 'signup' | 'login' | 'recover';
const EMPTY: Contact = { fullName: '', email: '', mobile: '', birthDate: '' };
const fieldError = (f: ContactField) => t(`ct.err.${f}`);
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The four compulsory details and the consent box, shared by sign-up and "complete your account". */
function ContactFields({ value, onChange, consent, setConsent, bad }: { value: Contact; onChange: (c: Contact) => void;
  consent: boolean; setConsent: (b: boolean) => void; bad: ContactField | null }) {
  const set = (k: keyof Contact) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <label className="field"><span>{t('ct.name')}</span>
        <input className="input" value={value.fullName} onChange={set('fullName')} autoComplete="name" maxLength={80} aria-invalid={bad === 'fullName'} /></label>
      <label className="field"><span>{t('ct.email')}</span>
        <input className="input" type="email" value={value.email} onChange={set('email')} autoComplete="email" inputMode="email" maxLength={254} aria-invalid={bad === 'email'} /></label>
      <label className="field"><span>{t('ct.mobile')}</span>
        <input className="input" type="tel" value={value.mobile} onChange={set('mobile')} autoComplete="tel" inputMode="tel" placeholder="071 234 5678" maxLength={20} aria-invalid={bad === 'mobile'} />
        <span className="helper">{t('ct.mobileHelp')}</span></label>
      <label className="field"><span>{t('ct.dob')}</span>
        <input className="input" type="date" value={value.birthDate} onChange={set('birthDate')} max={todayIso()} autoComplete="bday" aria-invalid={bad === 'birthDate'} /></label>
      <p className="helper" style={{ margin: 0 }}>{t('ct.notVerified')}</p>
      <div className="alert info" style={{ margin: 0 }}><ShieldCheck size={20} aria-hidden="true" /><span>{t('ct.purpose')}</span></div>
      <label className="check-row" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} aria-invalid={bad === 'consent'} />
        <span className="body-m">{t('ct.consent')}</span>
      </label>
    </>);
}

/** CR-003: accounts made before contact details were required complete them here (also used to edit them). */
export function CompleteContactScreen({ initial, onDone }: { initial: Contact | null; onDone: (me: MeResponse) => void }) {
  const [c, setC] = useState<Contact>(initial ?? EMPTY);
  const [consent, setConsent] = useState(!!initial);
  const [bad, setBad] = useState<ContactField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    const p = parseContact(c, consent ? CONSENT_VERSION : null, todayIso());
    if (!p.ok) { setBad(p.field); setError(fieldError(p.field)); return; }
    setBad(null); setBusy(true);
    try { onDone(await saveContact(p.contact)); }
    catch (x) { setError(x instanceof ApiFailure && x.field ? fieldError(x.field as ContactField) : x instanceof ApiFailure ? x.message : t('auth.err.generic')); }
    finally { setBusy(false); }
  };
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{initial ? t('ct.yours') : t('ct.completeH')}</h1>
        {!initial && <p className="subtitle">{t('ct.completeSub')}</p>}
      </div>
      <div className="card stack" style={{ gap: 14 }}><ContactFields value={c} onChange={setC} consent={consent} setConsent={setConsent} bad={bad} /></div>
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      <button className="btn filled block" type="submit" disabled={busy}>{busy ? t('ct.saving') : t('ct.save')}</button>
    </form>);
}

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
  const demo = mode === 'signup' && demoOn();                        // ?demo=kasun: prefilled for the recording (src/demo.ts)
  const [username, setUsername] = useState(demo ? DEMO_USERNAME : '');
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : '');
  const [confirm, setConfirm] = useState(demo ? DEMO_PASSWORD : '');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [contact, setContact] = useState<Contact>(demo ? DEMO_CONTACT : EMPTY);
  const [consent, setConsent] = useState(false);
  const [badField, setBadField] = useState<ContactField | null>(null);
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
  const contactCheck = mode === 'signup' ? parseContact(contact, consent ? CONSENT_VERSION : null, todayIso()) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true); setError(null);
    if (problem || busy) return;
    if (contactCheck && !contactCheck.ok) { setBadField(contactCheck.field); setError(fieldError(contactCheck.field)); return; }
    setBadField(null);
    setBusy(true);
    try {
      if (mode === 'signup') { const r = await signUp(u, password, profile, extras, (contactCheck as { ok: true; contact: Contact }).contact, invite.trim() || undefined); onSignedUp(r.username, r.recoveryCode); }
      else if (mode === 'login') onLoggedIn(await logIn(u, password));
      else { const r = await recover(u, code, password); onSignedUp(r.username, r.recoveryCode); }
    } catch (x) {
      if (x instanceof ApiFailure && x.field && ['fullName', 'email', 'mobile', 'birthDate', 'consent'].includes(x.field)) { setBadField(x.field as ContactField); setError(fieldError(x.field as ContactField)); }
      else setError(x instanceof ApiFailure ? x.message : t('auth.err.generic'));
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
        {mode === 'signup' && <ContactFields value={contact} onChange={setContact} consent={consent} setConsent={setConsent} bad={badField} />}
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
