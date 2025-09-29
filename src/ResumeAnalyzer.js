import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// DRA-F-002: Regex patterns for common sections
const SECTIONS = {
  contact: /\b(contact|email|phone|linkedin|github|address)\b/i,
  summary: /\b(summary|objective|profile)\b/i,
  experience: /\b(experience|work experience|employment|career)\b/i,
  skills: /\b(skills|technical skills|competencies|technologies)\b/i,
  education: /\b(education|degree|university|college)\b/i,
  projects: /\b(projects?|portfolio)\b/i,
  certifications: /\b(certifications?|certificates?|license|licensed?)\b/i,
};

const TEMPLATES = {
  modern: { name: "Modern Professional", className: "theme-modern", fontStack: "ui-sans-serif, system-ui, Segoe UI, Arial" },
  minimal: { name: "Minimal Clean", className: "theme-minimal", fontStack: "Arial, Helvetica, sans-serif" },
  creative: { name: "Creative Bold", className: "theme-creative", fontStack: "Helvetica, Arial, sans-serif" },
};

const STOPWORDS = new Set(["and","the","with","from","that","this","your","their","our","for","into","able","will","shall","must","have","has","had","are","was","were","you","they","them","over","under","about","above","below","not","only","but","also","more","than","such","etc","using","use","used","strong","good","great","work","role","team","skills","requirements","responsibilities","job","description","looking","plus","preferred","required","experience","years","year","developer","engineer","data"]);

function extractKeywords(text) { return [...new Set(text.toLowerCase().split(/[^a-z0-9+#.]/i).map(w=>w.trim()).filter(w=>w.length>2 && !STOPWORDS.has(w)))]; }
function firstNonEmptyLine(s) { return (s||"").split(/\r?\n/).map(x=>x.trim()).find(x=>x.length>0)||"Candidate Name"; }

// FIX: Removed unnecessary escapes in the regex pattern for bullet points
function plainToHTML(resumeText) { 
  const lines = (resumeText||"").split(/\r?\n/);
  return lines.map(line=>{
    const trimmed=line.trim(); if(!trimmed) return "";
    const isHeading = Object.values(SECTIONS).some(r=>r.test(trimmed));
    // FIXED ESLint WARNING: Removed unnecessary backslashes (e.g., \-) since the dash doesn't need to be escaped inside character sets, and \• and \d\. don't need escaping outside a character set.
    // The pattern is now /^[\-\*\•\d\.]/, using a character set [-\*\•\d\.] to cover dashes, asterisks, bullets, and digits followed by a period (for numbered lists).
    const isBullet = trimmed.match(/^[-*\•\d.].*$/);
    
    if(isHeading) return `<h2>${escapeHTML(trimmed)}</h2>`;
    // If it looks like a bullet, wrap in <li> inside a dummy <ul> for structure visualization
    if(isBullet) return `<ul><li>${escapeHTML(trimmed.replace(/^[-*\•\d.]\s*/, ''))}</li></ul>`;
    
    return `<p>${escapeHTML(trimmed)}</p>`;
  }).join("\n");
}
function escapeHTML(s) { return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }


// DRA-F-011: ATS Scoring Logic
function calculateATSScore(resumeText, jobDescription) {
  const found = {};
  const missing = [];
  Object.entries(SECTIONS).forEach(([k, rgx]) => {
    if (rgx.test(resumeText)) found[k] = true;
    else missing.push(k);
  });

  const jdKeys = extractKeywords(jobDescription);
  const resumeLower = resumeText.toLowerCase();
  
  // Matched keywords are those from JD that appear in the resume
  const matched = jdKeys.filter(k => resumeLower.includes(k));
  
  // Keyword score: Max 40 points
  const keywordMatchRatio = jdKeys.length ? matched.length / jdKeys.length : 1;
  const keywordScore = Math.round(keywordMatchRatio * 40);

  // Structure/Completeness Score: Max 60 points. Deduct 12 points for each core missing section.
  const coreSections = ["contact", "summary", "experience", "skills", "education"];
  const coreMissingCount = coreSections.filter(k => missing.includes(k)).length;
  
  const structureScore = Math.max(0, 60 - coreMissingCount * 12);

  // Final Score: clamp between 0 and 100
  const atsScore = Math.max(0, Math.min(100, structureScore + keywordScore));

  const missingKeys = jdKeys.filter(k => !resumeLower.includes(k));

  return { found, missing, matched, missingKeys, atsScore, uniqueJD: jdKeys.length };
}


export default function ResumeAnalyzer() {
  const [resumeText,setResumeText] = useState("");
  const [jobDescription,setJobDescription] = useState("");
  const [selectedTemplate,setSelectedTemplate] = useState("modern");
  const [analysis,setAnalysis] = useState(null);
  const [fileError, setFileError] = useState(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  // DRA-F-001: Handle file upload (TXT and simulated PDF)
  const handleFile = (file)=>{
    setFileError(null);
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) { // 2MB limit
      setFileError("File too large (Max 2MB).");
      setResumeText("");
      return;
    }

    if(file.type === "application/pdf") {
      // DRA-F-001: PDF handling simulation
      setFileError("⚠️ PDF selected. For accurate analysis, use a plain text (.txt) version. Using dummy content for visualization.");
      setResumeText("Candidate Name\n\nContact Information\n\nSummary\n\nExperience\n\nSkills: React, JavaScript, Python\n\nEducation"); // Dummy content for PDF
      return;
    }
    
    if(file.type!=="text/plain"){ 
      setFileError("Upload a .txt or .pdf file only. TXT is recommended for accurate parsing.");
      setResumeText("");
      return; 
    }
    
    const reader = new FileReader();
    reader.onload = e=>setResumeText(String(e.target.result||""));
    reader.readAsText(file);
  }

  // Effect to recalculate ATS score and analysis when inputs change
  useEffect(() => {
    if (!resumeText) { setAnalysis(null); return; }
    setAnalysis(calculateATSScore(resumeText, jobDescription));
  }, [resumeText, jobDescription]);


  // DRA-F-013: Generate feedback based on analysis (Improved Feedback)
  const feedback = useMemo(()=>{
    if(!analysis) return [];
    const list=[];
    
    // Structure feedback
    if(analysis.missing.length > 0) {
      list.push(`❌ Structure Deficiency: Missing core sections: ${analysis.missing.join(", ")}.`);
    } else {
      list.push(`✅ Structure Complete: All standard sections found.`);
    }
    
    // Keyword feedback
    const matchPct = analysis.uniqueJD ? Math.round((analysis.matched.length / analysis.uniqueJD) * 100) : 100;
    
    if(analysis.uniqueJD === 0) {
      list.push(`🔎 No JD provided. Cannot calculate keyword alignment.`);
    } else if(matchPct < 40) {
      list.push(`🔴 Low Keyword Match (${matchPct}%): Major tailoring needed. Review JD terms.`);
    } else if (matchPct < 70) {
      list.push(`🟡 Moderate Match (${matchPct}%): Integrate missing terms for better ATS scoring.`);
    } else {
      list.push(`🟢 Strong Match (${matchPct}%): Excellent keyword alignment. Low risk of rejection.`);
    }

    // Final score summary
    list.push(`📊 Final ATS Score: ${analysis.atsScore}%. Target 80%+ for top performance.`);
    
    return list;
  },[analysis]);

  const candidateName=useMemo(()=>firstNonEmptyLine(resumeText),[resumeText]);
  const htmlBody=useMemo(()=>plainToHTML(resumeText),[resumeText]);

  // DRA-F-040, DRA-F-041: Download PDF (Template Logic Verified)
  const downloadPDF = async () => {
    if (!previewRef.current) return;
    const node = previewRef.current;
    
    // Apply temporary styles for capture (Ensures correct template download)
    const originalClass = node.className;
    node.className = `resume-sheet ${TEMPLATES[selectedTemplate].className}`;
    node.style.fontFamily = TEMPLATES[selectedTemplate].fontStack;

    // Use a higher scale for a crisper PDF output
    const canvas = await html2canvas(node, { scale: 3, backgroundColor: "#fff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    
    // Calculate page dimensions for multi-page handling
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    let y = 0;
    let remaining = imgH;

    while (remaining > 0) {
      // Add the image, slicing it based on the remaining height
      pdf.addImage(img, "PNG", 0, -y, pageW, imgH);
      remaining -= pageH;
      y += pageH;
      if (remaining > 0) pdf.addPage();
    }

    pdf.save(`${candidateName.replace(/\s/g, '_')}_Resume_ATS_Template.pdf`);

    // Restore original class/style
    node.className = originalClass;
    node.style.fontFamily = '';
  };


  return (
    <section>
      <div className="grid-2">
        <div className="card">
          <h2 className="section-title">📄 Resume Upload (DRA-F-001)</h2>
          <div className="resume-dropzone"
            onDrop={e=>{e.preventDefault(); e.stopPropagation(); if(e.dataTransfer.files.length>0) handleFile(e.dataTransfer.files[0]);}}
            onDragOver={e=>{e.preventDefault(); e.stopPropagation();}}
          >
            <p className="dropzone-text">Drag & Drop or Select a File (.txt, .pdf)</p>
            <input 
              ref={fileInputRef}
              id="resume-file-input" 
              type="file" 
              accept=".txt,application/pdf" 
              style={{display:"none"}} 
              onChange={e=>handleFile(e.target.files?.[0])}
            />
            {/* Added Select File Button */}
            <button className="btn select-file-btn" onClick={()=>fileInputRef.current.click()}>
                Select File
            </button>
            {fileError && <p className="hint file-error">{fileError}</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">📝 Job Description</h2>
          <textarea className="text-input jd-input" placeholder="Paste JD here to analyze keyword match..." value={jobDescription} onChange={e=>setJobDescription(e.target.value)} />
        </div>
      </div>

      {resumeText && (
        <div className="card">
          <h2 className="section-title">🎨 Choose Template (DRA-F-020)</h2>
          <div className="template-grid">
            {Object.entries(TEMPLATES).map(([key,t])=>(
              <button key={key} type="button" className={`template-card ${selectedTemplate===key?"selected":""}`} onClick={()=>setSelectedTemplate(key)} title={t.name}>
                <div className={`template-swatch ${t.className}`}></div>
                <div className="template-name">{t.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="card">
          <h2 className="section-title">📊 ATS Analysis (Score: {analysis.atsScore}%)</h2>
          <div className="score-row">
            {/* Fixed Score Ring CSS using the --pct variable */}
            <div className="score-ring" style={{ "--pct": `${analysis.atsScore}%`, "--ring-color": analysis.atsScore >= 70 ? 'var(--ok)' : analysis.atsScore >= 40 ? 'var(--warn)' : 'var(--bad)' }}>
              <div className="score-num">{analysis.atsScore}</div>
              <div className="score-label">Score</div>
            </div>

            <div className="analysis-points">
              <h3>Improvement Suggestions (DRA-F-013)</h3>
              <ul className="feedback-list">{feedback.map((f,i)=><li key={i}>{f}</li>)}</ul>
              
              <div className="chips-container">
                <p className="chips-title">Keywords ({analysis.matched?.length}/{analysis.uniqueJD} found)</p>
                <div className="chips">
                  {analysis.matched?.slice(0,10).map(k=><span key={k} className="chip ok">{k}</span>)}
                  {analysis.missingKeys?.slice(0,10).map(k=><span key={k} className="chip warn">{k}</span>)}
                </div>
                {analysis.missingKeys?.length > 10 && <p className="hint">...{analysis.missingKeys.length - 10} more missing keywords.</p>}
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={downloadPDF} title="Download Resume with Applied Template">📄 Download PDF (DRA-F-040)</button>
          </div>
        </div>
      )}

      {/* Resume Preview */}
      {resumeText && (
        <div ref={previewRef} className={`resume-sheet ${TEMPLATES[selectedTemplate].className}`} style={{ fontFamily:TEMPLATES[selectedTemplate].fontStack }}>
          <div className="sheet-header">
            <div className="avatar">{candidateName.slice(0,1).toUpperCase()}</div>
            <div className="headings">
              <h1 className="name">{candidateName}</h1>
              <div className="tagline">Professional Resume</div>
            </div>
          </div>
          <div className="sheet-body" dangerouslySetInnerHTML={{__html: htmlBody}} />
        </div>
      )}
    </section>
  );
}