import { randomUUID } from "node:crypto";

export type FeedbackCategory =
  | "feature_request"
  | "bug_report"
  | "support_issue"
  | "pricing_feedback"
  | "usability_confusion"
  | "cancellation_reason"
  | "other";

export type FeedbackSentiment = "positive" | "neutral" | "negative";
export type FeedbackPriority = "low" | "medium" | "high";
export type FeedbackStatus = "new" | "triaged" | "planned" | "shipped" | "closed";
export type FeedbackConversationFlow =
  | "client_booking"
  | "specialist_onboarding"
  | "availability_setup"
  | "event_registration"
  | "payment"
  | "cancellation"
  | "unknown";

export type FeedbackItem = {
  id: string;
  appVersion: string;
  botUsername?: string;
  telegramUserId?: string;
  providerId?: string;
  leadId?: string;
  conversationFlow: FeedbackConversationFlow;
  screenOrStep: string;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  priority: FeedbackPriority;
  messageText: string;
  summary: string;
  status: FeedbackStatus;
  createdAt: string;
};

export function classifyFeedbackText(text: string): Pick<FeedbackItem, "category" | "sentiment" | "priority" | "summary"> {
  const cleanText = normalizeText(text);
  const lower = cleanText.toLowerCase();
  const matched = (pattern: RegExp) => pattern.test(lower);

  if (matched(/не работает|ошибка|сломал|сломалось|bug|broken|error|does not work/)) {
    return classified("bug_report", "negative", "high", cleanText);
  }
  if (matched(/хочу|добавьте|сделайте|было бы удобно|можно.*добавить|feature|please add|would be useful|i want/)) {
    return classified("feature_request", "positive", "medium", cleanText);
  }
  if (matched(/дорого|оплат|подписк|тариф|цена|price|payment|subscription|expensive/)) {
    return classified("pricing_feedback", "negative", "medium", cleanText);
  }
  if (matched(/не понимаю|куда нажать|как.*найти|непонятно|confus|where.*click|how.*click/)) {
    return classified("usability_confusion", "negative", "medium", cleanText);
  }
  if (matched(/отмен|не приду|cancel|refund|return money/)) {
    return classified("cancellation_reason", "negative", "medium", cleanText);
  }
  if (matched(/помогите|вопрос|support|help/)) {
    return classified("support_issue", "neutral", "medium", cleanText);
  }
  return classified("other", "neutral", "low", cleanText);
}

export function shouldCaptureFeedback(text: string): boolean {
  return classifyFeedbackText(text).category !== "other";
}

export function createFeedbackItem(input: {
  appVersion: string;
  botUsername?: string;
  telegramUserId?: string;
  providerId?: string;
  leadId?: string;
  conversationFlow?: FeedbackConversationFlow;
  screenOrStep?: string;
  messageText: string;
  now?: Date;
}): FeedbackItem {
  const messageText = normalizeText(input.messageText);
  if (!messageText) {
    throw new Error("Feedback text is required.");
  }
  const classification = classifyFeedbackText(messageText);
  return {
    id: `feedback-${randomUUID()}`,
    appVersion: input.appVersion.trim() || "0.0.0",
    botUsername: cleanOptional(input.botUsername),
    telegramUserId: cleanOptional(input.telegramUserId),
    providerId: cleanOptional(input.providerId),
    leadId: cleanOptional(input.leadId),
    conversationFlow: input.conversationFlow ?? "unknown",
    screenOrStep: input.screenOrStep?.trim() || "unknown",
    category: classification.category,
    sentiment: classification.sentiment,
    priority: classification.priority,
    messageText,
    summary: classification.summary,
    status: "new",
    createdAt: (input.now ?? new Date()).toISOString()
  };
}

function classified(
  category: FeedbackCategory,
  sentiment: FeedbackSentiment,
  priority: FeedbackPriority,
  text: string
): Pick<FeedbackItem, "category" | "sentiment" | "priority" | "summary"> {
  return { category, sentiment, priority, summary: summarize(text) };
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function summarize(text: string): string {
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
