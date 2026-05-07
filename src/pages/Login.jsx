import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.form}>
        <h2 style={styles.title}>Admin Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#fbfaf7',
    fontFamily: '"Courier New", Courier, monospace'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
    padding: '2rem',
    background: '#fff',
    border: '1px solid #ddd',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  title: {
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: '#1a1a1a'
  },
  input: {
    marginBottom: '1rem',
    padding: '0.8rem',
    border: '1px solid #ccc',
    fontFamily: 'inherit'
  },
  button: {
    padding: '0.8rem',
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  }
};
