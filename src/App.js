// App.js

import React, { useState, useCallback, useEffect } from "react"; 
import ResumeAnalyzer from "./ResumeAnalyzer";
import Chatbot from "./Chatbot";
import Auth from "./Auth";
import "./App.css";
const SESSION_AUTH_KEY = "RA_SESSION_AUTH";

export default function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [authData, setAuthData] = useState({
    isLoggedIn: false,
    userEmail: null,
    passwordHash: null,
  });
  // State to hold resume-related context for the Chatbot
  const [resumeContext, setResumeContext] = useState({ 
    userEmail: null, 
    resumeText: "", 
    analysisSummary: null 
  }); 

  useEffect(() => {
    const savedAuth = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuthData(parsedAuth);
        // Initialize resumeContext.userEmail on session load
        setResumeContext(prev => ({ ...prev, userEmail: parsedAuth.userEmail })); 
      } catch (e) {
        sessionStorage.removeItem(SESSION_AUTH_KEY);
      }
    }
  }, []);

// Handles successful login and saves to sessionStorage
  const handleLogin = useCallback(({ email, passwordHash }) => {
    const newAuthData = { isLoggedIn: true, userEmail: email, passwordHash };
    setAuthData(newAuthData);
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(newAuthData));
    // Initialize resumeContext.userEmail on fresh login
    setResumeContext(prev => ({ ...prev, userEmail: email })); 
    console.log(`[App] Session for ${email} saved.`);
  }, []);

  // Fixes the potential ESLint warning by ensuring the function is correctly scoped and used below.
  const handleLogout = useCallback(() => {
    setAuthData({ isLoggedIn: false, userEmail: null, passwordHash: null });
    sessionStorage.removeItem(SESSION_AUTH_KEY); 
    // Clear chatbot context on logout
    setResumeContext({ userEmail: null, resumeText: "", analysisSummary: null }); 
    console.log("Logged out. Session cleared. Resume data remains persisted in localStorage.");
  }, []);
    
  // Callback to receive resume data from ResumeAnalyzer
  const handleResumeDataChange = useCallback((data) => {
    // Note: We use the incoming data object directly as it contains all three fields
    setResumeContext(data); 
    console.log(`[App] Resume context updated for ${data.userEmail}.`);
  }, []);

    return (
    <div className="app">
<header className="hero">
    <div className="hero-content">
        <div className="main-header-block"> 
            <div className="header-row">
                <h1 className="title-small">🚀 Dynamic Resume Analyzer</h1>
            </div>
            <p className="subtitle">ATS-aware scoring • Templates • Instant PDF</p>
        </div>
        {authData.isLoggedIn && (
            <div className="auth-info-row">
                <div className="auth-info">
                    <span className="user-email" title={authData.userEmail}>
                        {authData.userEmail}
                    </span>
                    {/* handleLogout is used here, resolving the warning */}
                    <button className="btn logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        )}

    </div>
</header>

      {/* Main Content */}
      <main className="container">
        {authData.isLoggedIn ? (
          <ResumeAnalyzer 
            userEmail={authData.userEmail} 
            passwordHash={authData.passwordHash} 
            // Pass the data change handler to ResumeAnalyzer
            onDataChange={handleResumeDataChange}
          />
        ) : (
          <Auth onLogin={handleLogin} />
        )}
      </main>

      {/* Floating Chatbot Button (FAB) */}
      {authData.isLoggedIn && (
        <>
          <button
            className={`fab ${showChatbot ? 'fab-active' : ''}`}
            aria-label="Open Resume Assistant"
            onClick={() => setShowChatbot(!showChatbot)}
          >
            {showChatbot ? '✕' : '💬'}
          </button>
          {/* Note: Chatbot component is now always rendered but hidden by CSS for smooth animation */}
          {/* Pass the resume context down to the Chatbot */}
          <Chatbot 
            onClose={() => setShowChatbot(false)} 
            isOpen={showChatbot} 
            resumeContext={resumeContext} 
          />
        </>
      )}

      {/* FOOTER */}
      <footer className="footer-v2">
        <div className="footer-content">
          <p className="footer-title">Dynamic Resume Analyzer</p>
          <div className="team-grid">
            <div className="team-member">
              <strong>Frontend</strong> - V C Ramjhith
            </div>
            <div className="team-member">
              <strong>Backend</strong> - Vamshi
            </div>
            <div className="team-member">
              <strong>QA Tester</strong> - Varshini
            </div>
            <div className="team-member">
              <strong>Team Leader</strong> - U Shivakumar
            </div>
          </div>
          <p className="footer-copyright">
            © 2025 Dynamic Resume Analyzer | ATS-Aware Excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
