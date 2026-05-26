import { SessionEvaluation, Difficulty } from './types';


export const MOCK_QUESTIONS: Record<string, Record<Difficulty, string[]>> = {
  'Frontend Engineer': {
    ENTRY: [
      "Welcome! Let's start with a warm-up. Can you explain the difference between dynamic client-side rendering (CSR) and static server-side rendering (SSR), and when you would choose one over the other?",
      "Excellent. Now, tell me about the CSS box model. How do content-box and border-box sizing differ, and how do they impact element width calculation?",
      "Let's talk about closures in JavaScript. What is a closure, and could you give me a typical real-world example of where you would use one in a frontend application?",
      "How do you optimize a slow React application? If you noticed a component re-rendering too frequently, what hooks or patterns would you investigate to fix it?",
      "To wrap up: imagine you have an application that needs to fetch a list of articles from a public REST API. How do you handle loading and error states gracefully in the user interface?"
    ],
    INTERMEDIATE: [
      "Let's start! How does React's reconciliation algorithm and Virtual DOM work under the hood? What is the significance of the 'key' prop when rendering lists?",
      "Can you explain the differences between the various browser storage mechanisms (LocalStorage, SessionStorage, Cookies, and IndexedDB) and their security implications, specifically regarding XSS attacks?",
      "Tell me about a complex state management problem you solved. Why did you choose that specific solution (e.g., Redux, Zustand, Context API, or Recoil) over others, and how did you organize it?",
      "Explain the concept of 'Event Loop' in JavaScript. How do microtasks (like Promises) and macrotasks (like setTimeout) get scheduled and executed?",
      "Lastly, how do you handle security vulnerabilities such as Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) when developing modern React applications?"
    ],
    SENIOR: [
      "Welcome. Let's delve into architectural design. If you were tasked with building a complex, highly interactive dashboard (like Trello or Miro) from scratch, how would you design the state architecture, real-time sync layer, and render performance pipelines?",
      "Let's discuss Web Performance. How would you design a comprehensive metric tracking system for Core Web Vitals (LCP, FID, CLS, INP) across a large production application, and what advanced strategies would you deploy to optimize them?",
      "Explain your philosophy on micro-frontends. When does a monolithic frontend become too large, what integration patterns (e.g., Module Federation, Iframes, Web Components) do you recommend, and what are their trade-offs?",
      "How do you design a scalable design system and component library that supports multiple brands, theming (including dark mode), high accessibility compliance (WCAG AA/AAA), and RTL languages?",
      "Finally, can you describe a time when you had to make a critical technical decision on a frontend project that had significant long-term business or technical impacts, and how did you drive consensus among developers?"
    ]
  },
  'Backend Engineer': {
    ENTRY: [
      "Welcome. To begin, could you explain the differences between relational databases (like PostgreSQL) and non-relational databases (like MongoDB)? When would you choose one over the other?",
      "How do RESTful APIs represent resources and actions? What are the standard HTTP methods and status codes, and what is the difference between POST and PUT?",
      "Let's talk about database indexing. What is an index, how does it speed up queries, and what is the cost of having too many indexes on a table?",
      "How do you secure access to a backend API? Can you explain how JWT (JSON Web Tokens) work and how they are used for user session authorization?",
      "Lastly, if you had an API endpoint that was taking 10 seconds to return data, how would you go about diagnosing and troubleshooting the issue?"
    ],
    INTERMEDIATE: [
      "Welcome. Let's discuss database concurrency. What are database transactions and ACID properties? Can you explain transaction isolation levels and the types of read anomalies they prevent?",
      "How would you design a scalable caching strategy for a high-traffic read-heavy backend? Where would you position caches (e.g., Redis, CDN, application memory) and how would you handle cache eviction or invalidation?",
      "Explain the architectural differences and trade-offs between a monolithic backend architecture and a microservices architecture. When is it appropriate to migrate from one to the other?",
      "Let's talk about message queues. How do tools like RabbitMQ or Kafka help in decoupling backend processes, and how do you guarantee at-least-once or exactly-once message delivery?",
      "To conclude, how do you approach API rate limiting? What algorithms (e.g., token bucket, sliding window) are available, and how would you implement a distributed rate-limiter in microservices?"
    ],
    SENIOR: [
      "Welcome. Let's jump into high scalability. How would you architect a distributed backend system to support a global live sports ticketing platform that experiences extreme flash traffic spikes? Detail the database scaling, routing, and transactional consistency models.",
      "Let's discuss Event-Driven Architecture. How do you maintain data consistency across multiple distributed microservices without relying on slow, blocking two-phase commits? Can you describe the Saga Pattern and how you'd handle compensation events?",
      "How do you approach database partitioning, sharding, and replication? Under what conditions would you shard a relational database, and how does that impact join operations, transactional scope, and querying?",
      "Explain your strategy for securing a complex cloud backend infrastructure. How do you implement zero-trust networking, secure secrets storage, robust logging/observability, and mitigate DDoS or OWASP Top 10 vulnerabilities at scale?",
      "Can you describe a significant architectural failure you experienced in a production system? What was the root cause, how did you lead the incident recovery, and what systemic changes did you introduce to prevent it in the future?"
    ]
  },
  'Product Manager': {
    ENTRY: [
      "Welcome! Let's start with a behavioral question. How do you prioritize a backlog of features when you have limited engineering resources and multiple competing stakeholder requests?",
      "How do you define success for a new product feature? What metrics (KPIs) would you track to determine if it is performing well and meeting business goals?",
      "Tell me about a time when you received negative feedback from users about a feature you launched. How did you react, and what actions did you take based on that feedback?",
      "How do you align cross-functional teams (Engineering, Design, Marketing, Sales) behind a unified product vision and roadmap?",
      "Lastly, what is your approach to conducting user research? How do you gather qualitative and quantitative insights to validate product ideas before writing code?"
    ],
    INTERMEDIATE: [
      "Welcome. Let's talk strategy. Can you describe your framework for conducting competitor analysis and utilizing it to refine your product's value proposition?",
      "Tell me about a time when you had to make a tough decision to kill a feature or product that had significant emotional or financial investment from the team. How did you handle the stakeholders?",
      "How do you approach pricing and monetization strategies for a SaaS product? What models (e.g., freemium, tiered, usage-based) do you evaluate, and how do you test pricing elasticity?",
      "Explain how you translate long-term business goals into a structured, executable 1-year product roadmap. How do you handle sudden market disruptions or changing executive priorities?",
      "Finally, how do you establish a balance between short-term feature delivery, technical debt mitigation, and long-term research and development inside your engineering team?"
    ],
    SENIOR: [
      "Welcome. Let's delve into portfolio management. If you were tasked with overseeing a suite of products, how do you allocate resources and capital across core cash-cow products versus highly speculative, innovative initiatives?",
      "Let's discuss platform ecosystems. How do you build and maintain a developer platform or double-sided marketplace product? What are the network effects, governance structures, and strategic levers to sustain growth?",
      "Can you walk me through a major strategic pivot you spearheaded? What market signals or data led you to realize the current direction was failing, how did you define the new strategy, and how did you manage organizational resistance?",
      "How do you cultivate a data-driven, customer-centric product culture across a massive product division? What organizational design patterns, mentoring structures, and operational frameworks do you establish?",
      "To close: how do you evaluate emerging technologies (such as GenAI) to determine if they represent a genuine strategic multiplier for your product line, or just a temporary trend, and how do you incorporate them safely?"
    ]
  }
};

export const MOCK_EVALUATIONS: SessionEvaluation[] = [
  {
    id: "eval-1",
    roleTitle: "Frontend Engineer",
    difficulty: "INTERMEDIATE",
    persona: "STANDARD",
    overallScore: 84,
    technicalScore: 8.5,
    communicationScore: 8.0,
    behavioralScore: 8.7,
    durationMin: 12,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    summary: "The candidate demonstrated strong intermediate knowledge of modern frontend core concepts. Their understanding of React's fiber rendering engine and optimization patterns is solid. They expressed solutions clearly but could benefit from reduced usage of filler words and more structured responses during behavioral segments.",
    actionableTips: [
      "Structure behavioral responses using the STAR format (Situation, Task, Action, Result) to avoid trailing off at the end of answers.",
      "Reduce verbal filler words (e.g., 'like', 'um') which occurred 14 times. Take deep breaths or pause briefly between sentences instead.",
      "When discussing browser storage, explain security mitigations (such as HttpOnly and Secure flags for cookies) without prompting."
    ],
    fillerWordMetrics: {
      totalFillerWords: 14,
      likeCount: 6,
      umCount: 5,
      uhCount: 2,
      soCount: 1,
      otherCount: 0
    },
    responses: [
      {
        id: "r1",
        questionText: "Let's start! How does React's reconciliation algorithm and Virtual DOM work under the hood? What is the significance of the 'key' prop when rendering lists?",
        answerText: "Okay, so React's virtual DOM is basically a lightweight representation of the real DOM. When state changes, React creates a new virtual DOM tree and compares it, um, with the previous one. This process is called reconciliation or diffing. The 'key' prop is super important because it helps React identify which items have changed, been added, or been removed in lists. Without unique keys, React might re-render the entire list, which is bad for performance.",
        durationSec: 110,
        fillerCount: 3,
        score: 9.0,
        critique: "Excellent technical explanation. Correctly identified reconciliation as the diffing process and described the performance role of the key prop accurately.",
        strengths: ["Clear explanation of reconciliation", "Accurate description of key prop role"],
        improvements: ["Explain the O(n) algorithmic complexity assumption of the diffing process under the hood"]
      },
      {
        id: "r2",
        questionText: "Can you explain the differences between the various browser storage mechanisms (LocalStorage, SessionStorage, Cookies, and IndexedDB) and their security implications, specifically regarding XSS attacks?",
        answerText: "Yeah, so LocalStorage and SessionStorage store key-value pairs locally. LocalStorage is persistent, like, forever until cleared. SessionStorage clears when the tab closes. Cookies are sent with every request and are, like, limited in size to 4KB. IndexedDB is for larger transactional data. Regarding security, XSS attacks can read anything in LocalStorage because it's accessible via JavaScript. Cookies are safer if we use HttpOnly, which blocks JS access.",
        durationSec: 145,
        fillerCount: 5,
        score: 8.0,
        critique: "Strong operational comparison. Good highlighting of JS access vulnerabilities in LocalStorage and cookie mitigation strategies.",
        strengths: ["Correct capacity limits", "Strong explanation of XSS risk"],
        improvements: ["Explicitly mention CSRF risk concerning cookies and how SameSite attributes mitigate it"]
      },
      {
        id: "r3",
        questionText: "Tell me about a complex state management problem you solved. Why did you choose that specific solution (e.g., Redux, Zustand, Context API, or Recoil) over others, and how did you organize it?",
        answerText: "In my last project, we had a nested dashboard with lots of sibling widgets communicating. We originally used Context API, but it, uh, caused massive re-rendering since everything subscribed to the same context context. I migrated us to Zustand. It's a lightweight store using a hooks-based approach. It solved the rendering issues because components could select exactly which slice of state to subscribe to. We structured stores by feature directories.",
        durationSec: 180,
        fillerCount: 6,
        score: 8.5,
        critique: "Great real-world scenario. Addressed performance drawbacks of Context API and outlined state modularization clearly.",
        strengths: ["Excellent comparison of Context vs Zustand", "Highlighted state slice subscription advantages"],
        improvements: ["Mention how store testing was configured or how state persistence was handled"]
      }
    ]
  },
  {
    id: "eval-2",
    roleTitle: "Backend Engineer",
    difficulty: "SENIOR",
    persona: "TECHNICAL",
    overallScore: 78,
    technicalScore: 8.0,
    communicationScore: 7.2,
    behavioralScore: 8.2,
    durationMin: 18,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    summary: "The candidate demonstrated solid technical acumen in senior systems architectures, detailing sharding and Saga patterns correctly. However, their vocal delivery was slightly hesitant with high filler word density, and they sometimes dove into technical implementation details before explaining the overall high-level structural goals.",
    actionableTips: [
      "Adopt a top-down explanation strategy: summarize the system architecture conceptually first, then drill down into sharding or transactional details.",
      "Work on conversational flow: reduce pauses and fillers which impact overall executive presence during technical presentations.",
      "Ensure Saga pattern failure cases are covered by explaining compensation rollbacks in detail."
    ],
    fillerWordMetrics: {
      totalFillerWords: 28,
      likeCount: 12,
      umCount: 9,
      uhCount: 5,
      soCount: 2,
      otherCount: 0
    },
    responses: []
  }
];
