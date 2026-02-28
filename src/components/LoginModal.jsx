import React, { useState } from 'react';
import '../index.css';
import { loginUser } from '../services/api';

export default function LoginModal({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!username || username.length !== 7 || !username.startsWith('7')) {
            setErrorMessage('กรุณาใส่รหัสพนักงานให้ถูกต้อง (ขึ้นต้นด้วย 7 และมี 7 หลัก)');
            return;
        }

        setIsLoading(true);

        try {
            const user = await loginUser(username, password);
            onLoginSuccess(user);
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div id="loginModal">
            <div className="login-content">
                <h2><i className="fas fa-user-lock"></i> เข้าสู่ระบบ</h2>
                <div id="errorMessage" style={{ display: errorMessage ? 'block' : 'none' }}>
                    {errorMessage}
                </div>
                <form id="loginForm" onSubmit={handleLogin}>
                    <div className="login-group">
                        <label htmlFor="username">รหัสพนักงาน (Username)</label>
                        <input
                            type="text"
                            id="username"
                            placeholder=""
                            maxLength="7"
                            required
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="login-group">
                        <label htmlFor="password">รหัสผ่าน (Password)</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder=""
                            maxLength="4"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <i
                            className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                            id="togglePassword"
                            style={{ display: password ? 'block' : 'none', cursor: 'pointer' }}
                            onClick={() => setShowPassword(!showPassword)}
                        ></i>
                    </div>
                    <div className="remember-me">
                        <input type="checkbox" id="rememberMe" />
                        <label htmlFor="rememberMe">จำฉันไว้</label>
                    </div>
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
                        {isLoading ? ' กำลังเข้าสู่ระบบ...' : ' เข้าสู่ระบบ'}
                    </button>
                </form>
            </div>
        </div>
    );
}
