import { FormEvent, useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, UserRound, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/api/client';

export function LoginPage() {
    const { login, sessionNotice, clearSessionNotice } = useAuth();
    const [staffCode, setStaffCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        clearSessionNotice();
        if (!staffCode.trim() || !password) {
            setError('Enter your staff code and password to continue.');
            return;
        }
        setSubmitting(true);
        try {
            await login(staffCode, password);
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.code === 'ACCOUNT_LOCKED') {
                    setError('This account is locked. Contact the Managing Director to unlock it.');
                } else if (err.code === 'INVALID_CREDENTIALS') {
                    setError('Incorrect staff code or password.');
                } else {
                    setError(err.message || 'Unable to sign in. Try again.');
                }
            } else {
                setError('Unable to reach the server. Check your connection and try again.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-brand">
                <div className="brand-mark login-brand-mark"><ShieldCheck size={26} /></div>
                <div>
                    <strong>Savitribai Fule</strong>
                    <span>Mahila Nagari Sahakari Patsanstha, Yavatmal</span>
                </div>
            </div>
            <div className="login-card">
                <div className="login-heading">
                    <h1>Sign in</h1>
                    <p>Use your staff credentials to open the workspace.</p>
                </div>
                {error && (
                    <div className="login-error" role="alert">
                        <AlertCircle size={17} />
                        <span>{error}</span>
                    </div>
                )}
                {!error && sessionNotice && (
                    <div className="login-error login-notice" role="status">
                        <AlertCircle size={17} />
                        <span>{sessionNotice}</span>
                    </div>
                )}
                <form className="login-form" onSubmit={(event) => void submit(event)}>
                    <label className="login-field">
                        <span>Staff code</span>
                        <div className="login-input">
                            <UserRound size={17} />
                            <input
                                autoComplete="username"
                                placeholder="e.g. MD-001"
                                value={staffCode}
                                onChange={(event) => setStaffCode(event.target.value)}
                            />
                        </div>
                    </label>
                    <label className="login-field">
                        <span>Password</span>
                        <div className="login-input">
                            <Lock size={17} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                            <button
                                type="button"
                                className="login-reveal"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((visible) => !visible)}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </label>
                    <button type="submit" className="login-submit" disabled={submitting}>
                        {submitting ? <Loader2 size={17} className="spin" /> : null}
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p className="login-hint">Secured workspace · Sign-in attempts are monitored</p>
            </div>
        </div>
    );
}
