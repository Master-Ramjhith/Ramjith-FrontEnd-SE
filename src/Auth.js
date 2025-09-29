import React, { useState } from "react";

/**
 * Dummy Authentication Component for Login/Register.
 * @param {object} props - Component props.
 * @param {function} props.onLogin - Callback function to execute upon successful dummy login.
 */
export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register views
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Dummy authentication logic: simply checks if fields are non-empty.
    // In a real application, this would involve API calls.
    if (email.trim() && password.trim()) {
      alert(isLogin ? "Dummy Login Successful!" : "Dummy Registration Successful!");
      // Simulate successful authentication and call the onLogin handler.
      onLogin(email); 
    } else {
      alert("Please enter both email and password.");
    }
  };

  const formTitle = isLogin ? "Login" : "Register";

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="section-title center">{formTitle} to use Resume Analyzer</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="text-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="password"
            placeholder="Password (DRA-SR-003: Strong required)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn primary full-width">
            {formTitle}
          </button>
        </form>
        <div className="switch-auth center">
          {isLogin ? "Need an account?" : "Already have an account?"}
          <button className="link-button" onClick={() => setIsLogin(!isLogin)} type="button">
            {isLogin ? "Register" : "Login"}
          </button>
        </div>
        <p className="hint center mt-1">
          <small>
            Authentication required for data security (DRA-SR-003). All data is dummy/local for this frontend demo.
          </small>
        </p>
      </div>
    </div>
  );
}

// Add necessary CSS for Auth.js to App.css (see section 4)