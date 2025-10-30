// Chatbot.js

import React, { useState, useRef, useEffect, useCallback } from "react";

// ------------------------------------
// I. CONSTANTS & CONFIGURATION
// ------------------------------------

const BASE_SYSTEM_INSTRUCTION = `You are the 'Resume Assistant' for a 'Dynamic Resume Analyzer' website. 
Your goal is to provide short, sweet, easy-to-read, layman-term answers for common people.
**Crucially, use an actual numbered or bulleted list for steps or multiple distinct points.**
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

// NOTE: Please replace with a securely stored environment variable in a real app.
const GEMINI_API_KEY = "AIzaSyBRFIQTuvanFhK4CJJHVJUkZ_rfJUeNwxQ"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;


const INITIAL_MESSAGE = { 
  type: "bot", 
  text: "Hello! I’m your **Resume Assistant** 👋 How can I help you improve your ATS score or with career social media?" 
};

// FALLBACK MESSAGE for user-facing errors (Static Answer for API Failure)
const FALLBACK_MESSAGE = "I'm sorry, I'm currently having trouble connecting to the AI service. Please try asking again in a moment, or ask a different question about your resume or social media.";


// ------------------------------------
// II. CUSTOM HOOK: useChatLogic
// ------------------------------------

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
      // MULTI-TURN CHAT: Build the contents array with the entire history
      const conversationHistory = history
        .filter(m => m.text !== "<em>Typing…</em>") // Exclude the typing placeholder
        .map(toGeminiContent);

      // 💥 CRITICAL FIX: Revert to the correct payload structure for the REST API.
      // system_instruction must be a top-level field, not nested inside 'config'.
      const payload = {
        system_instruction: { 
            parts: [{ text: fullSystemInstruction }] 
        }, 
        contents: conversationHistory, 
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Check for success
      if (data?.candidates?.[0]?.content?.parts) {
        return data.candidates[0].content.parts.map((p) => p.text).join(" ");
      } 
      
      // Check for API errors (handles the 400 response and returns fallback)
      if (data?.error) {
        console.error("Gemini API Error:", data.error.message);
        return FALLBACK_MESSAGE;
      }
      
      // General failure catch
      console.error("Unknown Gemini API response structure:", data);
      return FALLBACK_MESSAGE;
      
    } catch (err) {
      // Handle network errors
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
    const fullHistoryWithNewMessage = [...messages, newUserMessage]; 
    setMessages(fullHistoryWithNewMessage);
    setInput("");
    setLoading(true);

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


// ------------------------------------
// III. CHATBOT COMPONENT (UI Layer)
// ------------------------------------

/**
 * Utility to safely parse simple markdown (*bold*, **list items**) 
 * and convert them into HTML for rendering.
 */
const parseMessage = (text) => {
    // 1. Convert simple markdown bolding (*word* -> <strong>word</strong>)
    let html = text.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
    
    // 2. Bullet Point / List Fix: Convert lines starting with * or 1. etc. to <ul>/<li>
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        // Check for list item pattern: * item or 1. item
        if (trimmed.match(/^(\*|\d+\.)\s/)) {
            const listItemContent = trimmed.substring(trimmed.indexOf(' ') + 1);
            
            // Start of list
            if (!inList) {
                inList = true;
                // Use <ul> for both * and 1. style for simplicity in this parser
                return `<ul><li>${listItemContent}</li>`;
            }
            // Continuation of list
            return `<li>${listItemContent}</li>`;
        } else {
            // End of list
            if (inList) {
                inList = false;
                // Close list and then add the regular line
                return `</ul>${line}`; 
            }
            // Regular line
            return line; 
        }
    });

    // Close any unclosed list at the end
    if (inList) {
        processedLines.push('</ul>');
    }

    return processedLines.join('<br/>'); // Join with break tags for multiline output
}


export default function Chatbot({ onClose, isOpen, resumeContext })  {
  const { messages, input, loading, setInput, send } = useChatLogic(resumeContext);
  const messagesEndRef = useRef(null);

  // Scrolls to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  
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
              // **SECURITY NOTE: Ensure 'parseMessage' only handles simple, safe markdown**
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
