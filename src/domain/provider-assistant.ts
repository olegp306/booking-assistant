import { randomUUID } from "node:crypto";

export type ProviderAssistantCategory = "fitness" | "therapy" | "beauty" | "education" | "consulting" | "generic";

export type ProviderAssistantFaq = {
  id: string;
  providerId: string;
  category: ProviderAssistantCategory;
  position: number;
  question: string;
  answer: string;
  createdAt: string;
};

const categoryMatchers: Array<{ category: ProviderAssistantCategory; pattern: RegExp }> = [
  { category: "fitness", pattern: /фитнес|тренер|спорт|растяж|кроссфит|йога|пилатес|workout|fitness|trainer|stretch|gym/i },
  { category: "therapy", pattern: /психолог|психотерап|терап|коуч|тревог|therapy|psycholog|coach/i },
  { category: "beauty", pattern: /ресниц|ногт|маникюр|депиляц|бров|космет|beauty|nail|lash|wax/i },
  { category: "education", pattern: /преподав|урок|вокал|язык|репетитор|teacher|lesson|vocal|sing/i },
  { category: "consulting", pattern: /консультац|бизнес|ai|маркетинг|стратег|consult|strategy|business/i }
];

const russianQuestions: Record<ProviderAssistantCategory, string[]> = {
  fitness: [
    "Как клиенту подготовиться к первой тренировке с вами?",
    "Что взять с собой на занятие?",
    "Какая одежда и обувь подойдут?",
    "Нужно ли есть до занятия, и за сколько времени?",
    "О каких ограничениях по здоровью вам важно знать заранее?"
  ],
  therapy: [
    "Как человеку подготовиться к первой консультации с вами?",
    "Нужно ли заранее сформулировать запрос?",
    "Как обычно проходит первая встреча?",
    "Что делать, если человеку тревожно перед встречей?",
    "О каких темах или состояниях вам важно знать заранее?"
  ],
  beauty: [
    "Как подготовиться к процедуре?",
    "Что нельзя делать до процедуры?",
    "Что нельзя делать после процедуры?",
    "Есть ли противопоказания или ситуации, когда процедуру лучше перенести?",
    "Сколько времени клиенту лучше заложить на процедуру и восстановление?"
  ],
  education: [
    "Как подготовиться к первому занятию?",
    "Что взять с собой или подготовить заранее?",
    "Нужно ли выполнить небольшое задание до встречи?",
    "Как проходит первое занятие?",
    "О каком уровне или опыте клиента вам важно знать заранее?"
  ],
  consulting: [
    "Как подготовиться к первой консультации?",
    "Какие материалы или ссылки лучше прислать заранее?",
    "Какой результат клиенту стоит сформулировать перед встречей?",
    "Как обычно проходит первая консультация?",
    "О каких ограничениях, сроках или контексте вам важно знать заранее?"
  ],
  generic: [
    "Как клиенту подготовиться к первой встрече с вами?",
    "Что взять с собой или подготовить заранее?",
    "Как обычно проходит первая встреча?",
    "Что важно знать до записи?",
    "Какие частые вопросы клиенты задают перед встречей?"
  ]
};

const englishQuestions: Record<ProviderAssistantCategory, string[]> = {
  fitness: [
    "How should a client prepare for the first training session with you?",
    "What should they bring?",
    "What clothes and shoes work best?",
    "Should they eat before the session, and how long before?",
    "What health limitations should they tell you about in advance?"
  ],
  therapy: [
    "How should a client prepare for the first consultation with you?",
    "Should they formulate a request in advance?",
    "How does the first session usually work?",
    "What should they do if they feel anxious before the session?",
    "What topics or states should they tell you about in advance?"
  ],
  beauty: [
    "How should a client prepare for the procedure?",
    "What should they avoid before the procedure?",
    "What should they avoid after the procedure?",
    "Are there contraindications or reasons to reschedule?",
    "How much time should they reserve for the procedure and aftercare?"
  ],
  education: [
    "How should a client prepare for the first lesson?",
    "What should they bring or prepare in advance?",
    "Should they do a small task before the lesson?",
    "How does the first lesson usually work?",
    "What level or experience should they tell you about in advance?"
  ],
  consulting: [
    "How should a client prepare for the first consultation?",
    "What materials or links should they send in advance?",
    "What outcome should they formulate before the meeting?",
    "How does the first consultation usually work?",
    "What constraints, deadlines, or context should they tell you about?"
  ],
  generic: [
    "How should a client prepare for the first meeting with you?",
    "What should they bring or prepare in advance?",
    "How does the first meeting usually work?",
    "What is important to know before booking?",
    "What common questions do clients ask before the meeting?"
  ]
};

export function detectProviderAssistantCategory(serviceText: string): ProviderAssistantCategory {
  const text = serviceText.trim();
  return categoryMatchers.find((item) => item.pattern.test(text))?.category ?? "generic";
}

export function getPreparationQuestions(category: ProviderAssistantCategory, language: "ru" | "en" = "ru"): string[] {
  return [...(language === "ru" ? russianQuestions[category] : englishQuestions[category])];
}

export function buildProviderAssistantFaqs(input: {
  providerId: string;
  serviceText: string;
  answers: string[];
  language?: "ru" | "en";
  now?: Date;
}): ProviderAssistantFaq[] {
  const providerId = input.providerId.trim();
  if (!providerId) {
    throw new Error("Provider is required.");
  }

  const category = detectProviderAssistantCategory(input.serviceText);
  const questions = getPreparationQuestions(category, input.language ?? "ru");
  const createdAt = (input.now ?? new Date()).toISOString();

  return input.answers
    .map((answer, position) => ({
      id: `provider-faq-${randomUUID()}`,
      providerId,
      category,
      position,
      question: questions[position] ?? questions.at(-1) ?? "",
      answer: answer.trim().replace(/\s+/g, " "),
      createdAt
    }))
    .filter((faq) => faq.answer.length > 0);
}
