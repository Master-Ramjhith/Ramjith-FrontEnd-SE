import React, { useState } from "react";
import ResumeAnalyzer from "./ResumeAnalyzer";
import Chatbot from "./Chatbot";
import Auth from "./Auth";
import "./App.css";

export default function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  const handleLogin = (email) => {
    setIsLoggedIn(true);
    setUserEmail(email);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail(null);
    // In a real app, this would also clear session/local storage
    alert("Logged out. Resume data automatically cleared (DRA-SR-002 simulated).");
  };

  return (
    <div className="app">
      {/* IMPROVED HEADER (with login/logout) */}
      <header className="hero">
        <div className="hero-content">
          <div className="header-row">
            <h1 className="title-small">🚀 Dynamic Resume Analyzer</h1>
            {isLoggedIn && (
              <div className="auth-info">
                <span className="user-email">{userEmail}</span>
                <button className="btn logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
          <p className="subtitle">ATS-aware scoring • Templates • Instant PDF</p>
        </div>
      </header>

      {/* Main Content conditionally rendered based on authentication */}
      <main className="container">
        {isLoggedIn ? (
          <ResumeAnalyzer />
        ) : (
          <Auth onLogin={handleLogin} />
        )}
      </main>

      {/* FAB (Floating Action Button) for Chatbot */}
      {isLoggedIn && (
        <>
          <button
            className={`fab ${showChatbot ? 'fab-active' : ''}`}
            aria-label="Open Resume Assistant"
            onClick={() => setShowChatbot(!showChatbot)}
          >
            {showChatbot ? '✕' : '💬'}
          </button>
          {showChatbot && <Chatbot onClose={() => setShowChatbot(false)} />}
        </>
      )}

      {/* IMPROVED FOOTER */}
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
