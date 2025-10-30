import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { storeResumeData, getResumeData } from "./ResumeStore"; 

// --- CONFIGURATION CONSTANTS ---
const WEIGHT_STRUCTURE = 40;
const WEIGHT_KEYWORDS = 30;
const WEIGHT_FORMATTING = 30;
const MAX_WEAK_WORD_PENALTY = 15;
const WEAK_WORDS_PER_PENALTY = 3;

// Section definitions for robust parsing (case-insensitive, multiline)
const RESUME_SECTIONS = {
    contact: /^\s*\b(contact|contact information|personal details?|details)\b/im, 
    summary: /^\s*\b(summary|objective|profile|professional summary|about me|career objective)\b/im,
    experience: /^\s*\b(experiences?|work experiences?|employment|career|professional history|relevant experiences?)\b/im,
    skills: /^\s*\b(skills?|technical skills?|competencies?|technologies?|tools?|expertise|core competencies?)\b/im, 
    education: /^\s*\b(education|degrees?|university|college|academic history|qualifications?)\b/im,
    projects: /^\s*\b(projects?|portfolio|personal projects?|contributions?)\b/im, 
    certifications: /^\s*\b(certifications?|certificates?|license|licensed?)\b/im,
    awards: /^\s*\b(awards|honors?|achievements?|recognition)\b/im,
};
  
const CORE_SECTIONS = ["contact", "summary", "experience", "skills", "education", "projects"];
const CORE_SECTIONS_LENGTH = CORE_SECTIONS.length;

export const RESUME_TEMPLATES = {
    modern: { id: 'modern', name: "Modern Professional", className: "theme-modern", fontStack: "'Roboto', 'Helvetica', 'Arial', sans-serif" },
    minimal: { id: 'minimal', name: "Minimal Clean", className: "theme-minimal", fontStack: "'Arial', sans-serif" },
    classic: { id: 'classic', name: "Classic Standard", className: "theme-classic", fontStack: "'Times New Roman', serif" },
};

const JOB_ROLES = {
    software_engineer: "Software Engineer",
    data_analyst: "Data Scientist/Analyst", 
    product_manager: "Product Manager",
    consultant: "Consultant",
    sales_marketing: "Sales & Marketing",
    other: "Other/General Role",
};

const JOB_ROLE_TEMPLATE_MAP = {
    software_engineer: RESUME_TEMPLATES.minimal.id,
    data_analyst: RESUME_TEMPLATES.minimal.id, 
    product_manager: RESUME_TEMPLATES.modern.id,
    consultant: RESUME_TEMPLATES.classic.id,
    sales_marketing: RESUME_TEMPLATES.modern.id,
    other: RESUME_TEMPLATES.modern.id,
};
  
const STOPWORDS = new Set([
    "and", "the", "with", "from", "that", "this", "your", "their", "our", "for", "into", "able", "will", "shall", "must", "have", "has", "had",
    "are", "was", "were", "you", "they", "them", "over", "under", "about", "above", "below", "not", "only", "but", "also", "more", "than",
    "such", "etc", "using", "use", "used", "strong", "good", "great", "work", "role", "team", "skills", "requirements", "responsibilities",
    "job", "description", "looking", "plus", "preferred", "required", "experience", "years", "year", "developer", "engineer", "data", "to",
    "a", "an", "is", "of", "in", "it", "at", "by", "be", "as", "or", "which", "all", "we", "company", "client"
]);
  
const WEAK_WORDS = [
    "responsible for", "managed", "worked on", "assisted", "duties included", "had to", "developed a", "was involved in", "my main task was", 
    "i was tasked with", "involved in", "helped out with", "supported", "contributed to", "participated in", "ran", "maintained", "utilized", 
    "gained experience in", "handled", "oversaw", "dealt with", "processed"
];
  
const STRONG_ACTION_VERBS = [
    "Spearheaded", "Drove", "Orchestrated", "Led", "Initiated", 
    "Optimized", "Engineered", "Developed", "Designed", "Executed", "Increased", "Reduced",
    "Built", "Managed", "Created", "Implemented", "Analyzed", "Streamlined", "Pioneered"
];
  
// --- Utility Functions ---

function extractKeywords(text) {
    return [...new Set(text.toLowerCase().split(/[^a-z0-9+#.\-/]/i) 
      .map(w => w.trim())
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
    )];
}
  
function firstNonEmptyLine(s) {
    return (s || "").split(/\r?\n/).map(x => x.trim()).find(x => x.length > 0) || "Candidate Name";
}

function findStrongActionVerbs(resumeText) {
    const resumeLower = resumeText.toLowerCase();
    const foundVerbs = new Set();
    
    STRONG_ACTION_VERBS.forEach(verb => {
        const regex = new RegExp(`\\b${verb}\\b`, 'i');
        if (regex.test(resumeLower)) {
            foundVerbs.add(verb);
        }
    });
    return Array.from(foundVerbs);
}

function escapeHTML(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
  
function plainToHTML(resumeText) {
    const lines = (resumeText || "").split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0);
    let htmlOutput = "";
    let inList = false;
  
    lines.forEach(trimmed => {
      const isHeading = Object.values(RESUME_SECTIONS).some(r => r.test(trimmed));
      const isBullet = trimmed.match(/^([*-]|\d+\.|\w+\.|\u2022|\u2013|\u2014)\s+/); 
      const safeContent = escapeHTML(trimmed.replace(/^([*-]|\d+\.|\w+\.|\u2022|\u2013|\u2014)\s*/, ''));
  
      if (isHeading) {
        if (inList) htmlOutput += "</ul>\n";
        inList = false;
        htmlOutput += `<h2 class="section-heading">${safeContent}</h2>\n`;
      } else if (isBullet) {
        if (!inList) htmlOutput += "<ul>\n";
        inList = true;
        htmlOutput += `<li>${safeContent}</li>\n`;
      } else {
        if (inList) htmlOutput += "</ul>\n";
        inList = false;
        htmlOutput += `<p>${safeContent}</p>\n`;
      }
    });
  
    if (inList) htmlOutput += "</ul>\n";
    return htmlOutput;
}
  
function calculateATSScore(resumeText, jobDescription) {
    const found = {};
    const missing = [];
    const resumeLower = resumeText.toLowerCase();
    
    // 1. Structure Score
    const firstLines = resumeText.split(/\r?\n/).slice(0, 5).join(' ').toLowerCase();
    if (firstLines.includes('email') || firstLines.includes('phone') || firstLines.includes('linkedin') || firstLines.includes('@')) { 
        found.contact = true;
    }
  
    Object.entries(RESUME_SECTIONS).forEach(([k, rgx]) => {
      if (rgx.test(resumeText)) found[k] = true;
    });
  
    CORE_SECTIONS.forEach(k => {
      if (!found[k]) {
        missing.push(k);
      }
    });
    
    const coreFoundCount = CORE_SECTIONS_LENGTH - missing.length; 
    const structureScore = Math.max(0, Math.round((coreFoundCount / CORE_SECTIONS_LENGTH) * WEIGHT_STRUCTURE));
  
    // 2. Keyword Score
    const jdKeys = extractKeywords(jobDescription);
    const matched = jdKeys.filter(k => resumeLower.includes(k));
    const keywordMatchRatio = jdKeys.length ? matched.length / jdKeys.length : 0; 
    const keywordScore = Math.round(keywordMatchRatio * WEIGHT_KEYWORDS); 
  
    // 3. Formatting Score
    let weakWordCount = 0;
    
    WEAK_WORDS.forEach(word => {
      const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      const regex = new RegExp(`\\b${safeWord}\\b`, 'gi'); 
      weakWordCount += (resumeLower.match(regex) || []).length;
    });
  
    const weakWordPenalty = Math.min(Math.floor(weakWordCount / WEAK_WORDS_PER_PENALTY) * (MAX_WEAK_WORD_PENALTY / (MAX_WEAK_WORD_PENALTY / WEAK_WORDS_PER_PENALTY)), MAX_WEAK_WORD_PENALTY);
    const formattingScore = Math.max(0, WEIGHT_FORMATTING - weakWordPenalty);
  
    // Final Score
    const atsScore = Math.max(0, Math.min(100, structureScore + keywordScore + formattingScore));
    const missingKeys = jdKeys.filter(k => !resumeLower.includes(k));
    const usedStrongVerbs = findStrongActionVerbs(resumeText);
  
    return {
      found, missing, matched, missingKeys,
      atsScore, uniqueJD: jdKeys.length,
      weakWordCount, usedStrongVerbs,
    };
}

const analyzeData = (resumeText, jobDescription) => {
    if (!resumeText.trim()) return null;
    return calculateATSScore(resumeText, jobDescription);
};
  

// --- Component ---
export default function ResumeAnalyzer({ userEmail, onDataChange }) {
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [analysis, setAnalysis] = useState(null); 
    const [selectedJobRole, setSelectedJobRole] = useState(Object.keys(JOB_ROLES)[1]); 
    const initialTemplateId = JOB_ROLE_TEMPLATE_MAP[Object.keys(JOB_ROLES)[1]];
    const [selectedTemplate, setSelectedTemplate] = useState(initialTemplateId);
    const [fileError, setFileError] = useState(null); 
    const [isProcessing, setIsProcessing] = useState(false);
    const previewRef = useRef(null);
    const fileInputRef = useRef(null);
        useEffect(() => {
        if (!userEmail) return; 
        const storedData = getResumeData(userEmail);
        if (storedData) {
            setResumeText(storedData.resume);
            setJobDescription(storedData.jd);
            const newAnalysis = analyzeData(storedData.resume, storedData.jd);
            setAnalysis(newAnalysis);
            onDataChange({ 
                resumeText: storedData.resume, 
                analysisSummary: `ATS Score: ${newAnalysis.atsScore}%. Missing Sections: ${newAnalysis.missing.join(', ')}. Weak Words: ${newAnalysis.weakWordCount}.`,
                userEmail, 
            });
        } else {
            setResumeText("");
            setJobDescription("");
            setAnalysis(null);
            onDataChange({ resumeText: "", analysisSummary: null, userEmail });
        }
    }, [userEmail, onDataChange]); 
    
    // Manual Analysis Handler
    const handleAnalyzeClick = () => {
        if (!resumeText.trim()) {
            setFileError("Please paste or upload your resume content before analyzing.");
            setAnalysis(null);
            return;
        }
        setFileError(null); 
        const newAnalysis = analyzeData(resumeText, jobDescription);
        setAnalysis(newAnalysis); 
        storeResumeData(userEmail, resumeText, jobDescription);
        onDataChange({
            resumeText: resumeText, 
            analysisSummary: `ATS Score: ${newAnalysis.atsScore}%. Missing Sections: ${newAnalysis.missing.join(', ')}. Weak Words: ${newAnalysis.weakWordCount}.`,
            userEmail,
        });
        setTimeout(() => {
            document.querySelector('.ats-analysis-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };
    
    const handleFile = useCallback(async (file) => {
        setFileError(null); 
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            setFileError("File too large (Max 2MB).");
            setResumeText("");
            return;
        }
        
        if (file.type !== "text/plain" && file.type !== "application/pdf") {
            setFileError("Upload a .txt or .pdf file only. TXT recommended.");
            setResumeText("");
            return;
        }

        if (file.type === "application/pdf") {
            setFileError("⚠️ PDF selected. Use .txt for accurate parsing. Dummy content loaded for demonstration.");
            setResumeText("John Smith\n(555) 123-4567 | john.smith@email.com | LinkedIn/johnsmith\n\nSummary\nHighly motivated developer with experience in full-stack web technologies.\n\nExperience\n- Spearheaded the development of a customer-facing portal using React and Tailwind CSS.\n- Drove the migration of legacy systems to a new Firestore database, improving performance by 30%.\n- Led Agile sprint planning and deployment cycles.\n\nSkills\nReact, JavaScript, Tailwind CSS, Firebase, Firestore, Agile Methodology, SQL, Deployment.\n\nEducation\nB.S. Computer Science, University of Technology");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            setResumeText(String(e.target.result || ""));
            // Clear analysis and error on successful file load, allowing manual analysis next
            setAnalysis(null); 
            setFileError(null);
        };
        reader.readAsText(file);
    }, []); 
    
    // Memoized function to generate clean, actionable feedback HTML
    const feedback = useMemo(() => {
        if (!analysis) return [];
        const list = [];
        const { missing, uniqueJD, matched, weakWordCount, missingKeys, usedStrongVerbs } = analysis; 

        // 1. Structure Feedback
        const structureSubScore = Math.round( (CORE_SECTIONS_LENGTH - missing.length) / CORE_SECTIONS_LENGTH * WEIGHT_STRUCTURE);

        if (missing.length > 0) {
            list.push(`
                <span class="feedback-icon bad">✖</span> 
                <strong>Structure Deficiency &Completeness:</strong> Missing core sections: 
                <strong>${missing.map(s => s.toUpperCase()).join(", ")}</strong>. 
                <div class="advice">
                    <strong>Advice:</strong> Add these sections explicitly to ensure ATS coverage. 
                    <span class="sub-score">(${structureSubScore}/${WEIGHT_STRUCTURE})</span>
                </div>
            `);
        } else {
            list.push(`
                <span class="feedback-icon ok">✓</span> 
                <strong>Structure:</strong> All standard core sections found. 
                <span class="sub-score">(${structureSubScore}/${WEIGHT_STRUCTURE})</span>
            `);
        }

        // 2. Keyword Feedback
        const matchPct = uniqueJD ? Math.round((matched.length / uniqueJD) * 100) : 0;
        const keywordSubScore = Math.round(matchPct / 100 * WEIGHT_KEYWORDS); 
        const adviceKeyword = `<span class="sub-score">(${keywordSubScore}/${WEIGHT_KEYWORDS})</span>`;

        if (uniqueJD === 0) {
            list.push(`
                <span class="feedback-icon info">i</span> 
                <strong>Keyword Match:</strong> Paste a Job Description to calculate alignment (0%).
            `);
        } else if (matchPct < 40) {
            const criticalMissing = missingKeys.slice(0, 15).join(', ');
            list.push(`
                <span class="feedback-icon bad">#</span> 
                <strong>Low Keyword Match (${matchPct}%):</strong> Major tailoring needed. 
                <div class="advice">
                    Missing critical terms (first 15): <strong>${criticalMissing}${missingKeys.length > 15 ? '...' : ''}</strong>. 
                    <strong>Suggestion:</strong> Integrate these terms into your Summary, Skills, and Experience bullet points, showing *how* you used them. ${adviceKeyword}
                </div>
            `);
        } else if (matchPct < 70) {
            list.push(`
                <span class="feedback-icon warn">!</span> 
                <strong>Moderate Match (${matchPct}%):</strong> Good start, but competition is high. 
                <div class="advice">
                    <strong>Suggestion:</strong> Focus on adding the remaining ${missingKeys.length} terms to cross the 80% threshold. ${adviceKeyword}
                </div>
            `);
        } else {
            list.push(`
                <span class="feedback-icon ok">✓</span> 
                <strong>Strong Match (${matchPct}%):</strong> Excellent keyword alignment. ${adviceKeyword}
            `);
        }

        // 3. Formatting/Vocabulary Feedback
        const weakWordPenalty = Math.min(Math.floor(weakWordCount / WEAK_WORDS_PER_PENALTY) * (MAX_WEAK_WORD_PENALTY / (MAX_WEAK_WORD_PENALTY / WEAK_WORDS_PER_PENALTY)), MAX_WEAK_WORD_PENALTY);
        const formattingSubScore = Math.max(0, WEIGHT_FORMATTING - weakWordPenalty);
        const adviceFormatting = `<span class="sub-score">(${formattingSubScore}/${WEIGHT_FORMATTING})</span>`;

        if (weakWordCount > 0) {
            const suggestions = STRONG_ACTION_VERBS.slice(0, 3).join(', ');
            list.push(`
                <span class="feedback-icon warn">!</span> 
                <strong>Vocabulary:</strong> Used weak verbs <strong>${weakWordCount}</strong> times. 
                <div class="advice">
                    <strong>Improvement:</strong> Replace passive terms with stronger action verbs like: <strong>${suggestions}</strong>. ${adviceFormatting}
                </div>
            `);
        } else {
            const usedVerbsList = usedStrongVerbs.slice(0, 5).join(', ');
            list.push(`
                <span class="feedback-icon ok">✓</span> 
                <strong>Vocabulary:</strong> Strong action verbs detected: <strong>${usedVerbsList}${usedStrongVerbs.length > 5 ? '...' : ''}</strong>. ${adviceFormatting}
            `);
        }

        return list;
    }, [analysis]);
    
    const candidateName = useMemo(() => firstNonEmptyLine(resumeText), [resumeText]);
    const htmlBody = useMemo(() => plainToHTML(resumeText), [resumeText]);
    
    const currentTemplate = RESUME_TEMPLATES[selectedTemplate] || RESUME_TEMPLATES.modern;
    const rolePreferredTemplateId = JOB_ROLE_TEMPLATE_MAP[selectedJobRole];
    const rolePreferredTemplate = rolePreferredTemplateId ? RESUME_TEMPLATES[rolePreferredTemplateId] : RESUME_TEMPLATES.modern;
    
    const handleApplyRoleTemplate = () => {
        setSelectedTemplate(rolePreferredTemplate.id);
    };

    const loadLibraries = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (window.jspdf && window.html2canvas) return resolve();

            const jsPDFScript = document.createElement("script");
            jsPDFScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            jsPDFScript.onerror = () => reject(new Error("Failed to load jsPDF."));
            jsPDFScript.onload = () => {
                const html2canvasScript = document.createElement("script");
                html2canvasScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                html2canvasScript.onerror = () => reject(new Error("Failed to load html2canvas."));
                html2canvasScript.onload = resolve;
                document.body.appendChild(html2canvasScript);
            };
            document.body.appendChild(jsPDFScript);
        });
    }, []);

    const handleDownload = async () => {
        if (!previewRef.current) return;

        setIsProcessing(true);
        let originalClass = '';
        const node = previewRef.current;
        
        try {
            await loadLibraries();
            
            const { jsPDF } = window.jspdf || {}; 
            if (!jsPDF) throw new Error("jsPDF object not found after loading UMD bundle.");

            originalClass = node.className;
            node.className = `resume-sheet ${currentTemplate.className} export-ready`; 

            const canvas = await window.html2canvas(node, {
                scale: 3,
                backgroundColor: "#fff",
                useCORS: true,
                windowWidth: node.scrollWidth,
                windowHeight: node.scrollHeight
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.95);

            const pdf = new jsPDF("p", "pt", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;

            let y = 0, remainingHeight = imgHeight;
            while (remainingHeight > 0) {
                if (y > 0) pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, -y, pageWidth, imgHeight); 
                remainingHeight -= pageHeight;
                y += pageHeight;
            }

            const fileName = `${candidateName.replace(/\s/g, "_")}_${selectedTemplate}_Resume.pdf`;
            pdf.save(fileName);

        } catch (err) {
            setFileError(`PDF Generation failed. (Error: ${err.message})`);
        } finally {
            setIsProcessing(false);
            if (originalClass) node.className = originalClass;
        }
    };


    return (
        <React.Fragment>
            <section className="container">
                <div className="grid-2">
                    {/* Resume Input Card */}
                    <div className="card">
                        <h2 className="section-title">📄 Resume Content Input</h2>
                        
                        {/* Job Role Selection */}
                        <label htmlFor="job-role" className="label-style">Target Job Role:</label>
                        <select
                            id="job-role"
                            className="text-input mb-1" 
                            value={selectedJobRole}
                            onChange={e => setSelectedJobRole(e.target.value)}
                        >
                            {Object.entries(JOB_ROLES).map(([key, name]) => (
                                <option key={key} value={key}>{name}</option>
                            ))}
                        </select>
                        {/* File Dropzone/Selector */}
                        <div className="resume-dropzone"
                            onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            <p className="dropzone-text">Drag & Drop or Select a File (.txt, .pdf)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,application/pdf"
                                style={{ display: "none" }}
                                onChange={e => handleFile(e.target.files?.[0])}
                            />
                            <button type="button" className="btn select-file-btn" onClick={() => fileInputRef.current.click()}>Select File</button>
                            {fileError && <p className={`hint ${fileError.startsWith('⚠️') ? 'file-error' : 'file-success'}`}>{fileError}</p>}
                        </div>
                        {/* Resume Textarea */}
                        <textarea className="text-input jd-input mt-1"
                            placeholder="Paste your resume content here. (TXT is best for parsing accuracy)"
                            value={resumeText}
                            onChange={e => setResumeText(e.target.value)}
                        />
                    </div>

                    {/* Job Description Card */}
                    <div className="card">
                        <h2 className="section-title">📝 Job Description (For Keyword Scoring)</h2>
                        <textarea className="text-input jd-input" 
                            placeholder="Paste Job Description here..." 
                            value={jobDescription} 
                            onChange={e => setJobDescription(e.target.value)}
                        />
                        <p className="hint">Pasting the JD is crucial. The tool analyzes keywords against this text for 30% of your ATS score.</p>
                    </div>
                </div>
                
                {/* ANALYZE BUTTON */}
                <div className="center mt-1">
                    <button className="btn primary analyzer-btn" onClick={handleAnalyzeClick} disabled={!resumeText.trim()}>
                        ✨ ANALYZE RESUME & GENERATE SCORE
                    </button>
                </div>

                {analysis && (
                    <>
                        {/* ATS Analysis Card (Score + Feedback) */}
                        <div className="card ats-analysis-card">
                            <h2 className="section-title">📊 ATS Analysis (Score: {analysis.atsScore}%)</h2>
                            <div className="score-row">
                                {/* Dynamic Score Ring with color coding */}
                                <div className="score-ring" style={{ "--pct": `${analysis.atsScore}%`, "--ring-color": analysis.atsScore >= 70 ? 'var(--ok)' : analysis.atsScore >= 40 ? 'var(--warn)' : 'var(--bad)' }}>
                                    <div className="score-num">{analysis.atsScore}</div>
                                    <div className="score-label">Score</div>
                                </div>
                                <div className="analysis-points">
                                    <h3>Actionable Suggestions</h3>
                                    <ul className="feedback-list">
                                        {/* Render clean HTML feedback */}
                                        {feedback.map((f, i) => <li key={i} dangerouslySetInnerHTML={{ __html: f }} />)}
                                    </ul>
                                    {/* Template Recommendation */}
                                    <div className="template-recommendation-container">
                                        <p className="hint mt-05 template-recommendation" style={{marginBottom: '0.25rem'}}>
                                            Role Preference: The <strong>{JOB_ROLES[selectedJobRole]}</strong> role generally benefits from the <strong>{rolePreferredTemplate.name}</strong> style.
                                        </p>
                                        {selectedTemplate !== rolePreferredTemplate.id && (
                                            <button className="btn btn-apply-template" onClick={handleApplyRoleTemplate}>
                                                Apply "{rolePreferredTemplate.name}"
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="actions">
                                <button className="btn primary" onClick={handleDownload} disabled={isProcessing}>
                                    {isProcessing ? 'Processing PDF...' : `⬇️ Download '${currentTemplate.name}' as PDF`}
                                </button>
                                <p className="hint mt-05">Generates a high-quality A4 PDF of your formatted resume.</p>
                            </div>
                        </div>

                        {/* Template Selection Card */}
                        <div className="card mt-1">
                            <h2 className="section-title">🎨 Choose Template</h2>
                            <div className="template-grid">
                                {Object.values(RESUME_TEMPLATES).map((t) => (
                                    <button key={t.id} type="button" className={`template-card ${selectedTemplate === t.id ? "selected" : ""}`} onClick={() => setSelectedTemplate(t.id)} title={t.name}>
                                        <div className={`template-swatch ${t.className.replace('theme-', 'swatch-')}`}></div>
                                        <div className="template-name">{t.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resume Preview Sheet */}
                        <div ref={previewRef} className={`resume-sheet ${currentTemplate.className}`} style={{ fontFamily: currentTemplate.fontStack }}>
                            <div className="responsive-preview-label">Live Preview (A4 Aspect Ratio)</div> 
                            <div className="sheet-header">
                                <div className="avatar">{candidateName.slice(0, 1).toUpperCase()}</div>
                                <div className="headings">
                                    <h1 className="name">{candidateName}</h1>
                                    <div className="tagline">{currentTemplate.name} Template</div>
                                </div>
                            </div>
                            <div className="sheet-body" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                        </div>
                    </>
                )}
            </section>
        </React.Fragment>
    );
}
