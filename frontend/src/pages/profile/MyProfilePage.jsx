// frontend/src/pages/profile/MyProfilePage.jsx
// Redirects to Settings page Profile section

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyProfilePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Settings page with Profile section
    navigate('/settings?section=profile', { replace: true });
  }, [navigate]);

  return null;
};

export default MyProfilePage;
