import { ChatMessage, Difficulty, Persona, SessionEvaluation, ExperienceLevel, QuestionBankItem, PrepPlanDay } from './types';

// Helper to make fetch requests to Google Gemini API
async function callGeminiAPI(apiKey: string, prompt: string, model = 'gemini-1.5-flash', jsonMode = false): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };

  const body: {
    contents: Array<{ parts: Array<{ text: string }> }>;
    generationConfig?: { responseMimeType: string };
  } = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  if (jsonMode) {
    body.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('Invalid response layout returned from Gemini API');
  }

  // Clean up potential markdown formatting block wrappers returned inside raw JSON strings
  if (jsonMode) {
    textContent = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  }

  return textContent;
}

// Generate the next adaptive interview question
export async function generateNextQuestion(
  roleTitle: string,
  companyName: string,
  difficulty: Difficulty,
  experienceLevel: ExperienceLevel,
  persona: Persona,
  resumeText: string,
  chatHistory: ChatMessage[],
  apiKey: string
): Promise<string> {
  const historyText = chatHistory.map(msg => 
    `${msg.sender === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${msg.text}`
  ).join('\n');

  const systemInstructions = `
You are InterviewIQ — an expert executive interviewer conducting a live, adaptive mock interview. 
Your target role is: "${roleTitle}" (Seniority level: ${experienceLevel}, Core Difficulty: ${difficulty}).
The target company is: "${companyName || 'Standard Industry Company'}".
Your persona profile is: "${persona}". Act strictly according to this behavioral template:
- STANDARD: Professional, direct, fair, structured.
- FRIENDLY: Warm, empathetic, collaborative, drops minor clues if candidate hesitates.
- TECHNICAL: Highly detail-oriented, drills down into system edge-cases, algorithms, data structures, and database constraints.
- STRESSFUL: Demanding, questions answers critically, pushes boundaries, assesses performance under pressure.

Candidate's Background (Parsed Resume/Skills):
"${resumeText || 'No resume uploaded. Standard industry profile assumptions apply.'}"

Conversation History so far:
${historyText || 'No questions have been asked yet. Introduce yourself and ask the first professional question.'}

CRITICAL RULES FOR SOCRATIC HINTS:
If the candidate's last response is a direct request for a hint (e.g., they ask "can you give me a hint?", "I'm stuck", "how should I solve this?", "what do you think?"), or if they are clearly struggling and provide an extremely short or confused response, you MUST NOT break character. Give a Socratic nudge ("Think about what happens when the input is null...", "Consider the trade-off of a relational vs non-relational model in this scenario...", "What is the primary action in the STAR framework you would take next?") instead of answering for them. 

Your goal:
Based on the conversation history, analyze the candidate's last answer.
1. If this is the start, welcome the candidate in character, cite their target role/company, and ask your first professional warm-up question.
2. If the candidate answered a previous question, briefly react (matching your "${persona}" persona) and ask a deep, challenging follow-up or move to the next structural question.
3. Keep your response brief, clear, and conversational, since it will be read aloud by Text-to-Speech synthesis.
4. Return ONLY the raw interviewer text response. Do not add markdown headers, prompt indicators, prefixes, or tags.
`;

  return await callGeminiAPI(apiKey, systemInstructions, 'gemini-1.5-flash', false);
}

// Grade the completed interview session and compile the detailed scorecard
export async function evaluateSession(
  roleTitle: string,
  companyName: string,
  difficulty: Difficulty,
  experienceLevel: ExperienceLevel,
  persona: Persona,
  resumeText: string,
  chatHistory: ChatMessage[],
  apiKey: string
): Promise<Omit<SessionEvaluation, 'id' | 'completedAt' | 'durationMin' | 'fillerWordMetrics'>> {
  const historyText = chatHistory.map(msg => 
    `${msg.sender === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${msg.text}`
  ).join('\n');

  const gradingPrompt = `
You are a senior hiring committee director at InterviewIQ.
Analyze the following mock interview transcript and output a highly detailed, constructive evaluation report in JSON format.

Role: "${roleTitle}"
Target Company: "${companyName || 'Standard Industry'}"
Experience Level: "${experienceLevel}"
Difficulty: "${difficulty}"
Interviewer Persona: "${persona}"

Candidate Resume Profile:
"${resumeText || 'Standard profile setup.'}"

Interview Transcript:
${historyText}

Analyze the responses carefully:
- Check technical accuracy against standard industry benchmarks for "${roleTitle}" at a "${experienceLevel}" level.
- Assess communication style (clarity, structuring, conciseness, pacing).
- Review behavioral questions against the STAR structure (Situation, Task, Action, Result).
- Provide an improved version of their response at a senior professional level (using STAR, CAR, or SOAR format where appropriate).
- Check space/time complexity for coding responses if applicable.

You MUST respond strictly with a JSON object conforming to this TypeScript shape:
{
  "overallScore": number, // Overall composite score between 0 and 100
  "technicalScore": number, // Performance grade between 0.0 and 10.0
  "communicationScore": number, // Performance grade between 0.0 and 10.0
  "behavioralScore": number, // Performance grade between 0.0 and 10.0
  "summary": "string", // Detailed analytical paragraph outlining strengths and core growth points
  "actionableTips": ["string", "string", "string"], // Exactly 3-4 granular, practical tips to improve
  "responses": [ // Review each question-answer pair. Map 1-to-1 with questions asked.
    {
      "questionText": "string", // The question that was asked
      "answerText": "string", // The candidate's response
      "score": number, // Score between 0.0 and 10.0
      "critique": "string", // Professional analysis of their answer
      "strengths": ["string", "string"], // Highlight 2 strengths in their response
      "improvements": ["string", "string"], // Highlight 2 actionable areas of improvement
      "improvedAnswer": "string", // A rewritten version of their answer at a senior level (STAR/CAR/SOAR structured)
      "starCheck": { // Optional: Populate ONLY if the question is behavioral
        "situation": boolean,
        "task": boolean,
        "action": boolean,
        "result": boolean
      },
      "complexity": { // Optional: Populate ONLY if the question is coding/algorithm-based
        "time": "string", // e.g. "O(N log N)"
        "space": "string" // e.g. "O(N)"
      }
    }
  ]
}

Double-check:
1. Return ONLY the strict JSON object. No markdown code blocks, wrap text, or prefixes.
2. The responses array must contain evaluations for each specific response.
3. Keep the feedback sharp, professional, realistic, and constructive.
`;

  const jsonResponse = await callGeminiAPI(apiKey, gradingPrompt, 'gemini-1.5-pro', true);
  
  try {
    return JSON.parse(jsonResponse);
  } catch (err) {
    console.error("JSON parsing error on Gemini response, fallback manual clean:", err);
    const cleaned = jsonResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// Mode D: Evaluate a single answer paste and return coaching rewrites
export async function evaluateSingleAnswer(
  roleTitle: string,
  experienceLevel: string,
  question: string,
  answer: string,
  apiKey: string
): Promise<{
  score: number;
  strengths: string[];
  gaps: string[];
  improvedAnswer: string;
  proTip: string;
  starCheck?: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  complexity?: {
    time: string;
    space: string;
  };
}> {
  const prompt = `
You are InterviewIQ's ultimate Answer Coach. 
Analyze this single Q&A pair for a candidate preparing for the "${roleTitle}" role (experience level: "${experienceLevel}").

Question: "${question}"
Candidate's Answer: "${answer}"

Your job:
1. Rate the answer on a scale from 1 to 10.
2. Identify specific strengths and critical gaps (e.g. missing quantitative impacts, structural clarity, code optimizations).
3. Rewrite the answer to be a model response at a senior/lead level. Integrate STAR (Situation, Task, Action, Result), CAR (Challenge, Action, Result), or SOAR (Situation, Obstacle, Action, Result) frameworks where applicable. 
4. Check if they hit the STAR elements if it's behavioral. Check Big-O space/time complexity if it's technical.
5. Provide a single game-changing "Pro Tip" for delivering this answer verbally.

You MUST respond strictly with a JSON object conforming to this TypeScript shape:
{
  "score": number, // Score between 1.0 and 10.0
  "strengths": ["string", "string"], // 2 key strengths
  "gaps": ["string", "string"], // 2 key gaps
  "improvedAnswer": "string", // Rewritten model answer using STAR/CAR/SOAR framework
  "proTip": "string", // One tactical tip
  "starCheck": { // Optional: Populate ONLY if the question is behavioral
    "situation": boolean,
    "task": boolean,
    "action": boolean,
    "result": boolean
  },
  "complexity": { // Optional: Populate ONLY if the question is technical/algorithmic
    "time": "string",
    "space": "string"
  }
}

Return ONLY strict raw JSON. No wrappers or markdown formatting.
`;

  const jsonResponse = await callGeminiAPI(apiKey, prompt, 'gemini-1.5-flash', true);
  try {
    return JSON.parse(jsonResponse);
  } catch (err) {
    const cleaned = jsonResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// Mode E: Generate a personalized day-by-day preparation planner
export async function generatePrepPlan(
  roleTitle: string,
  companyName: string,
  jobDescription: string,
  interviewDateString: string,
  apiKey: string
): Promise<PrepPlanDay[]> {
  const prompt = `
You are InterviewIQ's expert Head Planner.
Generate a structured, day-by-day preparation schedule leading up to an interview.

Target Role: "${roleTitle}"
Target Company: "${companyName || 'Standard Industry'}"
Interview Date: "${interviewDateString}"
Job Description / Key Details:
"${jobDescription || 'Standard requirements for the role apply.'}"

We need a detailed schedule. Calculate a suitable prep time (typically 5 to 7 days leading up to the interview, or a condensed 5-day cycle if the date is immediate). 
For each day, specify:
1. Focus area (e.g. "System Architecture Deep-Dive", "Behavioral Leadership Stories")
2. Key topics to cover
3. Actionable preparation tasks (e.g. "Write down three STAR stories about team conflict", "Solve two medium tree problems on Leetcode")

You MUST respond strictly with a JSON array conforming to this TypeScript shape:
[
  {
    "day": number, // Day index (e.g. 1, 2, 3...)
    "focus": "string", // Daily objective focus
    "topics": ["string", "string"], // Core study topics
    "tasks": ["string", "string", "string"] // Precise TODO tasks
  }
]

Return ONLY strict raw JSON. No wrappers or markdown formatting.
`;

  const jsonResponse = await callGeminiAPI(apiKey, prompt, 'gemini-1.5-flash', true);
  try {
    return JSON.parse(jsonResponse);
  } catch (err) {
    const cleaned = jsonResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// Capabilities: Generate a dynamic question bank based on target parameters
export async function generateQuestionBank(
  roleTitle: string,
  difficulty: Difficulty,
  apiKey: string
): Promise<QuestionBankItem[]> {
  const prompt = `
You are InterviewIQ's ultimate Question Vault Compiler.
Generate a diverse set of 8 realistic, top-tier interview questions for a "${roleTitle}" (difficulty level: "${difficulty}").

Include a mix of:
- Technical (system design, coding, theory)
- Behavioral (leadership, conflict, failure)
- Domain-Specific (product, data, sales, engineering)
- HR / Screening (motivation, compensation, fit)
- Case Study (market sizing, optimization)

Rank each question by category, difficulty (Easy, Medium, Hard), and typical ask frequency (High, Medium, Low).

You MUST respond strictly with a JSON array conforming to this TypeScript shape:
[
  {
    "id": "string", // e.g. "q-1", "q-2"
    "questionText": "string", // The actual interview question
    "category": "Technical" | "Behavioral" | "Domain-Specific" | "HR / Screening" | "Case Study",
    "difficulty": "Easy" | "Medium" | "Hard",
    "frequency": "High" | "Medium" | "Low"
  }
]

Return ONLY strict raw JSON. No wrappers or markdown formatting.
`;

  const jsonResponse = await callGeminiAPI(apiKey, prompt, 'gemini-1.5-flash', true);
  try {
    return JSON.parse(jsonResponse);
  } catch (err) {
    const cleaned = jsonResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// Capabilities: Generate company-specific style guide, culture values, and common questions
export async function fetchCompanyIntelligence(
  companyName: string,
  roleTitle: string,
  apiKey: string
): Promise<{
  culture: string;
  interviewStyle: string;
  tips: string[];
  commonQuestions: Array<{ questionText: string; type: string }>;
}> {
  const prompt = `
You are InterviewIQ's lead Corporate Intelligence agent.
Provide strategic interview insight for candidate targeting "${companyName}" for the "${roleTitle}" position.

Extract:
1. Culture values (what they look for in leadership, execution style, culture fit).
2. Interview structure & style (number of rounds, emphasis on coding, design, case structure, standard behavioral frameworks like STAR/LP).
3. 3-4 tactical, company-specific preparation tips.
4. 4 of the most frequently asked questions at this company for this role.

You MUST respond strictly with a JSON object conforming to this TypeScript shape:
{
  "culture": "string", // Focus values, principles (e.g. Amazon LPs, Google's Googleyness)
  "interviewStyle": "string", // Format details
  "tips": ["string", "string", "string"], // 3-4 tips
  "commonQuestions": [
    {
      "questionText": "string",
      "type": "Behavioral" | "Technical" | "Case" | "System Design"
    }
  ]
}

Return ONLY strict raw JSON. No wrappers or markdown formatting.
`;

  const jsonResponse = await callGeminiAPI(apiKey, prompt, 'gemini-1.5-flash', true);
  try {
    return JSON.parse(jsonResponse);
  } catch (err) {
    const cleaned = jsonResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}
