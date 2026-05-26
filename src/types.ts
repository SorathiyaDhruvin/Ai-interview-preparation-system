export type Difficulty = 'ENTRY' | 'INTERMEDIATE' | 'SENIOR';
export type Persona = 'STANDARD' | 'FRIENDLY' | 'TECHNICAL' | 'STRESSFUL';
export type SessionMode = 'QUICK_PRACTICE' | 'FULL_MOCK' | 'DEEP_DIVE' | 'ANSWER_REVIEW' | 'PREP_PLANNER';
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD';

export interface ChatMessage {
  id: string;
  sender: 'interviewer' | 'candidate';
  text: string;
  timestamp: Date;
  audioUrl?: string;
  durationSec?: number;
}

export interface CandidateResponse {
  id: string;
  questionText: string;
  answerText: string;
  durationSec: number;
  fillerCount: number;
  score: number; // 0-10
  critique: string;
  strengths: string[];
  improvements: string[];
  improvedAnswer?: string; // STAR/CAR/SOAR-based rewritten answer
  starCheck?: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  complexity?: {
    time?: string;
    space?: string;
  };
}

export interface SessionEvaluation {
  id: string;
  roleTitle: string;
  difficulty: Difficulty;
  persona: Persona;
  overallScore: number; // 0-100
  technicalScore: number; // 0-10
  communicationScore: number; // 0-10
  behavioralScore: number; // 0-10
  summary: string;
  actionableTips: string[];
  responses: CandidateResponse[];
  fillerWordMetrics: {
    totalFillerWords: number;
    likeCount: number;
    umCount: number;
    uhCount: number;
    soCount: number;
    otherCount: number;
  };
  durationMin: number;
  completedAt: Date;
}

export interface InterviewSession {
  id: string;
  roleTitle: string;
  companyName: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceLevel;
  persona: Persona;
  mode: SessionMode;
  status: 'SETUP' | 'ONGOING' | 'EVALUATING' | 'COMPLETED';
  currentQuestionIndex: number;
  questionsList: string[];
  messages: ChatMessage[];
  responses: Array<{
    questionText: string;
    answerText: string;
    durationSec: number;
    fillerCount: number;
  }>;
  evaluation?: SessionEvaluation;
  createdAt: Date;
}

export interface AppSettings {
  geminiApiKey: string;
  voiceVolume: number;
  selectedVoiceName: string;
  enableFillerDetection: boolean;
  enableVocalFeedback: boolean;
}

export interface ResumeProfile {
  name: string;
  email: string;
  skills: string[];
  experienceSummary: string;
  parsedText: string;
}

export interface QuestionBankItem {
  id: string;
  questionText: string;
  category: 'Technical' | 'Behavioral' | 'Domain-Specific' | 'HR / Screening' | 'Case Study';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frequency: 'High' | 'Medium' | 'Low';
}

export interface PrepPlanDay {
  day: number;
  focus: string;
  topics: string[];
  tasks: string[];
}

