import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Register the user
      await register(email, password, name);
      // Auto-login after successful registration
      await login(email, password);
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden bg-background text-on-background antialiased flex">
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container relative overflow-hidden">
        {/* Blob Animations */}
        <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-surface-variant rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-subtle-ripple" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-[40%] -right-[20%] w-[90%] h-[90%] bg-secondary-container rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-subtle-ripple" style={{ animationDelay: '2s' }}></div>
        <div className="relative z-10 w-full h-full flex items-center justify-center p-12">
          <div className="text-left max-w-lg">
            <h2 className="font-display-lg text-display-lg text-primary mb-6">Start your journey.</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Create engaging, real-time sessions that captivate your audience from the very first question.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col justify-center px-8 sm:px-12 md:px-24 py-12 relative">
        <div className="absolute top-8 left-8 lg:hidden">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2 select-none cursor-pointer">
            <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
            <span className="text-primary">QuizCore</span>
          </Link>
        </div>
        
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[24px] border border-primary/10 p-8 md:p-10 flex flex-col relative z-10 shadow-editorial mx-auto lg:mx-0">
          
          <div className="mb-8">
            <h1 className="font-display-sm text-display-sm text-primary">Sign up</h1>
            <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">Create your organizer account.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg font-body-md text-body-md text-center">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="name">Full Name</label>
              <input 
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors placeholder:text-outline/70" 
                id="name" 
                placeholder="John Doe" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="password">Password</label>
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
            <button 
              className="w-full bg-primary text-on-primary font-label-md text-label-md py-4 rounded-full mt-2 hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          
          <p className="mt-8 text-center font-body-md text-body-md text-on-surface-variant">
            Already have an account? <Link className="font-label-md text-label-md text-primary hover:underline" to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
