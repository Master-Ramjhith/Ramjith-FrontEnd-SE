// Chatbot.js

import React, { useState, useRef, useEffect, useCallback } from "react";

// CONSTANTS & CONFIGURATION
const BASE_SYSTEM_INSTRUCTION = `You are the 'Resume Assistant' for a 'Dynamic Resume Analyzer' website. 
Your goal is to provide short, sweet, easy-to-read, layman-term answers for common people.
Keep all responses under 3 sentences maximum, using simple language.
Your expertise is focused on career development and resume best practices. 
You MUST answer questions related to:
1. Resume and ATS best practices.
2. LinkedIn account creation, profile optimization, and writing posts.
3. X (Twitter) account creation and writing posts.
4. Reddit for career advice or job searching, and writing posts.
5. Basic Git and GitHub commands for career development (e.g., clone, commit, pull).
6. Website features, key concepts (like JD or ATS), and general user queries.
For any question outside these 6 topics, simply respond with a helpful message:
"I'm only trained to help with website features, resume, social media, or basic GitHub questions.
What can I help you with in those areas?"`;

// UPDATED API Key
const GEMINI_API_KEY = "AIzaSyBRFIQTuvanFhK4CJJHVJUkZ_rfJUeNwxQ"; 

const INITIAL_MESSAGE = { 
  type: "bot", 
  text: "Hello! I’m your Resume Assistant 👋 How can I help you improve your ATS score or with career social media?" 
};

// FALLBACK MESSAGE for user-facing errors
const FALLBACK_MESSAGE = "I'm sorry, I'm currently having trouble connecting to the AI service. Please try asking again in a moment, or ask a different question about your resume or social media.";


// CUSTOM HOOK: useChatLogic for conversation state and API handling
function useChatLogic(resumeContext) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Helper to convert internal message format to Gemini's 'Content' format
  const toGeminiContent = (msg) => ({
    role: msg.type === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  });

  // Function to interact with the Gemini API
  const getBotReply = useCallback(async (history) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
        console.error("Gemini API key is missing.");
        return FALLBACK_MESSAGE;
    }

    // 1. CONTEXT STUFFING: Inject personalized data into the system instruction
    const { userEmail, resumeText, analysisSummary } = resumeContext;
    const userContext = `\n\n--- CURRENT USER & RESUME CONTEXT ---\n`;
    
    let context_parts = [`User's Email: ${userEmail || 'N/A'}`]; 
    
    if (resumeText) {
        context_parts.push(`User's Resume Content (first 400 chars): \n"${resumeText.substring(0, 400)}..."`);
    }

    if (analysisSummary) {
        context_parts.push(`Latest Resume Analysis Summary: ${analysisSummary}`);
    }

    const fullSystemInstruction = `${BASE_SYSTEM_INSTRUCTION}${userContext}${context_parts.join('\n')}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      // MULTI-TURN CHAT: Build the contents array with the entire history
      const conversationHistory = history
        .filter(m => m.text !== "<em>Typing…</em>")
        .map(toGeminiContent);

      const payload = {
        system_instruction: { parts: [{ text: fullSystemInstruction }] }, 
        contents: conversationHistory, 
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Check for success: API returns a valid response
      if (data?.candidates?.[0]?.content?.parts) {
        return data.candidates[0].content.parts.map((p) => p.text).join(" ");
      } 
      
      // Check for API errors (like 503 or quota errors)
      if (data?.error) {
        // Log the technical error to the console (as requested)
        console.error("Gemini API Error:", data.error.message);
        // Return the user-friendly fallback message
        return FALLBACK_MESSAGE;
      }
      
      // General failure catch (e.g., malformed response)
      console.error("Unknown Gemini API response structure:", data);
      return FALLBACK_MESSAGE;
      
    } catch (err) {
      // Handle network errors (e.g., failed to load resource)
      console.error("Network or Fetch Error:", err.message);
      return FALLBACK_MESSAGE;
    }
  }, [resumeContext]);

  // Main function to handle user message submission
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 1. Add user message, clear input
    const newUserMessage = { type: "user", text };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);

    const fullHistoryWithNewMessage = [...messages, newUserMessage]; 

    // 2. Add "typing" placeholder 
    setMessages((prev) => [...prev, { type: "bot", text: "<em>Typing…</em>" }]);
    
    // 3. Get reply from AI, passing the full history
    let reply = await getBotReply(fullHistoryWithNewMessage);

    // 4. Replace placeholder with final reply
    setMessages((prev) => [
      ...prev.slice(0, -1),
      { type: "bot", text: reply },
    ]);
    setLoading(false);
  }, [input, loading, getBotReply, messages]);
  
  return { messages, input, loading, setInput, send };
}


// CHATBOT COMPONENT (UI Layer)
export default function Chatbot({ onClose, isOpen, resumeContext })  {
  const { messages, input, loading, setInput, send } = useChatLogic(resumeContext);
  const messagesEndRef = useRef(null);

  // Scrolls to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Utility to safely parse simple markdown (*bold*)
  const parseMessage = (text) => {
    return text.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  }
  
  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <div className="chatbot">
        <div className="chat-header">
          <h3>🤖 Resume Assistant</h3>
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-message ${m.type}`}
              dangerouslySetInnerHTML={{ __html: parseMessage(m.text) }}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-row">
          <input
            autoFocus
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about ATS, keywords, format…"
            aria-label="Chat input"
          />
          <button onClick={send} disabled={loading} aria-label="Send message">Send</button>
        </div>
      </div>
    </div>
  );
}
