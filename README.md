Dynamic Resume Analyzer
A service that parses uploaded resumes (text), identifies sections (e.g., skills, education), and flags missing common elements. 
The project uses regex-based parsing, section-mapping logic, and feedback generation.
As a frontend engineer, i design and architected the front page features like static chatbot, resume drag and drop, resume.txt into
resume.pdf in selected resume,etc
Dynamic Resume Analyzer

(Frontend React, create a login/register page(dummy))

Webpage: Header and footer section in the website (header title of project with logout button 

and footer about developers). 

Features mapped to SRS requirement IDs:

DRA-F-001: Accept .txt or pdf resume files up to 2MB via drag-and-drop or file selection. 

DRA-F-002: Use regex patterns (keyword matching) to identify common resume sections (e.g., skills, education, experience, contact etc)

DRA-F-003: Extract and categorize content within identified sections

DRA-F-010: Identify and flag missing standard resume sections based on job role.

DRA-F-011: Generate an ATS compatibility score (0-100) based on content completeness, keyword presence, and formatting – Formula specific

DRA-F-013: Provide specific content improvement suggestions for each identified deficiency

DRA-F-020: Provide at least two or three template categories (standard and specific) with multiple visual themes

DRA-F-021: Apply parsed resume content to the selected template, preserving section structure

DRA-F-022: Recommend templates based on the user's intended purpose (job application)

DRA-F-030: Integrate an AI chatbot capable of answering resume-related queries and offering improvement suggestions (static and some random chat pretexted)

DRA-F-031: Allow users to ask specific questions about their resume feedback and receive detailed explanations

DRA-F-032: Enable chatbot to suggest powerful alternatives to repetitive words identified in the resume(static)

DRA-F-040: Generate a downloadable PDF of the resume with the applied template

DRA-F-041: Preserve formatting and layout integrity in exported PDF documents

DRA-NF-001: Resume parsing and analysis shall complete within 15(subject to change) seconds for 90% of uploads under normal load

DRA-NF-002: System shall provide 90.5% availability monthly; scheduled maintenance windows excluded

DRA-NF-003: All resume data shall be properly secured

DRA-NF-004: The system shall provide logs which can be used for later auditing

DRA-NF-005: The system shall support accessibility features

DRA-SR-001: User resumes shall be encrypted at rest using industry-standard encryption

DRA-SR-002: Resume data shall be automatically deleted after 5 days of inactivity

DRA-SR-003: Access to resume data shall require user authentication with strong password requirements

DRA-SR-004: All security events shall be logged with user ID, timestamp, and action details

TO RUN AND EXECUTE: NPM START
