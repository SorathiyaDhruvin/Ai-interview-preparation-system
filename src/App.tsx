import { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Layers, 
  User as UserIcon, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  FileText,
  MessageSquare,
  Compass,
  Brain,
  Calendar,
  Sparkles,
  Search,
  Building,
  Check,
  HelpCircle,
  FileQuestion
} from 'lucide-react';
import { 
  InterviewSession, 
  AppSettings, 
  SessionEvaluation, 
  Difficulty, 
  Persona, 
  ChatMessage,
  SessionMode,
  ExperienceLevel,
  QuestionBankItem,
  PrepPlanDay
} from './types';
import { MOCK_QUESTIONS, MOCK_EVALUATIONS } from './mockData';
import { 
  generateNextQuestion, 
  evaluateSession, 
  evaluateSingleAnswer, 
  generatePrepPlan, 
  generateQuestionBank, 
  fetchCompanyIntelligence 
} from './geminiService';

// Initialize native Speech Recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognitionInstance: any = null;
if (SpeechRecognition) {
  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = 'en-US';
}

export default function App() {
  // --- View States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chamber' | 'answer-coach' | 'planner' | 'intelligence' | 'questions-bank' | 'settings'>('dashboard');

  // --- App Settings State (Preloaded with user's provided Gemini key) ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('prepai_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.geminiApiKey) {
        parsed.geminiApiKey = 'AIzaSyD2KvZT4El22hoASuZCM-LL8-WU9fkDfCI';
        localStorage.setItem('prepai_settings', JSON.stringify(parsed));
      }
      return parsed;
    }
    const defaultSettings = {
      geminiApiKey: 'AIzaSyD2KvZT4El22hoASuZCM-LL8-WU9fkDfCI',
      voiceVolume: 0.8,
      selectedVoiceName: '',
      enableFillerDetection: true,
      enableVocalFeedback: true
    };
    localStorage.setItem('prepai_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  });

  // --- Resume Customizer Text ---
  const [resumeText, setResumeText] = useState(() => {
    return localStorage.getItem('prepai_cv_text') || '';
  });

  // --- Interview Session States ---
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [evaluationsList, setEvaluationsList] = useState<SessionEvaluation[]>(() => {
    const saved = localStorage.getItem('prepai_evals');
    return saved ? JSON.parse(saved) : MOCK_EVALUATIONS;
  });
  const [selectedEvaluation, setSelectedEvaluation] = useState<SessionEvaluation | null>(null);

  // --- Onboarding Config States ---
  const [configRole, setConfigRole] = useState('Frontend Engineer');
  const [configCompany, setConfigCompany] = useState('Google');
  const [configDifficulty, setConfigDifficulty] = useState<Difficulty>('INTERMEDIATE');
  const [configExperience, setConfigExperience] = useState<ExperienceLevel>('MID');
  const [configPersona, setConfigPersona] = useState<Persona>('STANDARD');
  const [configDate, setConfigDate] = useState('2026-06-02');
  const [configMode, setConfigMode] = useState<SessionMode>('QUICK_PRACTICE');
  const [configJobDescription, setConfigJobDescription] = useState('');

  // --- Mode C: Deep Dive Topics ---
  const [deepDiveTopic, setDeepDiveTopic] = useState<'System Design' | 'Behavioral Leadership' | 'SQL & Databases' | 'Algorithms' | 'HR & Screen'>('System Design');

  // --- Mode D: Single-Answer Coach Playground ---
  const [singleQuestionInput, setSingleQuestionInput] = useState('');
  const [singleAnswerInput, setSingleAnswerInput] = useState('');
  const [singleEvaluation, setSingleEvaluation] = useState<any>(null);
  const [isAnalyzingSingleAnswer, setIsAnalyzingSingleAnswer] = useState(false);

  // --- Mode E: Prep Planner States ---
  const [activePrepPlan, setActivePrepPlan] = useState<PrepPlanDay[]>(() => {
    const saved = localStorage.getItem('interviewiq_prep_plan');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [completedPlanTasks, setCompletedPlanTasks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('interviewiq_plan_tasks');
    return saved ? JSON.parse(saved) : {};
  });

  // --- Capabilities: Question Bank States ---
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>(() => {
    const saved = localStorage.getItem('interviewiq_qbank');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingQBank, setIsGeneratingQBank] = useState(false);
  const [qBankSearchQuery, setQBankSearchQuery] = useState('');
  const [qBankCategoryFilter, setQBankCategoryFilter] = useState<string>('All');

  // --- Capabilities: Company Intelligence States ---
  const [companyIntelName, setCompanyIntelName] = useState('Google');
  const [companyIntelligence, setCompanyIntelligence] = useState<any>(() => {
    const saved = localStorage.getItem('interviewiq_company_intel');
    return saved ? JSON.parse(saved) : null;
  });
  const [isFetchingIntel, setIsFetchingIntel] = useState(false);

  // --- Live Chamber States ---
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [fillerCounts, setFillerCounts] = useState({ total: 0, like: 0, um: 0, uh: 0, so: 0 });
  const [socraticHintText, setSocraticHintText] = useState('');
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);

  // --- UI Animation & Visualizer States ---
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // --- Refs ---
  const timerRef = useRef<any>(null);
  const questionTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const canvasAnimRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Load Speech Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Sync state with LocalStorage
  useEffect(() => {
    localStorage.setItem('prepai_evals', JSON.stringify(evaluationsList));
  }, [evaluationsList]);

  useEffect(() => {
    localStorage.setItem('prepai_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('prepai_cv_text', resumeText);
  }, [resumeText]);

  useEffect(() => {
    if (configExperience === 'ENTRY') setConfigDifficulty('ENTRY');
    else if (configExperience === 'MID') setConfigDifficulty('INTERMEDIATE');
    else setConfigDifficulty('SENIOR');
  }, [configExperience]);

  useEffect(() => {
    localStorage.setItem('interviewiq_prep_plan', JSON.stringify(activePrepPlan));
  }, [activePrepPlan]);

  useEffect(() => {
    localStorage.setItem('interviewiq_plan_tasks', JSON.stringify(completedPlanTasks));
  }, [completedPlanTasks]);

  useEffect(() => {
    localStorage.setItem('interviewiq_qbank', JSON.stringify(questionBank));
  }, [questionBank]);

  useEffect(() => {
    localStorage.setItem('interviewiq_company_intel', JSON.stringify(companyIntelligence));
  }, [companyIntelligence]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isGeneratingNext]);

  // Timer handlers
  useEffect(() => {
    if (session && session.status === 'ONGOING') {
      timerRef.current = setInterval(() => {
        setSessionTimer(t => t + 1);
      }, 1000);

      questionTimerRef.current = setInterval(() => {
        setQuestionTimer(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [session?.status]);

  // Pseudorandom voice visualizer waves
  useEffect(() => {
    let t: any;
    if (isInterviewerSpeaking) {
      t = setInterval(() => {
        setWaveAmplitudes(Array.from({ length: 10 }, () => Math.floor(Math.random() * 32) + 8));
      }, 100);
    } else {
      setWaveAmplitudes([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    }
    return () => clearInterval(t);
  }, [isInterviewerSpeaking]);

  // Speech TTS reading
  const speakQuestionText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (!settings.enableVocalFeedback) {
      setIsInterviewerSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = settings.voiceVolume;

    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.name === settings.selectedVoiceName);
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira'))) || voices[0];
    }
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsInterviewerSpeaking(true);
    utterance.onend = () => setIsInterviewerSpeaking(false);
    utterance.onerror = () => setIsInterviewerSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Web Audio microphone triggers
  const initMicrophoneAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 64;
      audioCtxRef.current = audioCtx;
      audioAnalyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        if (analyser && isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const waves = Array.from(dataArray).slice(0, 10).map(val => Math.max(8, Math.floor(val / 6)));
          setWaveAmplitudes(waves);
          canvasAnimRef.current = requestAnimationFrame(renderFrame);
        }
      };

      canvasAnimRef.current = requestAnimationFrame(renderFrame);
    } catch (e) {
      console.warn("Microphone access blocked or restricted:", e);
    }
  };

  const stopMicrophoneAudio = () => {
    if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    setIsRecording(false);
    setWaveAmplitudes([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  };

  // Native Speech-to-Text Speech Recognition toggles
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      stopMicrophoneAudio();

      if (speechTranscript.trim()) {
        setTextAnswer(prev => prev ? prev + ' ' + speechTranscript.trim() : speechTranscript.trim());
        setSpeechTranscript('');
      }
    } else {
      if (!SpeechRecognition) {
        alert("Native Speech Recognition is not supported by your current browser. Please use Chrome/Edge for voice coaching, or type manually.");
        return;
      }

      setIsRecording(true);
      setSpeechTranscript('');
      initMicrophoneAudio();

      recognitionInstance.onstart = () => {};
      recognitionInstance.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const activeTranscript = final || interim;
        setSpeechTranscript(activeTranscript);

        if (settings.enableFillerDetection) {
          const lower = activeTranscript.toLowerCase();
          const likes = (lower.match(/\blike\b/g) || []).length;
          const ums = (lower.match(/\bum\b/g) || []).length;
          const uhs = (lower.match(/\buh\b/g) || []).length;
          const sos = (lower.match(/\bso\b/g) || []).length;
          setFillerCounts({
            total: likes + ums + uhs + sos,
            like: likes,
            um: ums,
            uh: uhs,
            so: sos
          });
        }
      };

      recognitionInstance.onerror = (e: any) => {
        console.error("Speech Recognition error encountered:", e);
        stopRecordingOnFailure();
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      recognitionInstance.start();
    }
  };

  const stopRecordingOnFailure = () => {
    if (recognitionInstance) recognitionInstance.stop();
    stopMicrophoneAudio();
  };

  // --- Socratic Hint Generator in Character ---
  const requestSocraticHint = async () => {
    if (!session || !settings.geminiApiKey) return;
    setIsGeneratingHint(true);
    setSocraticHintText('');

    try {
      const chatHistoryWithHintRequest = [
        ...session.messages,
        {
          id: `hint-req-${Date.now()}`,
          sender: 'candidate' as const,
          text: "[SYSTEM: Candidate requested a Socratic Hint. Guide them with a subtle, Socratic nudge related to the current question without giving away the direct answer.]",
          timestamp: new Date()
        }
      ];

      const hintText = await generateNextQuestion(
        session.roleTitle,
        session.companyName,
        session.difficulty,
        session.experienceLevel,
        session.persona,
        resumeText,
        chatHistoryWithHintRequest,
        settings.geminiApiKey
      );

      setSocraticHintText(hintText);
      speakQuestionText(hintText);
    } catch (err) {
      console.error("Failed to generate Socratic hint:", err);
      setSocraticHintText("Think about what inputs could be invalid, or how you might apply a divide-and-conquer approach here.");
    } finally {
      setIsGeneratingHint(false);
    }
  };

  // --- Launch Structured Interview IQ Mock Session ---
  const launchInterviewSession = async (customQText?: string) => {
    const newSession: InterviewSession = {
      id: `session-${Date.now()}`,
      roleTitle: configRole,
      companyName: configCompany,
      difficulty: configDifficulty,
      experienceLevel: configExperience,
      persona: configPersona,
      mode: configMode,
      status: 'ONGOING',
      currentQuestionIndex: 0,
      questionsList: customQText ? [customQText] : [],
      messages: [],
      responses: [],
      createdAt: new Date()
    };

    setSession(newSession);
    setSessionTimer(0);
    setQuestionTimer(0);
    setTextAnswer('');
    setSpeechTranscript('');
    setSocraticHintText('');
    setFillerCounts({ total: 0, like: 0, um: 0, uh: 0, so: 0 });
    setActiveTab('chamber');
    setIsGeneratingNext(true);

    let starterQuestion = `Welcome to InterviewIQ 👋 I am your dedicated ${configPersona.toLowerCase()} interview coach. I see you are practicing for the ${configRole} role at ${configCompany}. Let's begin. Can you introduce yourself and briefly walk me through your technical background?`;

    if (configMode === 'DEEP_DIVE') {
      starterQuestion = `Welcome to your deep-dive session focused on "${deepDiveTopic}" for the ${configRole} role. We will do 4 rounds with increasing difficulty. Let's start with Round 1: Can you describe your familiarity and standard architectural strategies regarding ${deepDiveTopic}?`;
    }

    if (customQText) {
      starterQuestion = customQText;
    }

    if (settings.geminiApiKey && !customQText) {
      try {
        const question = await generateNextQuestion(
          configRole,
          configCompany,
          configDifficulty,
          configExperience,
          configPersona,
          resumeText,
          [],
          settings.geminiApiKey
        );

        const welcomeMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'interviewer',
          text: question,
          timestamp: new Date()
        };

        setSession(prev => prev ? {
          ...prev,
          messages: [welcomeMessage],
          questionsList: [question]
        } : null);

        setIsGeneratingNext(false);
        speakQuestionText(question);
      } catch (err) {
        console.error("Gemini failed, fallback to local templates:", err);
        fallbackToLocalPresets(starterQuestion);
      }
    } else {
      fallbackToLocalPresets(starterQuestion);
    }
  };

  const fallbackToLocalPresets = (starterMsg: string) => {
    const presets = MOCK_QUESTIONS[configRole]?.[configDifficulty] || MOCK_QUESTIONS['Frontend Engineer']['INTERMEDIATE'];
    const activeFirstQ = starterMsg || presets[0];

    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'interviewer',
      text: activeFirstQ,
      timestamp: new Date()
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [welcomeMessage],
      questionsList: presets.length > 0 ? presets : [activeFirstQ]
    } : null);

    setIsGeneratingNext(false);
    speakQuestionText(activeFirstQ);
  };

  // --- Submit Dynamic Answer & Progress Conversational Cycle ---
  const handleAnswerSubmit = async () => {
    if (!session) return;

    if (isRecording) {
      toggleRecording();
    }

    const answer = textAnswer.trim() || speechTranscript.trim();
    if (!answer) {
      alert("Please enter or speak an answer before submitting!");
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'candidate',
      text: answer,
      timestamp: new Date()
    };

    const updatedMessages = [...session.messages, userMessage];
    const duration = questionTimer;
    const fillers = fillerCounts.total;

    const newResponse = {
      questionText: session.messages[session.messages.length - 1].text,
      answerText: answer,
      durationSec: duration,
      fillerCount: fillers
    };

    const nextIndex = session.currentQuestionIndex + 1;

    // Define length bounds for different modes
    let questionLimit = 4; // Mode A / C default limit
    if (session.mode === 'FULL_MOCK') {
      questionLimit = 6; // Mode B runs longer
    }

    const isFinished = settings.geminiApiKey 
      ? nextIndex >= questionLimit 
      : nextIndex >= session.questionsList.length;

    setSession(prev => prev ? {
      ...prev,
      messages: updatedMessages,
      currentQuestionIndex: nextIndex,
      responses: [...prev.responses, newResponse]
    } : null);

    setTextAnswer('');
    setSpeechTranscript('');
    setSocraticHintText('');
    setQuestionTimer(0);
    setFillerCounts({ total: 0, like: 0, um: 0, uh: 0, so: 0 });

    if (isFinished) {
      compileSessionEvaluation(updatedMessages, [...session.responses, newResponse]);
    } else {
      setIsGeneratingNext(true);

      if (settings.geminiApiKey) {
        try {
          const nextQuestion = await generateNextQuestion(
            session.roleTitle,
            session.companyName,
            session.difficulty,
            session.experienceLevel,
            session.persona,
            resumeText,
            updatedMessages,
            settings.geminiApiKey
          );

          const interviewerMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'interviewer',
            text: nextQuestion,
            timestamp: new Date()
          };

          setSession(prev => prev ? {
            ...prev,
            messages: [...updatedMessages, interviewerMessage],
            questionsList: [...prev.questionsList, nextQuestion]
          } : null);

          setIsGeneratingNext(false);
          speakQuestionText(nextQuestion);
        } catch (err) {
          console.error("Failed to load Gemini adaptive question:", err);
          fallbackNextLocalQuestion(updatedMessages, nextIndex);
        }
      } else {
        fallbackNextLocalQuestion(updatedMessages, nextIndex);
      }
    }
  };

  const fallbackNextLocalQuestion = (updatedMessages: ChatMessage[], nextIndex: number) => {
    if (!session) return;
    const nextQuestion = session.questionsList[nextIndex] || "Thank you. This concludes our mock session.";
    const interviewerMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'interviewer',
      text: nextQuestion,
      timestamp: new Date()
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [...updatedMessages, interviewerMessage]
    } : null);

    setIsGeneratingNext(false);
    speakQuestionText(nextQuestion);
  };

  // --- Grade and Compile Holistic Session Evaluation ---
  const compileSessionEvaluation = async (history: ChatMessage[], responses: any[]) => {
    if (!session) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSession(prev => prev ? { ...prev, status: 'EVALUATING' } : null);

    const totalLikes = responses.reduce((acc, r) => acc + (r.fillerCount > 0 ? Math.floor(r.fillerCount * 0.4) : 0), 0);
    const totalUms = responses.reduce((acc, r) => acc + (r.fillerCount > 0 ? Math.floor(r.fillerCount * 0.3) : 0), 0);
    const totalUhs = responses.reduce((acc, r) => acc + (r.fillerCount > 0 ? Math.floor(r.fillerCount * 0.2) : 0), 0);
    const totalSos = responses.reduce((acc, r) => acc + (r.fillerCount > 0 ? Math.floor(r.fillerCount * 0.1) : 0), 0);
    const totalFillers = responses.reduce((acc, r) => acc + r.fillerCount, 0);

    const calculatedFillers = {
      totalFillerWords: totalFillers,
      likeCount: totalLikes || Math.floor(totalFillers * 0.4),
      umCount: totalUms || Math.floor(totalFillers * 0.3),
      uhCount: totalUhs || Math.floor(totalFillers * 0.2),
      soCount: totalSos || Math.floor(totalFillers * 0.1),
      otherCount: 0
    };

    if (settings.geminiApiKey) {
      try {
        const result = await evaluateSession(
          session.roleTitle,
          session.companyName,
          session.difficulty,
          session.experienceLevel,
          session.persona,
          resumeText,
          history,
          settings.geminiApiKey
        );

        const fullEvaluation: SessionEvaluation = {
          ...result,
          id: `eval-${Date.now()}`,
          roleTitle: session.roleTitle,
          difficulty: session.difficulty,
          persona: session.persona,
          durationMin: Math.max(1, Math.round(sessionTimer / 60)),
          completedAt: new Date(),
          fillerWordMetrics: calculatedFillers,
          responses: result.responses.map((resp, i) => ({
            ...resp,
            id: `r-${Date.now()}-${i}`,
            durationSec: responses[i]?.durationSec || 60,
            fillerCount: responses[i]?.fillerCount || 0
          }))
        };

        setEvaluationsList(prev => [fullEvaluation, ...prev]);
        setSelectedEvaluation(fullEvaluation);
        setSession(null);
        setActiveTab('dashboard');
        // Smoothly jump down to scorecard panel
        setTimeout(() => {
          document.getElementById('evaluation-scorecard-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } catch (err) {
        console.error("Gemini scorecard evaluation failed, using fallback:", err);
        fallbackLocalEvaluation(calculatedFillers, responses);
      }
    } else {
      fallbackLocalEvaluation(calculatedFillers, responses);
    }
  };

  const fallbackLocalEvaluation = (fillers: any, responses: any[]) => {
    if (!session) return;
    const overallScore = Math.floor(Math.random() * 15) + 75;
    const communicationDeduction = Math.min(3, fillers.totalFillerWords * 0.1);

    const mockResponses = responses.map((r, i) => {
      const isShort = r.answerText.length < 80;
      const score = isShort ? 6.5 : (Math.floor(Math.random() * 2) + 8);
      return {
        id: `r-${Date.now()}-${i}`,
        questionText: r.questionText,
        answerText: r.answerText,
        durationSec: r.durationSec,
        fillerCount: r.fillerCount,
        score: score,
        critique: isShort 
          ? "Your response was a bit concise. Try expanding on your practical methodologies using specific architectural or process examples."
          : "Highly solid explanation. Structured details were laid out logically and technical terminology was utilized effectively.",
        strengths: ["Clear terminology usage", "Direct problem resolution statement"],
        improvements: ["Structure using STAR method", "Expand on secondary scale bottlenecks"],
        improvedAnswer: "Here is a structured, STAR-compliant version of your answer showing Situation, Task, Action, and Quantitative Result...",
        starCheck: { situation: true, task: true, action: false, result: false },
        complexity: { time: "O(1)", space: "O(1)" }
      };
    });

    const mockEvaluation: SessionEvaluation = {
      id: `eval-${Date.now()}`,
      roleTitle: session.roleTitle,
      difficulty: session.difficulty,
      persona: session.persona,
      overallScore: Math.round(overallScore - communicationDeduction),
      technicalScore: 8.2,
      communicationScore: Math.max(5, Number((8.5 - communicationDeduction).toFixed(1))),
      behavioralScore: 8.0,
      durationMin: Math.max(1, Math.round(sessionTimer / 60)),
      completedAt: new Date(),
      summary: "This is a detailed simulated review sheet. You showed good structural awareness of core design goals. Technical highlights were aligned nicely with target competencies. Improving verbal pacing to reduce filler words will help polish overall delivery.",
      actionableTips: [
        "Incorporate specific quantitative metrics in your projects (e.g., 'reduced API response times by 35%').",
        "Introduce natural speech pauses rather than filling quiet transitions with verbal triggers like 'like' and 'um'.",
        "Structure behavioral examples strictly around specific challenges, your direct actions, and positive resolutions."
      ],
      fillerWordMetrics: fillers,
      responses: mockResponses
    };

    setEvaluationsList(prev => [mockEvaluation, ...prev]);
    setSelectedEvaluation(mockEvaluation);
    setSession(null);
    setActiveTab('dashboard');
    setTimeout(() => {
      document.getElementById('evaluation-scorecard-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const terminateSession = () => {
    if (confirm("Are you sure you want to stop this practice session? Progress will not be saved.")) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopRecordingOnFailure();
      setSession(null);
      setActiveTab('dashboard');
    }
  };

  // --- Mode D: Single-Answer Coach Analyzer ---
  const handleSingleAnswerReviewSubmit = async () => {
    if (!singleQuestionInput.trim() || !singleAnswerInput.trim()) {
      alert("Please fill in both the Question and the Answer fields!");
      return;
    }
    if (!settings.geminiApiKey) {
      alert("Please configure a valid Gemini API Key in the settings page to analyze custom answers!");
      return;
    }

    setIsAnalyzingSingleAnswer(true);
    setSingleEvaluation(null);

    try {
      const evaluation = await evaluateSingleAnswer(
        configRole,
        configExperience,
        singleQuestionInput,
        singleAnswerInput,
        settings.geminiApiKey
      );
      setSingleEvaluation(evaluation);
    } catch (err) {
      console.error("Single answer evaluation error:", err);
      alert("Failed to analyze your answer. Check your connection or API Key.");
    } finally {
      setIsAnalyzingSingleAnswer(false);
    }
  };

  // --- Mode E: Day-by-Day Calendar Planner Generator ---
  const handleGeneratePrepPlanner = async () => {
    if (!settings.geminiApiKey) {
      alert("Please configure a valid Gemini API Key to generate custom study plans!");
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const plan = await generatePrepPlan(
        configRole,
        configCompany,
        configJobDescription,
        configDate,
        settings.geminiApiKey
      );
      setActivePrepPlan(plan);
      setCompletedPlanTasks({});
    } catch (err) {
      console.error("Prep planner generation error:", err);
      alert("Failed to compile study planner. Check your Gemini API credentials.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const togglePlanTask = (dayIdx: number, taskIdx: number) => {
    const key = `d-${dayIdx}-t-${taskIdx}`;
    setCompletedPlanTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // --- Capabilities: Question Bank Generative Compiler ---
  const handleGenerateQuestionBank = async () => {
    if (!settings.geminiApiKey) {
      alert("Please configure a valid Gemini API Key to compile custom question vaults!");
      return;
    }

    setIsGeneratingQBank(true);
    try {
      const bank = await generateQuestionBank(configRole, configDifficulty, settings.geminiApiKey);
      setQuestionBank(bank);
    } catch (err) {
      console.error("Question bank compile error:", err);
      alert("Failed to generate question bank. Please verify your settings configuration.");
    } finally {
      setIsGeneratingQBank(false);
    }
  };

  // --- Capabilities: Company Corporate Intelligence Fetcher ---
  const handleFetchCompanyIntelligence = async () => {
    if (!settings.geminiApiKey) {
      alert("Please configure a valid Gemini API Key to look up company intelligence profiles!");
      return;
    }

    setIsFetchingIntel(true);
    try {
      const intel = await fetchCompanyIntelligence(companyIntelName, configRole, settings.geminiApiKey);
      setCompanyIntelligence(intel);
    } catch (err) {
      console.error("Company intelligence fetch error:", err);
      alert("Failed to fetch corporate intelligence profile. Please try again.");
    } finally {
      setIsFetchingIntel(false);
    }
  };

  // --- Helper: Highlight Filler Words in UI text ---
  const highlightFillersInText = (text: string) => {
    if (!text) return '';
    const fillers = ['like', 'um', 'uh', 'so'];
    const parts = text.split(/(\b(?:like|um|uh|so)\b)/gi);
    return parts.map((part, index) => {
      if (fillers.includes(part.toLowerCase())) {
        return <span key={index} className="filler-highlight">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Ambient glowing blobs */}
      <div className="ambient-blur blob-violet"></div>
      <div className="ambient-blur blob-teal"></div>

      {/* --- Global App Header --- */}
      <header className="app-header">
        <div className="container" style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => { if(!session) setActiveTab('dashboard'); }}>
            <div style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #8B5CF6 100%)',
              width: '40px', height: '40px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
            }}>
              <Brain size={22} color="#09090b" style={{ strokeWidth: 3 }} />
            </div>
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'Outfit' }}>
                Interview<span style={{ color: 'hsl(var(--primary-teal))' }}>IQ</span>
              </span>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '-3px' }}>
                AI Expert Coach
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '75%' }}>
            <button 
              className={`btn btn-secondary ${activeTab === 'dashboard' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('dashboard'); }}
              disabled={!!session}
            >
              <Compass size={14} /> Hub
            </button>
            <button 
              className={`btn btn-secondary ${activeTab === 'answer-coach' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('answer-coach'); }}
              disabled={!!session}
            >
              <Sparkles size={14} /> Answer Coach
            </button>
            <button 
              className={`btn btn-secondary ${activeTab === 'planner' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('planner'); }}
              disabled={!!session}
            >
              <Calendar size={14} /> Planner
            </button>
            <button 
              className={`btn btn-secondary ${activeTab === 'intelligence' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('intelligence'); }}
              disabled={!!session}
            >
              <Building size={14} /> Intelligence
            </button>
            <button 
              className={`btn btn-secondary ${activeTab === 'questions-bank' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('questions-bank'); }}
              disabled={!!session}
            >
              <FileQuestion size={14} /> Question Bank
            </button>
            <button 
              className={`btn btn-secondary ${activeTab === 'settings' ? 'selector-option active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
              onClick={() => { if(!session) setActiveTab('settings'); }}
              disabled={!!session}
            >
              <SettingsIcon size={14} /> Config
            </button>
          </nav>

        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ flex: 1, width: '100%' }}>

          {/* ==========================================
              A. COACH HUB (DASHBOARD & SETUP VIEW)
             ========================================== */}
          {activeTab === 'dashboard' && !session && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
              
              {/* Official Welcoming Coach Prompt layout */}
              <div className="glass-card" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, hsl(var(--primary-teal)) 0%, hsl(var(--primary-violet)) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <UserIcon size={30} color="#09090b" />
                  </div>
                  <div>
                    <h4 style={{ color: 'hsl(var(--primary-teal))', fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', marginBottom: '6px' }}>
                      InterviewIQ Coach
                    </h4>
                    <div className="transcript-bubble bubble-interviewer" style={{ fontSize: '1rem', color: '#ffffff', margin: 0, padding: '15px 20px', width: '100%', maxWidth: '100%' }}>
                      Welcome to <strong>InterviewIQ</strong> 👋 I'm your dedicated interview coach. To get started, configure your target interview context in the panel below. Select your desired <strong>Session Mode</strong> to start realistic practice, review answers, or compile schedules!
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid panel: Left customizer form, Right resumes customizer */}
              <div className="grid-cols-2">
                
                {/* Onboarding Configurator Card */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={18} color="hsl(var(--primary-teal))" /> Onboarding Parameters
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>1. Target Role</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={configRole}
                        onChange={(e) => setConfigRole(e.target.value)}
                        placeholder="e.g. Frontend Engineer"
                        style={{ padding: '10px 12px' }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>2. Target Company</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={configCompany}
                        onChange={(e) => setConfigCompany(e.target.value)}
                        placeholder="e.g. Google"
                        style={{ padding: '10px 12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>3. Seniority level</label>
                      <select 
                        className="form-input"
                        value={configExperience}
                        onChange={(e) => setConfigExperience(e.target.value as ExperienceLevel)}
                        style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px' }}
                      >
                        <option value="ENTRY">Entry Level</option>
                        <option value="MID">Mid Level</option>
                        <option value="SENIOR">Senior Level</option>
                        <option value="LEAD">Lead / Architect</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>4. Interview Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={configDate}
                        onChange={(e) => setConfigDate(e.target.value)}
                        style={{ padding: '8px 10px' }}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>5. Choose Session Mode</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      
                      <div 
                        className={`selector-option ${configMode === 'QUICK_PRACTICE' ? 'active' : ''}`}
                        onClick={() => setConfigMode('QUICK_PRACTICE')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.85rem' }}
                      >
                        <strong>A) Quick Practice</strong> — Ask 3–5 targeted questions, immediate scorecard evaluation.
                      </div>

                      <div 
                        className={`selector-option ${configMode === 'FULL_MOCK' ? 'active' : ''}`}
                        onClick={() => setConfigMode('FULL_MOCK')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.85rem' }}
                      >
                        <strong>B) Full Mock Interview</strong> — Stays fully in character. Comprehensive 6-Q session with hints.
                      </div>

                      <div 
                        className={`selector-option ${configMode === 'DEEP_DIVE' ? 'active' : ''}`}
                        onClick={() => setConfigMode('DEEP_DIVE')}
                        style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.85rem' }}
                      >
                        <strong>C) Deep Dive on Topic</strong> — Focus on specialized core topics with increasing difficulty.
                      </div>

                    </div>
                  </div>

                  {configMode === 'DEEP_DIVE' && (
                    <div className="input-group">
                      <label className="input-label">Select Deep Dive Focus</label>
                      <select 
                        className="form-input"
                        value={deepDiveTopic}
                        onChange={(e) => setDeepDiveTopic(e.target.value as any)}
                        style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px' }}
                      >
                        <option value="System Design">System Design & Scalability</option>
                        <option value="Behavioral Leadership">STAR Leadership questions</option>
                        <option value="SQL & Databases">SQL & Transactional Databases</option>
                        <option value="Algorithms">Data Structures & Algorithms</option>
                        <option value="HR & Screen">HR Screening & Salary Negotiation</option>
                      </select>
                    </div>
                  )}

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Optional: Interviewer Persona</label>
                    <div className="selector-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {(['STANDARD', 'FRIENDLY', 'TECHNICAL', 'STRESSFUL'] as Persona[]).map((p) => (
                        <div 
                          key={p} 
                          className={`selector-option ${configPersona === p ? 'active-violet' : ''}`}
                          onClick={() => setConfigPersona(p)}
                          style={{ fontSize: '0.72rem', padding: '8px 4px' }}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => launchInterviewSession()}
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '20px' }}
                  >
                    Enter Mock Chamber <Mic size={18} />
                  </button>
                </div>

                {/* Resume-to-Interview Bridge Customization */}
                <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={18} color="hsl(var(--primary-violet))" /> Resume CV & Job Bridge
                    </h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '15px' }}>
                      Paste your CV details or the target job description text below. Our AI interviewer will analyze this to generate highly personalized, custom-tailored questions matching your exact background.
                    </p>
                  </div>

                  <textarea 
                    className="form-input" 
                    placeholder="PASTE RESUME OR JOB DESCRIPTION DETAILS:&#10;Example: Senior fullstack developer with 6 years experience specializing in React, Node, and AWS infrastructure scaling. Built high-traffic transactional portals..."
                    style={{ 
                      flex: 1, resize: 'none', minHeight: '180px', marginBottom: '15px', 
                      background: 'rgba(0,0,0,0.2)', fontSize: '0.88rem', lineHeight: 1.5
                    }}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />

                  <div className="flex-between">
                    <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                      {resumeText ? `${resumeText.split(/\s+/).length} Words Loaded` : 'Ready to customize'}
                    </span>
                    {resumeText && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={() => setResumeText('')}
                      >
                        Clear Text
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Scorecard evaluation dashboard (Active when evaluated) */}
              <div id="evaluation-scorecard-section">
                {selectedEvaluation ? (
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '30px', border: '1px solid hsla(var(--primary-teal), 0.25)' }}>
                    
                    {/* Title and overall rating circle */}
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: 'hsla(var(--primary-teal), 0.1)', color: 'hsl(var(--primary-teal))', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Evaluation Scorecard
                          </span>
                          <span style={{ color: 'hsl(var(--text-muted))' }}>•</span>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                            {new Date(selectedEvaluation.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', marginTop: '6px' }}>
                          {selectedEvaluation.roleTitle}
                        </h2>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                          <span>Difficulty: <strong style={{ color: 'hsl(var(--primary-teal))' }}>{selectedEvaluation.difficulty}</strong></span>
                          <span>•</span>
                          <span>Interviewer: {selectedEvaluation.persona}</span>
                          <span>•</span>
                          <span>Duration: {selectedEvaluation.durationMin} Mins</span>
                        </div>
                      </div>

                      {/* SVG Score Circle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="score-circle">
                          <svg className="score-progress-svg" viewBox="0 0 100 100">
                            <circle className="score-progress-bg" cx="50" cy="50" r="40" />
                            <circle 
                              className="score-progress-bar" 
                              cx="50" cy="50" r="40" 
                              style={{ strokeDashoffset: 251.2 - (251.2 * selectedEvaluation.overallScore) / 100 }}
                            />
                          </svg>
                          <span className="score-text text-gradient-neon">{selectedEvaluation.overallScore}</span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontFamily: 'Outfit' }}>Performance Score</h4>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Out of 100 overall</span>
                        </div>
                      </div>
                    </div>

                    {/* Metric sliders */}
                    <div className="grid-cols-3">
                      <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Technical Depth</span>
                          <span style={{ fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 800, color: 'hsl(var(--primary-teal))' }}>{selectedEvaluation.technicalScore}/10</span>
                        </div>
                        <div className="bar-meter-container">
                          <div className="bar-meter-fill fill-teal" style={{ width: `${selectedEvaluation.technicalScore * 10}%` }}></div>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Communication Clarity</span>
                          <span style={{ fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 800, color: 'hsl(var(--primary-violet))' }}>{selectedEvaluation.communicationScore}/10</span>
                        </div>
                        <div className="bar-meter-container">
                          <div className="bar-meter-fill fill-violet" style={{ width: `${selectedEvaluation.communicationScore * 10}%` }}></div>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Behavioral Structuring</span>
                          <span style={{ fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 800, color: 'hsl(var(--accent-gold))' }}>{selectedEvaluation.behavioralScore}/10</span>
                        </div>
                        <div className="bar-meter-container">
                          <div className="bar-meter-fill fill-gold" style={{ width: `${selectedEvaluation.behavioralScore * 10}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Feedback summary and filler words breakdown */}
                    <div className="grid-cols-2">
                      <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <BookOpen size={16} color="hsl(var(--primary-teal))" /> Executive Review Summary
                        </h3>
                        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '15px' }}>
                          {selectedEvaluation.summary}
                        </p>
                        <h4 style={{ fontSize: '0.95rem', fontFamily: 'Outfit', marginBottom: '8px' }}>Actionable Coaching Guidelines</h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                          {selectedEvaluation.actionableTips.map((tip, idx) => (
                            <li key={idx} style={{ lineHeight: 1.3 }}>{tip}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Mic size={16} color="hsl(var(--accent-rose))" /> Conversational Speech Analytics
                        </h3>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                          <h2 style={{ fontSize: '2.2rem', fontFamily: 'Outfit', color: 'hsl(var(--accent-rose))', lineHeight: 1 }}>
                            {selectedEvaluation.fillerWordMetrics.totalFillerWords}
                          </h2>
                          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Total Filler Words Detected
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div className="flex-between" style={{ marginBottom: '4px' }}>
                              <span>Filler: "like"</span>
                              <strong>{selectedEvaluation.fillerWordMetrics.likeCount} times</strong>
                            </div>
                            <div className="bar-meter-container" style={{ height: '4px' }}>
                              <div className="bar-meter-fill" style={{ width: `${Math.min(100, selectedEvaluation.fillerWordMetrics.likeCount * 8)}%`, background: 'hsl(var(--accent-rose))' }}></div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div className="flex-between" style={{ marginBottom: '4px' }}>
                              <span>Filler: "um" / "uh"</span>
                              <strong>{selectedEvaluation.fillerWordMetrics.umCount + selectedEvaluation.fillerWordMetrics.uhCount} times</strong>
                            </div>
                            <div className="bar-meter-container" style={{ height: '4px' }}>
                              <div className="bar-meter-fill" style={{ width: `${Math.min(100, (selectedEvaluation.fillerWordMetrics.umCount + selectedEvaluation.fillerWordMetrics.uhCount) * 8)}%`, background: 'hsl(var(--primary-violet))' }}></div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div className="flex-between" style={{ marginBottom: '4px' }}>
                              <span>Filler: "so"</span>
                              <strong>{selectedEvaluation.fillerWordMetrics.soCount} times</strong>
                            </div>
                            <div className="bar-meter-container" style={{ height: '4px' }}>
                              <div className="bar-meter-fill" style={{ width: `${Math.min(100, selectedEvaluation.fillerWordMetrics.soCount * 8)}%`, background: 'hsl(var(--primary-teal))' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Question analysis and STAR / Complexity details */}
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                        <FileText size={18} color="hsl(var(--primary-teal))" /> Detailed Performance Card Breakdown
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {selectedEvaluation.responses.map((resp, i) => (
                          <div 
                            key={resp.id || i}
                            style={{ 
                              background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '14px',
                              borderLeft: '4px solid hsl(var(--primary-teal))'
                            }}
                          >
                            <div className="flex-between" style={{ marginBottom: '8px' }}>
                              <h4 style={{ fontSize: '0.98rem', fontFamily: 'Outfit' }}>
                                Q{i+1}: {resp.questionText}
                              </h4>
                              <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--primary-teal))' }}>
                                Score: {resp.score}/10
                              </span>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Your Answer</span>
                              <p style={{ fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.4 }}>
                                {highlightFillersInText(resp.answerText)}
                              </p>
                            </div>

                            {/* Render STAR checks or Complexities if available */}
                            {resp.starCheck && (
                              <div style={{ display: 'flex', gap: '10px', margin: '8px 0', flexWrap: 'wrap' }}>
                                <span className={resp.starCheck.situation ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.7rem' }}>
                                  {resp.starCheck.situation ? '✓ Situation Set' : '⚠ Missing Situation'}
                                </span>
                                <span className={resp.starCheck.task ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.7rem' }}>
                                  {resp.starCheck.task ? '✓ Task Clear' : '⚠ Missing Task'}
                                </span>
                                <span className={resp.starCheck.action ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.7rem' }}>
                                  {resp.starCheck.action ? '✓ Action Stated' : '⚠ Missing Action'}
                                </span>
                                <span className={resp.starCheck.result ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.7rem' }}>
                                  {resp.starCheck.result ? '✓ Result Quantified' : '⚠ Missing Result'}
                                </span>
                              </div>
                            )}

                            {resp.complexity && (
                              <div style={{ display: 'flex', gap: '10px', margin: '8px 0', fontSize: '0.75rem', color: 'hsl(var(--primary-teal))', fontFamily: 'var(--font-mono)' }}>
                                {resp.complexity.time && <span>Time Complexity: {resp.complexity.time}</span>}
                                {resp.complexity.space && <span>• Space Complexity: {resp.complexity.space}</span>}
                              </div>
                            )}

                            <div style={{ paddingLeft: '10px', borderLeft: '2px dashed hsl(var(--primary-violet))', marginTop: '8px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary-violet))', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Coach Critique</span>
                              <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.3 }}>
                                {resp.critique}
                              </p>
                            </div>

                            {resp.improvedAnswer && (
                              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--accent-emerald))', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                  🔁 Improved Model Answer (STAR/SOAR Structured)
                                </span>
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', lineHeight: 1.4 }}>
                                  {resp.improvedAnswer}
                                </p>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                              {resp.strengths.map((str, sIdx) => <span key={sIdx} className="strength-tag" style={{ fontSize: '0.72rem' }}>✓ {str}</span>)}
                              {resp.improvements.map((imp, iIdx) => <span key={iIdx} className="improvement-tag" style={{ fontSize: '0.72rem' }}>⚠ {imp}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setSelectedEvaluation(null)}
                      >
                        Close Scorecard Report
                      </button>
                    </div>

                  </div>
                ) : null}
              </div>

              {/* Historical registry */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={18} color="hsl(var(--accent-gold))" /> Historical Scorecard Registry
                </h3>

                {evaluationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'hsl(var(--text-muted))' }}>
                    <AlertCircle size={28} style={{ marginBottom: '10px', display: 'block', margin: '0 auto' }} />
                    <p>No completed interviews found. Setup and execute a mock session above to begin coaching!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evaluationsList.map((ev) => (
                      <div 
                        key={ev.id} 
                        className="glass-card flex-between" 
                        style={{ 
                          padding: '12px 20px', background: 'rgba(255,255,255,0.02)', 
                          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)', border: '2px solid hsla(var(--primary-teal), 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Outfit', fontWeight: 800, color: 'hsl(var(--primary-teal))', fontSize: '0.85rem'
                          }}>
                            {ev.overallScore}
                          </div>

                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontFamily: 'Outfit' }}>{ev.roleTitle}</h4>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>
                              <span style={{ color: 'hsl(var(--primary-violet))', fontWeight: 600 }}>{ev.difficulty}</span>
                              <span>•</span>
                              <span>{ev.persona} persona</span>
                              <span>•</span>
                              <span>{ev.durationMin} Mins</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            {new Date(ev.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            onClick={() => {
                              setSelectedEvaluation(ev);
                              setTimeout(() => {
                                document.getElementById('evaluation-scorecard-section')?.scrollIntoView({ behavior: 'smooth' });
                              }, 100);
                            }}
                          >
                            Review Scorecard <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ==========================================
              B. INTERVIEW CHAMBER (LIVE PRACTICE)
             ========================================== */}
          {activeTab === 'chamber' && session && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Top status bar */}
              <div className="glass-card flex-between" style={{ padding: '14px 20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff3b30', animation: 'mic-pulse-animation 1.5s infinite' }}></div>
                  <h2 style={{ fontSize: '1.15rem', fontFamily: 'Outfit' }}>
                    Mock Chamber: <span style={{ color: 'hsl(var(--primary-teal))' }}>{session.roleTitle}</span> 
                    {session.companyName && <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 400 }}> at {session.companyName}</span>}
                  </h2>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--text-secondary))' }}>
                    <Clock size={14} /> Session: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {Math.floor(sessionTimer / 60)}:{String(sessionTimer % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--text-secondary))' }}>
                    Questions: <span style={{ fontWeight: 700 }}>
                      {session.currentQuestionIndex + 1} / {session.mode === 'FULL_MOCK' ? '6 (Structured)' : '4 (Practice)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main chamber frame */}
              <div className="grid-cols-2" style={{ alignItems: 'stretch' }}>
                
                {/* Left Panel: Coach Avatar and Speaking Waves */}
                <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', minHeight: '400px' }}>
                  
                  <span style={{ 
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '4px 12px', borderRadius: '15px', fontSize: '0.72rem', textTransform: 'uppercase',
                    letterSpacing: '0.12em', color: 'hsl(var(--primary-violet))', fontWeight: 700
                  }}>
                    {session.persona} PERSONA COACH
                  </span>

                  <div className="avatar-ring">
                    {isInterviewerSpeaking && <div className="avatar-voice-wave pulse"></div>}
                    <div className="avatar-core">
                      <UserIcon size={60} color="hsl(var(--primary-teal))" />
                    </div>
                  </div>

                  <div className="waveform-container">
                    {waveAmplitudes.map((h, i) => (
                      <div 
                        key={i} 
                        className={`wave-bar ${isInterviewerSpeaking || isRecording ? 'speaking' : ''}`}
                        style={{ height: `${h}px` }}
                      ></div>
                    ))}
                  </div>

                  {/* Dynamic question text bubble */}
                  <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isGeneratingNext ? (
                      <div style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                        <div className="wave-bar speaking" style={{ width: '3px', height: '12px' }}></div>
                        Coach formulating adaptive follow-up...
                      </div>
                    ) : (
                      <div 
                        className="transcript-bubble bubble-interviewer" 
                        style={{ 
                          fontSize: '1rem', width: '100%', maxWidth: '100%', 
                          background: 'rgba(0,0,0,0.1)'
                        }}
                      >
                        {session.messages[session.messages.length - 1]?.text}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                      onClick={() => speakQuestionText(session.messages[session.messages.length - 1]?.text)}
                      disabled={isGeneratingNext || isInterviewerSpeaking}
                    >
                      <Volume2 size={12} /> Replay
                    </button>
                    
                    {/* Socratic Hint Button */}
                    {settings.geminiApiKey && (
                      <button 
                        className="btn btn-teal-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                        onClick={requestSocraticHint}
                        disabled={isGeneratingNext || isGeneratingHint || isInterviewerSpeaking}
                      >
                        <HelpCircle size={12} /> Socratic Hint
                      </button>
                    )}
                  </div>

                </div>

                {/* Right Panel: Candidate Workspace */}
                <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '15px' }}>
                  
                  <div className="flex-between">
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-secondary))' }}>
                      Candidate Workspace
                    </span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem' }}>
                      <span style={{ color: 'hsl(var(--accent-rose))', fontWeight: 600 }}>
                        Speech Fillers: {fillerCounts.total}
                      </span>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>|</span>
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>
                        Timer: <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.floor(questionTimer / 60)}:{String(questionTimer % 60).padStart(2, '0')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Socratic Hint text display panel */}
                  {socraticHintText && (
                    <div className="glass-card" style={{ padding: '10px 14px', background: 'hsla(var(--primary-teal), 0.03)', border: '1px solid hsla(var(--primary-teal), 0.2)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary-teal))', fontWeight: 700, display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>
                        💡 Socratic Coach Clue
                      </span>
                      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.3, fontStyle: 'italic' }}>
                        {socraticHintText}
                      </p>
                    </div>
                  )}

                  {/* Dynamic Voice transcribing or manual typing workspace */}
                  <div style={{ 
                    flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '12px', padding: '14px', position: 'relative', display: 'flex', flexDirection: 'column',
                    minHeight: '200px'
                  }}>
                    {isRecording ? (
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        <span style={{ color: 'hsl(var(--primary-teal))', fontSize: '0.7rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', animation: 'mic-pulse-animation 1.5s infinite' }}>
                          🎤 Recording Speech (Talk Now)...
                        </span>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.4, color: '#ffffff' }}>
                          {speechTranscript || <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Transcribing your speech in real-time...</span>}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                          📝 Manual Answer & Coding Editor
                        </span>
                        <textarea
                          className="form-input"
                          placeholder="Compose your answer verbally by using the microphone, or type your complete answer response here..."
                          style={{
                            width: '100%', flex: 1, background: 'transparent', border: 'none', resize: 'none',
                            padding: 0, outline: 'none', fontSize: '0.95rem', lineHeight: 1.4, color: '#ffffff',
                            fontFamily: 'var(--font-sans)'
                          }}
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Speech toggle overlay */}
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                      <div className="mic-ring">
                        {isRecording && <div className="mic-pulse"></div>}
                        <button 
                          onClick={toggleRecording}
                          className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                          style={{ 
                            borderRadius: '50%', width: '44px', height: '44px', padding: 0,
                            boxShadow: isRecording ? '0 0 10px hsla(var(--accent-rose), 0.4)' : '0 4px 10px hsla(var(--primary-teal), 0.2)'
                          }}
                          disabled={isGeneratingNext || isGeneratingHint || isInterviewerSpeaking}
                        >
                          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn btn-secondary btn-danger" 
                      style={{ padding: '10px 16px', flex: 1, fontSize: '0.88rem' }}
                      onClick={terminateSession}
                    >
                      Quit Practice
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '10px 20px', flex: 2, fontSize: '0.88rem' }}
                      onClick={handleAnswerSubmit}
                      disabled={isGeneratingNext || isInterviewerSpeaking || (!textAnswer.trim() && !speechTranscript.trim())}
                    >
                      Submit Answer <Send size={14} />
                    </button>
                  </div>

                </div>

              </div>

              {/* Conversation Log Registry */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="hsl(var(--primary-teal))" /> Conversation Transcript History
                </h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {session.messages.map((msg, i) => (
                    <div 
                      key={msg.id || i} 
                      className={`transcript-bubble ${msg.sender === 'interviewer' ? 'bubble-interviewer' : 'bubble-candidate'}`}
                      style={{ margin: 0, maxWidth: '85%', padding: '12px 16px' }}
                    >
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'hsl(var(--text-secondary))', marginBottom: '3px', fontWeight: 600 }}>
                        {msg.sender === 'interviewer' ? `${session.persona} Examiner` : 'You (Candidate)'}
                      </span>
                      <p style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
                        {msg.sender === 'candidate' ? highlightFillersInText(msg.text) : msg.text}
                      </p>
                    </div>
                  ))}
                  {isGeneratingNext && (
                    <div className="transcript-bubble bubble-interviewer" style={{ margin: 0, maxWidth: '85%', padding: '12px 16px' }}>
                      <span className="wave-bar speaking" style={{ width: '3px', height: '10px', display: 'inline-block', marginRight: '6px' }}></span>
                      Formulating follow-up question...
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              C. MODE D: SINGLE-ANSWER COACH
             ========================================== */}
          {activeTab === 'answer-coach' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              <div className="glass-card" style={{ padding: '30px 40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sparkles size={24} color="hsl(var(--primary-teal))" /> Mode D — Single-Answer Coach
                </h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.92rem', marginTop: '6px' }}>
                  Paste a challenging question and your draft answer below. Our Coach will evaluate it out of 10, structure the strengths & gaps, and provide a **completely rewritten, high-caliber model answer** using frameworks like STAR, CAR, or SOAR!
                </p>
              </div>

              <div className="grid-cols-2" style={{ alignItems: 'stretch' }}>
                
                {/* Inputs card */}
                <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                      Draft Your Response
                    </h3>
                    
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.72rem' }}>Interview Question</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. Tell me about a time when you disagreed with a technical design decision by a peer."
                        value={singleQuestionInput}
                        onChange={(e) => setSingleQuestionInput(e.target.value)}
                      />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label" style={{ fontSize: '0.72rem' }}>Your Draft Answer</label>
                      <textarea 
                        className="form-input"
                        placeholder="Paste your answer draft here. Feel free to structure it briefly. We will refine it to a senior hiring manager standard..."
                        style={{ minHeight: '220px', resize: 'none', fontSize: '0.88rem', lineHeight: 1.4 }}
                        value={singleAnswerInput}
                        onChange={(e) => setSingleAnswerInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', marginTop: '20px' }}
                    onClick={handleSingleAnswerReviewSubmit}
                    disabled={isAnalyzingSingleAnswer || !singleQuestionInput.trim() || !singleAnswerInput.trim()}
                  >
                    {isAnalyzingSingleAnswer ? "Coaching Engine in Progress..." : "Analyze & Rewrite Answer"} <ArrowRight size={16} />
                  </button>
                </div>

                {/* Outputs card */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                    Coach Evaluation Results
                  </h3>

                  {isAnalyzingSingleAnswer && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--text-muted))' }}>
                      <div className="avatar-ring" style={{ margin: '0 auto 20px', width: '80px', height: '80px' }}>
                        <div className="avatar-voice-wave pulse"></div>
                        <div className="avatar-core" style={{ width: '72px', height: '72px' }}>
                          <Sparkles size={30} color="hsl(var(--primary-teal))" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Analyzing technical depth, STAR composition, and phrasing...
                      </p>
                    </div>
                  )}

                  {!isAnalyzingSingleAnswer && !singleEvaluation && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
                      <HelpCircle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                      <p style={{ fontSize: '0.88rem' }}>Enter a question and answer on the left to view detailed evaluations here.</p>
                    </div>
                  )}

                  {!isAnalyzingSingleAnswer && singleEvaluation && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      {/* Score circle and lightbulb tip */}
                      <div className="flex-between" style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)', border: '2px solid hsla(var(--primary-teal), 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Outfit', fontWeight: 800, color: 'hsl(var(--primary-teal))', fontSize: '1rem'
                          }}>
                            {singleEvaluation.score}/10
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', fontWeight: 700 }}>Answer Grade</span>
                            <h4 style={{ fontSize: '0.9rem', color: '#ffffff', fontFamily: 'Outfit' }}>Clarity & Impact</h4>
                          </div>
                        </div>

                        {/* STAR criteria indicators */}
                        {singleEvaluation.starCheck && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <span className={singleEvaluation.starCheck.situation ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>S</span>
                            <span className={singleEvaluation.starCheck.task ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>T</span>
                            <span className={singleEvaluation.starCheck.action ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>A</span>
                            <span className={singleEvaluation.starCheck.result ? 'strength-tag' : 'improvement-tag'} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>R</span>
                          </div>
                        )}
                      </div>

                      {/* Strengths & Gaps lists */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'hsl(var(--accent-emerald))', fontWeight: 700, display: 'block', marginBottom: '4px' }}>✓ Key Strengths</span>
                          <ul style={{ paddingLeft: '15px', fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {singleEvaluation.strengths.map((str: string, idx: number) => <li key={idx}>{str}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'hsl(var(--accent-rose))', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚠ Critical Gaps</span>
                          <ul style={{ paddingLeft: '15px', fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {singleEvaluation.gaps.map((gap: string, idx: number) => <li key={idx}>{gap}</li>)}
                          </ul>
                        </div>
                      </div>

                      {/* Improved model answer container */}
                      <div className="glass-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-emerald))', fontWeight: 800, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          🔁 Improved Model Answer (Senior Level STAR/CAR Structure)
                        </span>
                        <p style={{ fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.4, fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '8px' }}>
                          {singleEvaluation.improvedAnswer}
                        </p>
                      </div>

                      {/* Verbal Pro Tip */}
                      <div style={{ padding: '10px 14px', borderLeft: '3px solid hsl(var(--primary-violet))', background: 'hsla(var(--primary-violet), 0.03)', borderRadius: '0 8px 8px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'hsl(var(--primary-violet))', fontWeight: 700, textTransform: 'uppercase' }}>
                          💡 Verbal Delivery Pro Tip
                        </span>
                        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginTop: '2px', lineHeight: 1.3 }}>
                          {singleEvaluation.proTip}
                        </p>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* ==========================================
              D. MODE E: PREP PLANNER (CALENDAR VIEW)
             ========================================== */}
          {activeTab === 'planner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              <div className="glass-card" style={{ padding: '30px 40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={24} color="hsl(var(--primary-teal))" /> Mode E — Day-by-Day Prep Planner
                </h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.92rem', marginTop: '6px' }}>
                  Paste details from the job description and your interview date. Our AI compiler will generate a highly structured, day-by-day calendar schedule containing focused study guides and interactive todo checklists!
                </p>
              </div>

              {/* Split planner inputs & outputs */}
              <div className="grid-cols-3" style={{ alignItems: 'stretch' }}>
                
                {/* Inputs left */}
                <div className="glass-card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                      Setup Scheduler
                    </h3>
                    
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.72rem' }}>Job Description / Key Competencies</label>
                      <textarea 
                        className="form-input"
                        placeholder="Paste job description bullet points, target tech stacks, or core requirements here..."
                        style={{ minHeight: '220px', resize: 'none', fontSize: '0.85rem', lineHeight: 1.4 }}
                        value={configJobDescription}
                        onChange={(e) => setConfigJobDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleGeneratePrepPlanner}
                    disabled={isGeneratingPlan || !configJobDescription.trim()}
                  >
                    {isGeneratingPlan ? "Compiling Prep Schedule..." : "Compile Daily Prep Planner"}
                  </button>
                </div>

                {/* Planner Calendar display right */}
                <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                    Personalized Preparation Calendar
                  </h3>

                  {isGeneratingPlan && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--text-muted))' }}>
                      <div className="avatar-ring" style={{ margin: '0 auto 20px', width: '80px', height: '80px' }}>
                        <div className="avatar-voice-wave pulse"></div>
                        <div className="avatar-core" style={{ width: '72px', height: '72px' }}>
                          <Calendar size={30} color="hsl(var(--primary-teal))" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Structuring skill gaps, mapping calendar days, and compiling checklist tasks...
                      </p>
                    </div>
                  )}

                  {!isGeneratingPlan && activePrepPlan.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
                      <Calendar size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                      <p style={{ fontSize: '0.88rem' }}>Set parameters and compile your planner to view daily calendars.</p>
                    </div>
                  )}

                  {!isGeneratingPlan && activePrepPlan.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                      {activePrepPlan.map((pDay, dIdx) => (
                        <div 
                          key={dIdx} 
                          className="glass-card" 
                          style={{ 
                            padding: '16px', background: 'rgba(255,255,255,0.01)', 
                            borderLeft: '4px solid hsl(var(--primary-teal))' 
                          }}
                        >
                          <div className="flex-between" style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.72rem', background: 'hsla(var(--primary-teal), 0.1)', color: 'hsl(var(--primary-teal))', padding: '2px 8px', borderRadius: '8px', fontWeight: 800 }}>
                              DAY {pDay.day}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>
                              Objective Target
                            </span>
                          </div>
                          
                          <h4 style={{ fontSize: '0.95rem', fontFamily: 'Outfit', color: '#ffffff', marginBottom: '8px' }}>
                            {pDay.focus}
                          </h4>

                          {/* Focus topics tags */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            {pDay.topics.map((topic, tIdx) => (
                              <span key={tIdx} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px', color: 'hsl(var(--text-secondary))' }}>
                                # {topic}
                              </span>
                            ))}
                          </div>

                          {/* Interactive tasks list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Daily Checklist Tasks</span>
                            {pDay.tasks.map((task, tIdx) => {
                              const isCompleted = !!completedPlanTasks[`d-${dIdx}-t-${tIdx}`];
                              return (
                                <div 
                                  key={tIdx} 
                                  onClick={() => togglePlanTask(dIdx, tIdx)}
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    fontSize: '0.8rem', color: isCompleted ? 'hsl(var(--text-muted))' : 'hsl(var(--text-secondary))',
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    background: 'rgba(0,0,0,0.1)', padding: '6px 8px', borderRadius: '6px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{
                                    width: '14px', height: '14px', borderRadius: '3px',
                                    border: isCompleted ? '1px solid hsl(var(--accent-emerald))' : '1px solid rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isCompleted ? 'hsla(var(--accent-emerald), 0.15)' : 'transparent',
                                    flexShrink: 0
                                  }}>
                                    {isCompleted && <Check size={10} color="hsl(var(--accent-emerald))" />}
                                  </div>
                                  <span style={{ lineHeight: 1.2 }}>{task}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* ==========================================
              E. CAPABILITIES: COMPANY INTELLIGENCE
             ========================================== */}
          {activeTab === 'intelligence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              <div className="glass-card" style={{ padding: '30px 40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={24} color="hsl(var(--primary-teal))" /> Corporate & Company Intelligence
                </h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.92rem', marginTop: '6px' }}>
                  Enter a target company name (e.g. Google, Amazon, Netflix, McKinsey). Our coach compiles detailed cultural guidelines, standard interview processes, specific preparation guidelines, and common questions!
                </p>
              </div>

              <div className="grid-cols-3" style={{ alignItems: 'stretch' }}>
                
                {/* Search sidebar */}
                <div className="glass-card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                      Intelligence Target
                    </h3>
                    <div className="input-group">
                      <label className="input-label">Company / Corporation</label>
                      <input 
                        type="text"
                        className="form-input"
                        value={companyIntelName}
                        onChange={(e) => setCompanyIntelName(e.target.value)}
                        placeholder="e.g. Amazon"
                      />
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleFetchCompanyIntelligence}
                    disabled={isFetchingIntel || !companyIntelName.trim()}
                  >
                    {isFetchingIntel ? "Fetching Intel..." : "Fetch Company Intelligence"}
                  </button>
                </div>

                {/* Insights Panel */}
                <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginBottom: '15px' }}>
                    Strategic Corporate Insights
                  </h3>

                  {isFetchingIntel && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--text-muted))' }}>
                      <div className="avatar-ring" style={{ margin: '0 auto 20px', width: '80px', height: '80px' }}>
                        <div className="avatar-voice-wave pulse"></div>
                        <div className="avatar-core" style={{ width: '72px', height: '72px' }}>
                          <Building size={30} color="hsl(var(--primary-teal))" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Compiling culture values, standard loop designs, and interview question frequencies...
                      </p>
                    </div>
                  )}

                  {!isFetchingIntel && !companyIntelligence && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
                      <Building size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                      <p style={{ fontSize: '0.88rem' }}>Enter a corporation name on the left to build an strategic intelligence profile.</p>
                    </div>
                  )}

                  {!isFetchingIntel && companyIntelligence && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      <div className="grid-cols-2">
                        <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                          <h4 style={{ fontSize: '0.95rem', color: 'hsl(var(--primary-teal))', fontFamily: 'Outfit', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={14} /> Cultural Values & Principles
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
                            {companyIntelligence.culture}
                          </p>
                        </div>
                        <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                          <h4 style={{ fontSize: '0.95rem', color: 'hsl(var(--primary-violet))', fontFamily: 'Outfit', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} /> Loop Structure & Style
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
                            {companyIntelligence.interviewStyle}
                          </p>
                        </div>
                      </div>

                      {/* Prep tips */}
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontFamily: 'Outfit', marginBottom: '8px', color: '#ffffff' }}>
                          Tactical Interview Tips for {companyIntelName}
                        </h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '20px', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))' }}>
                          {companyIntelligence.tips.map((tip: string, idx: number) => <li key={idx} style={{ lineHeight: 1.3 }}>{tip}</li>)}
                        </ul>
                      </div>

                      {/* Common questions */}
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontFamily: 'Outfit', marginBottom: '10px', color: '#ffffff' }}>
                          Frequently Asked Questions at {companyIntelName}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {companyIntelligence.commonQuestions.map((q: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="flex-between"
                              style={{ 
                                background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
                                padding: '10px 14px', borderRadius: '10px'
                              }}
                            >
                              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-primary))' }}>
                                "{q.questionText}"
                              </span>
                              <span style={{ background: 'hsla(var(--primary-teal), 0.1)', color: 'hsl(var(--primary-teal))', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                {q.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* ==========================================
              F. CAPABILITIES: QUESTION BANK
             ========================================== */}
          {activeTab === 'questions-bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              <div className="glass-card flex-between" style={{ padding: '30px 40px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileQuestion size={24} color="hsl(var(--primary-teal))" /> Generative Question Bank
                  </h2>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.92rem', marginTop: '6px' }}>
                    Generate or search standard interview questions matching your exact role parameters. Easily sort by category, difficulty, or typical frequency, and click to practice instantly!
                  </p>
                </div>
                
                <button 
                  className="btn btn-primary"
                  onClick={handleGenerateQuestionBank}
                  disabled={isGeneratingQBank}
                  style={{ padding: '12px 20px', fontSize: '0.9rem' }}
                >
                  {isGeneratingQBank ? "Generating Questions..." : "Generate Custom Role Questions"}
                </button>
              </div>

              {/* Filters & Search */}
              <div className="glass-card flex-between" style={{ padding: '15px 20px', borderRadius: '12px', flexWrap: 'wrap', gap: '15px' }}>
                
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', width: '100%', maxWidth: '300px' }}>
                  <Search size={16} color="hsl(var(--text-secondary))" />
                  <input 
                    type="text" 
                    placeholder="Search questions text..."
                    value={qBankSearchQuery}
                    onChange={(e) => setQBankSearchQuery(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: '#ffffff', width: '100%' }}
                  />
                </div>

                {/* Category filters */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['All', 'Technical', 'Behavioral', 'Domain-Specific', 'HR / Screening', 'Case Study'].map((cat) => (
                    <button
                      key={cat}
                      className={`btn btn-secondary ${qBankCategoryFilter === cat ? 'active' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                      onClick={() => setQBankCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

              </div>

              {/* Questions Grid */}
              <div>
                {isGeneratingQBank && (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
                    <div className="avatar-ring" style={{ margin: '0 auto 20px', width: '80px', height: '80px' }}>
                      <div className="avatar-voice-wave pulse"></div>
                      <div className="avatar-core" style={{ width: '72px', height: '72px' }}>
                        <FileQuestion size={30} color="hsl(var(--primary-teal))" />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Formulating realistic, high-frequency technical and behavioral questions...
                    </p>
                  </div>
                )}

                {!isGeneratingQBank && questionBank.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: '0.88rem' }}>No questions compiled. Press "Generate Custom Role Questions" above to populate the bank using Gemini.</p>
                  </div>
                )}

                {!isGeneratingQBank && questionBank.length > 0 && (
                  <div className="grid-cols-2">
                    {questionBank
                      .filter(q => q.questionText.toLowerCase().includes(qBankSearchQuery.toLowerCase()))
                      .filter(q => qBankCategoryFilter === 'All' || q.category === qBankCategoryFilter)
                      .map((q, idx) => {
                        let difficultyColor = 'hsl(var(--accent-emerald))';
                        if (q.difficulty === 'Medium') difficultyColor = 'hsl(var(--accent-gold))';
                        if (q.difficulty === 'Hard') difficultyColor = 'hsl(var(--accent-rose))';

                        return (
                          <div 
                            key={q.id || idx}
                            className="glass-card flex-between"
                            style={{ 
                              padding: '20px', background: 'rgba(255,255,255,0.01)', 
                              flexDirection: 'column', alignItems: 'stretch', gap: '15px' 
                            }}
                          >
                            <div className="flex-between">
                              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', color: 'hsl(var(--primary-violet))', fontWeight: 700 }}>
                                {q.category}
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ fontSize: '0.68rem', color: difficultyColor, border: `1px solid ${difficultyColor}`, padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  {q.difficulty}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-secondary))', background: 'rgba(255,255,255,0.03)', padding: '1px 6px', borderRadius: '4px' }}>
                                  Ask Rate: {q.frequency}
                                </span>
                              </div>
                            </div>

                            <p style={{ fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.4, flex: 1 }}>
                              "{q.questionText}"
                            </p>

                            <div style={{ textAlign: 'right' }}>
                              <button 
                                className="btn btn-teal-outline"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}
                                onClick={() => launchInterviewSession(q.questionText)}
                              >
                                Practice Question <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ==========================================
              G. CONFIG / SETTINGS VIEW
             ========================================== */}
          {activeTab === 'settings' && (
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.6rem', fontFamily: 'Outfit', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SettingsIcon size={22} color="hsl(var(--primary-teal))" /> Core System Preferences
              </h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', marginBottom: '25px' }}>
                Configure keys, Speech-to-Text voices, speech volumes, and tracking visualizers.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* API Key */}
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>Google Gemini API Key</span>
                    <span style={{ color: 'hsl(var(--accent-emerald))', fontSize: '0.72rem', textTransform: 'none' }}>
                      Preloaded key active
                    </span>
                  </label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                    Powering realistic dynamically adaptive mock examiner dialogues and deep scorecard critiques directly on your browser.
                  </p>
                </div>

                {/* Volume slider */}
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Voice Volume</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1" 
                      value={settings.voiceVolume}
                      onChange={(e) => setSettings(prev => ({ ...prev, voiceVolume: Number(e.target.value) }))}
                      style={{ flex: 1, accentColor: 'hsl(var(--primary-teal))' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: '30px' }}>
                      {Math.round(settings.voiceVolume * 100)}%
                    </span>
                  </div>
                </div>

                {/* Voice pickers */}
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Vocal Synthesizer Voice</label>
                  <select 
                    className="form-input"
                    value={settings.selectedVoiceName}
                    onChange={(e) => setSettings(prev => ({ ...prev, selectedVoiceName: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="">Default Browser Voice (Auto Select)</option>
                    {availableVoices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div className="flex-between">
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable Real-time Filler Word Tracker</h4>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Audits candidate responses for verbal triggers (like, um, uh, so).</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableFillerDetection}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableFillerDetection: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary-teal))' }}
                    />
                  </div>

                  <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Activate Vocal Synthesizer Playback</h4>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Enables vocal reading of interview questions by the AI coach.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableVocalFeedback}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableVocalFeedback: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary-teal))' }}
                    />
                  </div>

                </div>

                <div style={{ marginTop: '10px' }}>
                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      alert("Preferences configured successfully!");
                      setActiveTab('dashboard');
                    }}
                  >
                    Apply Preferences
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- Footer --- */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '15px 0', background: 'rgba(0, 0, 0, 0.3)', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
        <p>© 2026 InterviewIQ Platform. Empowering candidates with premium intelligent mock diagnostics.</p>
      </footer>

    </div>
  );
}
