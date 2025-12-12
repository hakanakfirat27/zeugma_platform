import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// SignupPage now redirects to LoginPage which handles both login and signup
const SignupPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to login page - it will detect /signup path and show signup form
    navigate('/login', { replace: true, state: { showSignup: true } });
  }, [navigate]);

  return null;
};

export default SignupPage;
