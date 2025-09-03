//App-version-2.js
import React, { useState, useEffect, useMemo } from "react";

const SECTIONS = {
  education: /\b(education|qualifications|degree|university|college)\b/i,
  skills: /\b(skills|technical skills|key skills|competencies)\b/i,
  experience: /\b(experience|work experience|employment|career)\b/i,
  projects: /\b(projects?|portfolio)\b/i,
  certifications: /\b(certifications?|certificates?|licensed?)\b/i,
  contact: /\b(contact|email|phone|linkedin|github|address)\b/i,
};

const RESUME_TEMPLATES = {
  modern: {
    name: "Modern Professional",
    styles: {
      fontFamily: "Georgia, serif",
      headerBg: "#2563eb",
      textColor: "#1f2937",
      accent: "#3b82f6",
    },
  },
  minimal: {
    name: "Minimal Clean",
    styles: {
      fontFamily: "Arial, sans-serif",
      headerBg: "#374151",
      textColor: "#111827",
      accent: "#6b7280",
    },
  },
  corporate: {
    name: "Corporate Elite",
    styles: {
      fontFamily: "Times New Roman, serif",
      headerBg: "#1f2937",
      textColor: "#111827",
      accent: "#4b5563",
    },
  },
  creative: {
    name: "Creative Bold",
    styles: {
      fontFamily: "Helvetica, sans-serif",
      headerBg: "#7c3aed",
      textColor: "#1f2937",
      accent: "#8b5cf6",
    },
  },
};

const CHATBOT_RESPONSES = {
  greeting:
    "Hello! I'm your Resume Assistant. How can I help you improve your resume today?",
  ats: "ATS systems scan for keywords, proper formatting, and standard section headings. Make sure to include relevant keywords from the job description and use standard headings like 'Experience', 'Skills', 'Education'.",
  keywords:
    "Include industry-specific keywords, action verbs like 'managed', 'developed', 'implemented', and quantify your achievements with numbers and percentages.",
  format:
    "Use a clean, simple format with consistent fonts, clear headings, bullet points, and adequate white space. Avoid tables, graphics, and complex formatting that ATS can't read.",
  sections:
    "Essential sections include: Contact Information, Professional Summary, Work Experience, Skills, and Education. Optional sections: Projects, Certifications, Awards.",
  default:
    "I can help with ATS optimization, keyword suggestions, formatting tips, and section recommendations. What specific area would you like to improve?",
};

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: "bot", message: CHATBOT_RESPONSES.greeting },
  ]);
  const [userMessage, setUserMessage] = useState("");

  const [showResumePreview, setShowResumePreview] = useState(false); // NEW

  useEffect(() => {
    if (resumeText.trim()) {
      const found = {};
      const missing = [];
      for (const [key, regex] of Object.entries(SECTIONS)) {
        if (regex.test(resumeText)) {
          found[key] = true;
        } else {
          missing.push(key);
        }
      }
      const atsScore = Math.max(0, 100 - missing.length * 15);
      setAnalysis({ found, missing, atsScore });
    }
  }, [resumeText]);

  const handleFile = (file) => {
    if (!file) return;
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => setResumeText(e.target.result);
      reader.readAsText(file);
    } else {
      alert("Please upload a .txt file only");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const feedback = useMemo(() => {
    if (!analysis) return [];
    const fb = [];
    if (analysis.missing.length) {
      fb.push(`Missing sections: ${analysis.missing.join(", ")}`);
    }
    if (analysis.atsScore < 50) {
      fb.push("❌ Low ATS score. Add missing sections immediately.");
    } else if (analysis.atsScore < 80) {
      fb.push("⚠️ Good foundation, but can improve with optimization.");
    } else {
      fb.push("✅ Excellent resume structure! ATS-friendly.");
    }
    if (analysis.found.skills) fb.push("✓ Skills section detected");
    if (analysis.found.experience) fb.push("✓ Experience section found");
    if (!analysis.found.contact) fb.push("⚠️ Add clear contact information");
    return fb;
  }, [analysis]);

  // ---- Modified download (no popup, show preview in page) ----
  const downloadResumePDF = () => {
    if (!resumeText.trim()) return;
    setShowResumePreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // ---- Chat handling unified ----
  const sendChatMessage = (text) => {
    if (!text || !text.trim()) return;
    const newMessages = [...chatMessages, { type: "user", message: text }];

    let botResponse = CHATBOT_RESPONSES.default;
    const msg = text.toLowerCase();
    if (msg.includes("ats") || msg.includes("system")) {
      botResponse = CHATBOT_RESPONSES.ats;
    } else if (msg.includes("keyword") || msg.includes("word")) {
      botResponse = CHATBOT_RESPONSES.keywords;
    } else if (msg.includes("format") || msg.includes("layout")) {
      botResponse = CHATBOT_RESPONSES.format;
    } else if (msg.includes("section") || msg.includes("part")) {
      botResponse = CHATBOT_RESPONSES.sections;
    } else if (msg.includes("hello") || msg.includes("hi")) {
      botResponse = CHATBOT_RESPONSES.greeting;
    }

    newMessages.push({ type: "bot", message: botResponse });
    setChatMessages(newMessages);
    setUserMessage("");
  };

  const handleChatSubmit = () => {
    sendChatMessage(userMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>🚀 Dynamic Resume Analyzer</h1>
          <p style={styles.subtitle}>
            AI-Powered ATS Optimization & Professional Templates
          </p>
        </div>
      </header>

      <main style={styles.container}>
        {/* Upload Section */}
        <section style={styles.uploadSection}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>📄 Upload Your Resume</h2>
            <div
              style={styles.dropzone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div style={styles.dropzoneContent}>
                <div style={styles.uploadIcon}>📁</div>
                <p style={styles.dropzoneText}>
                  Drag & Drop your resume (.txt)
                </p>
                <span style={styles.or}>or</span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => handleFile(e.target.files[0])}
                  style={styles.fileInput}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={styles.uploadButton}>
                  Choose File
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Template Selection */}
        {resumeText && (
          <section style={styles.templateSection}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>🎨 Choose Resume Template</h2>
              <div style={styles.templateGrid}>
                {Object.entries(RESUME_TEMPLATES).map(([key, template]) => (
                  <div
                    key={key}
                    style={{
                      ...styles.templateCard,
                      ...(selectedTemplate === key
                        ? styles.selectedTemplate
                        : {}),
                    }}
                    onClick={() => setSelectedTemplate(key)}
                  >
                    <div
                      style={{
                        ...styles.templatePreview,
                        background: template.styles.headerBg,
                      }}
                    ></div>
                    <h3 style={styles.templateName}>{template.name}</h3>
                    <p style={styles.templateDesc}>
                      {key === "modern" && "Clean and professional design"}
                      {key === "minimal" && "Simple and elegant layout"}
                      {key === "corporate" && "Traditional business format"}
                      {key === "creative" && "Bold and innovative style"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Results Section */}
        {analysis && (
          <section style={styles.resultsSection}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>📊 Analysis Results</h2>

              {/* Score Display */}
              <div style={styles.scoreContainer}>
                <div style={styles.scoreCircle}>
                  <span style={styles.scoreValue}>{analysis.atsScore}%</span>
                  <span style={styles.scoreLabel}>ATS Score</span>
                </div>
                <div style={styles.scoreInfo}>
                  <h3>Resume Health Check</h3>
                  <p
                    style={{
                      color:
                        analysis.atsScore >= 80
                          ? "#10b981"
                          : analysis.atsScore >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {analysis.atsScore >= 80
                      ? "Excellent!"
                      : analysis.atsScore >= 50
                      ? "Good, but can improve"
                      : "Needs improvement"}
                  </p>
                </div>
              </div>

              {/* Sections Grid */}
              <div style={styles.sectionsGrid}>
                <div style={styles.sectionCard}>
                  <h3 style={{ ...styles.cardTitle, color: "#10b981" }}>
                    ✅ Found Sections ({Object.keys(analysis.found).length})
                  </h3>
                  <ul style={styles.sectionList}>
                    {Object.keys(analysis.found).map((section) => (
                      <li key={section} style={styles.foundSection}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={styles.sectionCard}>
                  <h3 style={{ ...styles.cardTitle, color: "#ef4444" }}>
                    ❌ Missing Sections ({analysis.missing.length})
                  </h3>
                  <ul style={styles.sectionList}>
                    {analysis.missing.map((section) => (
                      <li key={section} style={styles.missingSection}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Feedback */}
              <div style={styles.feedbackSection}>
                <h3 style={styles.cardTitle}>💡 Smart Recommendations</h3>
                <div style={styles.feedbackList}>
                  {feedback.map((fb, i) => (
                    <div key={i} style={styles.feedbackItem}>
                      {fb}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                <button style={styles.primaryButton} onClick={downloadResumePDF}>
                  📄 Download PDF Resume
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* In-page Resume Preview */}
      {showResumePreview && (
        <section
          style={styles.previewOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResumePreview(false);
          }}
        >
          <div id="resume-preview" style={styles.previewCard}>
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #resume-preview, #resume-preview * { visibility: visible !important; }
                #resume-preview { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div style={styles.previewHeader}>
              <div>
                <strong>{RESUME_TEMPLATES[selectedTemplate].name}</strong>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Preview — showing on page (no popup)
                </div>
              </div>
              <div>
                <button
                  style={styles.printButton}
                  onClick={() => window.print()}
                >
                  Print
                </button>
                <button
                  style={styles.closePreview}
                  onClick={() => setShowResumePreview(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={styles.previewContent}>
              <style>{`
                #resume-preview .rp-body {
                  font-family: ${RESUME_TEMPLATES[selectedTemplate].styles.fontFamily};
                  color: ${RESUME_TEMPLATES[selectedTemplate].styles.textColor};
                  line-height: 1.6;
                  background: white;
                  padding: 24px;
                  border-radius: 8px;
                }
                #resume-preview .rp-header {
                  background: ${RESUME_TEMPLATES[selectedTemplate].styles.headerBg};
                  color: white;
                  padding: 18px;
                  border-radius: 6px;
                  margin-bottom: 18px;
                }
                #resume-preview h1, #resume-preview h2, #resume-preview h3 {
                  color: ${RESUME_TEMPLATES[selectedTemplate].styles.accent};
                }
              `}</style>
              <div
                className="rp-body"
                dangerouslySetInnerHTML={{
                  __html: resumeText.replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Floating Chat Button */}
      <button
        aria-label="Open resume assistant"
        title="Resume Assistant"
        style={styles.fab}
        onClick={() => setShowChatbot(true)}
      >
        💬
      </button>

      {/* Chatbot */}
      {showChatbot && (
        <div
          style={styles.chatbotOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChatbot(false);
          }}
        >
          <div style={styles.chatbot}>
            <div style={styles.chatHeader}>
              <h3>🤖 Resume Assistant</h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowChatbot(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "0 1rem 1rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "0.6rem",
                }}
              >
                <button
                  style={styles.quickBtn}
                  onClick={() => sendChatMessage("How to improve ATS score?")}
                >
                  Improve ATS
                </button>
                <button
                  style={styles.quickBtn}
                  onClick={() =>
                    sendChatMessage("Suggest keywords for software engineer")
                  }
                >
                  Keywords
                </button>
                <button
                  style={styles.quickBtn}
                  onClick={() =>
                    sendChatMessage("How should I format experience?")
                  }
                >
                  Format Experience
                </button>
              </div>
            </div>

            <div style={styles.chatMessages}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.chatMessage,
                    ...(msg.type === "user"
                      ? styles.userMessage
                      : styles.botMessage),
                  }}
                >
                  {msg.message}
                </div>
              ))}
            </div>

            <div style={styles.chatForm}>
              <input
                style={styles.chatInput}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Ask about resume optimization..."
                onKeyPress={handleKeyPress}
              />
              <button style={styles.chatSend} onClick={handleChatSubmit}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2025 Dynamic Resume Analyzer - Boost Your Career Success</p>
      </footer>
    </div>
  );
}

// ---------- styles ----------
const styles = {
  app: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    minHeight: "100vh",
    color: "#333",
  },
  hero: {
    background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
    color: "white",
    padding: "4rem 2rem",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroContent: { maxWidth: "800px", margin: "0 auto", position: "relative" },
  title: {
    fontSize: "3.5rem",
    fontWeight: "700",
    margin: "0 0 1rem 0",
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
  },
  subtitle: { fontSize: "1.2rem", opacity: "0.9", fontWeight: "300" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" },
  uploadSection: { marginBottom: "2rem" },
  card: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "20px",
    padding: "2.5rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    backdropFilter: "blur(10px)",
    marginBottom: "2rem",
  },
  sectionTitle: { fontSize: "1.6rem", fontWeight: "600", marginBottom: "1.2rem", color: "#1e3c72" },
  dropzone: { border: "2px dashed #3b82f6", borderRadius: "16px", padding: "2.5rem", textAlign: "center", background: "rgba(59,130,246,0.05)", cursor: "pointer" },
  dropzoneContent: { display: "flex", flexDirection: "column", alignItems: "center" },
  uploadIcon: { fontSize: "2.5rem", marginBottom: "0.8rem" },
  dropzoneText: { fontSize: "1.1rem", marginBottom: "0.8rem" },
  or: { margin: "0.5rem 0", fontWeight: "500", color: "#555" },
  fileInput: { display: "none" },
  uploadButton: { background: "#3b82f6", color: "white", padding: "0.7rem 1.5rem", borderRadius: "12px", cursor: "pointer", fontWeight: "500", transition: "all 0.3s ease" },
  templateSection: { marginBottom: "2rem" },
  templateGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" },
  templateCard: { background: "white", borderRadius: "14px", padding: "1.2rem", textAlign: "center", cursor: "pointer", border: "2px solid transparent", transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  selectedTemplate: { border: "2px solid #3b82f6", boxShadow: "0 6px 16px rgba(59,130,246,0.2)", transform: "scale(1.03)" },
  templatePreview: { height: "60px", borderRadius: "10px", marginBottom: "0.8rem" },
  templateName: { fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.3rem" },
  templateDesc: { fontSize: "0.85rem", color: "#666" },
  resultsSection: { marginBottom: "2rem" },
  scoreContainer: { display: "flex", alignItems: "center", gap: "2rem", marginBottom: "2rem" },
  scoreCircle: { width: "120px", height: "120px", borderRadius: "50%", background: "conic-gradient(#3b82f6 var(--percent), #e5e7eb 0)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: "600", color: "#1e3c72", position: "relative" },
  scoreValue: { fontSize: "1.6rem", fontWeight: "700" },
  scoreLabel: { fontSize: "0.85rem", fontWeight: "500", color: "#555" },
  scoreInfo: { flex: "1" },
  sectionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" },
  sectionCard: { background: "rgba(249,250,251,0.9)", borderRadius: "14px", padding: "1.2rem" },
  cardTitle: { fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.8rem" },
  sectionList: { listStyle: "none", padding: 0, margin: 0 },
  foundSection: { padding: "0.4rem 0", color: "#10b981" },
  missingSection: { padding: "0.4rem 0", color: "#ef4444" },
  feedbackSection: { marginBottom: "1.5rem" },
  feedbackList: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  feedbackItem: { background: "rgba(59,130,246,0.05)", padding: "0.8rem", borderRadius: "10px", borderLeft: "4px solid #3b82f6" },
  actionButtons: { display: "flex", justifyContent: "center", gap: "1rem" },
  primaryButton: { background: "#2563eb", color: "white", padding: "0.9rem 2rem", borderRadius: "14px", fontWeight: "600", cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", transition: "all 0.3s ease" },
  previewOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "2rem" },
  previewCard: { background: "white", borderRadius: "14px", width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid #ddd", background: "#f9fafb" },
  previewContent: { flex: "1", overflowY: "auto", padding: "1rem" },
  printButton: { padding: "0.4rem 0.8rem", border: "none", borderRadius: "6px", background: "#2563eb", color: "white", cursor: "pointer", marginRight: "0.5rem" },
  closePreview: { padding: "0.4rem 0.8rem", border: "none", borderRadius: "6px", background: "#ef4444", color: "white", cursor: "pointer" },
  fab: { position: "fixed", bottom: "1.5rem", right: "1.5rem", width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#2563eb", color: "white", fontSize: "1.5rem", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", cursor: "pointer", zIndex: 900 },
  chatbotOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  chatbot: { background: "white", borderRadius: "16px", width: "100%", maxWidth: "450px", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  chatHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1rem", borderBottom: "1px solid #ddd", background: "#2563eb", color: "white" },
  closeButton: { background: "transparent", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
  chatMessages: { flex: "1", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", background: "#f9fafb" },
  chatMessage: { padding: "0.7rem 1rem", borderRadius: "12px", maxWidth: "80%" },
  userMessage: { background: "#2563eb", color: "white", alignSelf: "flex-end" },
  botMessage: { background: "#e5e7eb", color: "#111", alignSelf: "flex-start" },
  chatForm: { display: "flex", borderTop: "1px solid #ddd", padding: "0.8rem" },
  chatInput: { flex: "1", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", marginRight: "0.6rem" },
  chatSend: { background: "#2563eb", color: "white", border: "none", padding: "0.6rem 1rem", borderRadius: "8px", cursor: "pointer" },
  quickBtn: { padding: "0.4rem 0.8rem", border: "1px solid #ddd", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "0.8rem" },
  footer: { textAlign: "center", padding: "1.5rem", color: "white", background: "rgba(0,0,0,0.2)", marginTop: "3rem", fontSize: "0.9rem" },
};
