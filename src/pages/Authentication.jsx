import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const Authentication = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Redirect to a placeholder dashboard (which is currently just a catch-all)
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden bg-background text-on-background antialiased flex">
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{backgroundImage: "url('https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=2400&auto=format&fit=crop')"}}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white max-w-md select-none">
          <h2 className="font-display-sm text-3xl xl:text-display-sm mb-4 leading-tight drop-shadow-lg">Engage Your Audience Like Never Before.</h2>
          <p className="font-body-lg text-base xl:text-body-lg opacity-90 leading-relaxed">Join thousands of creators hosting interactive quizzes and polls.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col justify-center px-container-padding lg:px-section-gap relative">
        <div className="absolute top-container-padding left-container-padding lg:left-section-gap">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2 select-none cursor-pointer">
            <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
            <span className="text-primary">QuizCore</span>
          </Link>
        </div>

        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[24px] border border-primary/10 p-8 md:p-10 flex flex-col relative z-10 shadow-editorial mx-auto animate-slideUp">
          
          <div className="mb-8">
            <h1 className="font-display-sm text-display-sm text-primary">Log in</h1>
            <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">Welcome back to QuizCore.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg font-body-md text-body-md text-center">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="email">Email address</label>
              <input 
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors placeholder:text-outline/70" 
                id="email" 
                placeholder="name@example.com" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Forgot Password?</a>
              </div>
              <input 
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors placeholder:text-outline/70" 
                id="password" 
                placeholder="••••••••" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
          
          <p className="mt-8 text-center font-body-md text-body-md text-on-surface-variant">
            Don't have an account? <Link className="font-label-md text-label-md text-primary hover:underline" to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Authentication;
