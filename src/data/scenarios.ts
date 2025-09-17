export interface Scenario {
  id: string;
  title: string;
  description: string;
  persona: {
    name: string;
    age: number;
    condition: string;
    personality: string[];
    background: string;
  };
  objectives: string[];
  challenges: string[];
  triggerPhrases: string[];
  responses: {
    greeting: string;
    confused: string[];
    agitated: string[];
    sad: string[];
    cooperative: string[];
  };
}

export const scenarios: Scenario[] = [
  {
    id: 'mild-dementia',
    title: 'Mild Dementia Support',
    description: 'Practice communication with someone experiencing mild cognitive decline',
    persona: {
      name: 'Margaret',
      age: 78,
      condition: 'Mild Dementia',
      personality: ['gentle', 'sometimes confused', 'formerly independent'],
      background: 'Retired teacher who lives alone, family visits weekly'
    },
    objectives: [
      'Maintain dignity and respect',
      'Practice redirection techniques',
      'Build trust through patient listening'
    ],
    challenges: [
      'Repetitive questions',
      'Confusion about time/place',
      'Resistance to help'
    ],
    triggerPhrases: [
      'Where am I?',
      'When is my daughter coming?',
      'I need to go home',
      'I can do it myself'
    ],
    responses: {
      greeting: "Hello dear, it's nice to see you. I was just thinking about my garden...",
      confused: [
        "I'm not sure where I put my keys... have you seen them?",
        "What day is it today? I feel like I've lost track of time.",
        "This place looks familiar but different somehow..."
      ],
      agitated: [
        "I don't need help! I've been taking care of myself for years!",
        "Why won't anyone listen to me? I know what I'm talking about!",
        "I want to go home right now. This isn't my house!"
      ],
      sad: [
        "I miss my husband... sometimes I forget he's gone.",
        "I feel so useless. I used to be able to do everything.",
        "My memory isn't what it used to be, and it frightens me."
      ],
      cooperative: [
        "Thank you for being so patient with me.",
        "Could you help me remember how to work this?",
        "I appreciate you taking the time to explain that."
      ]
    }
  },
  {
    id: 'diabetes-management',
    title: 'Diabetes Care Support',
    description: 'Help with medication reminders and lifestyle discussions',
    persona: {
      name: 'Robert',
      age: 72,
      condition: 'Type 2 Diabetes',
      personality: ['stubborn', 'independent', 'worried about burden'],
      background: 'Retired mechanic, recently diagnosed, lives with adult son'
    },
    objectives: [
      'Encourage medication compliance',
      'Discuss dietary concerns',
      'Address fears about the condition'
    ],
    challenges: [
      'Resistance to dietary changes',
      'Forgetting medications',
      'Fear of being a burden'
    ],
    triggerPhrases: [
      'Do I really need to take all these pills?',
      'I feel fine, why change my diet?',
      'I don\'t want to be a bother',
      'This is all too complicated'
    ],
    responses: {
      greeting: "Oh, hello there. I was just sorting out these pill bottles... there are so many of them now.",
      confused: [
        "The doctor gave me all these instructions but I'm not sure I understand them all.",
        "Should I take the insulin before or after eating? I keep getting mixed up.",
        "These blood sugar numbers - what do they all mean?"
      ],
      agitated: [
        "I've eaten what I wanted for 72 years and I'm still here!",
        "Why should I stick myself with needles every day?",
        "I don't want to be treated like a child who can't make decisions!"
      ],
      sad: [
        "I feel like such a burden on my family with all this medical stuff.",
        "I'm scared about what this diabetes might do to me.",
        "I miss being able to eat normally without worrying about every bite."
      ],
      cooperative: [
        "I want to stay healthy for my family. What should I focus on?",
        "Could you help me understand how to check my blood sugar properly?",
        "I'm willing to try new recipes if you think they'll help."
      ]
    }
  },
  {
    id: 'mobility-assistance',
    title: 'Mobility and Safety',
    description: 'Support with walking aids and fall prevention',
    persona: {
      name: 'Eleanor',
      age: 83,
      condition: 'Mobility Issues',
      personality: ['proud', 'safety-conscious', 'socially active'],
      background: 'Former nurse, uses a walker, afraid of falling'
    },
    objectives: [
      'Encourage safe mobility practices',
      'Build confidence in using aids',
      'Maintain social connections'
    ],
    challenges: [
      'Pride about independence',
      'Fear of falling',
      'Social isolation concerns'
    ],
    triggerPhrases: [
      'I don\'t need that walker',
      'I\'m afraid I might fall',
      'I don\'t want to go out anymore',
      'People will stare at me'
    ],
    responses: {
      greeting: "Hello! I was just thinking about whether I should go to the community center today...",
      confused: [
        "Should I use the walker for short distances too, or just long ones?",
        "I'm not sure if these grab bars are installed correctly.",
        "The physical therapist said something about exercises, but I forget which ones."
      ],
      agitated: [
        "I hate looking helpless in front of everyone!",
        "This walker makes me feel like I'm ancient!",
        "I don't need someone hovering over me all the time!"
      ],
      sad: [
        "I used to dance every week, and now I can barely walk to the mailbox.",
        "I feel like I'm becoming a prisoner in my own home.",
        "My friends don't invite me places anymore because they think I can't manage."
      ],
      cooperative: [
        "I know you're right about safety. What would you recommend?",
        "Could you show me the best way to use this walker on stairs?",
        "I want to stay active. What activities would be safe for me?"
      ]
    }
  }
];

export const getScenarioById = (id: string): Scenario | undefined => {
  return scenarios.find(scenario => scenario.id === id);
};

export const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};