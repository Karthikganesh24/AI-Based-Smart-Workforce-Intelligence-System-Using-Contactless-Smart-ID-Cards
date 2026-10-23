import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Login.css';

export function Login() {
  const [identity, setIdentity] = useState('admin@smartworkforce.internal');
  const [password, setPassword] = useState('SmartWorkforce2024!');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        identity,
        password,
        portalMode: 'ADMIN'
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Login successful!');
        // Redirect to dashboard
        navigate(response.data.redirectTo || '/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>SmartWorkforce</h1>
          <p>Contactless Smart ID Card System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="identity">Email</label>
            <input
              id="identity"
              type="text"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="admin@smartworkforce.internal"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="login-hint">
            <p><strong>Default credentials:</strong></p>
            <p>Email: admin@smartworkforce.internal</p>
            <p>Password: SmartWorkforce2024!</p>
          </div>
        </form>
      </div>
    </div>
  );
}
