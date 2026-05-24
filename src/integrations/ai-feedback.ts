import { classifyFeedbackText, type FeedbackItem } from "../domain/feedback.js";

export type AiFeedbackClassifierInput = {
  messageText: string;
  conversationFlow: FeedbackItem["conversationFlow"];
  screenOrStep: string;
  serviceName?: string;
};

export type AiFeedbackClassification = Pick<FeedbackItem, "category" | "sentiment" | "priority" | "summary">;

export async function classifyFeedbackWithAi(input: AiFeedbackClassifierInput): Promise<AiFeedbackClassification> {
  if (!process.env.OPENAI_API_KEY) {
    return classifyFeedbackText(input.messageText);
  }

  // The production AI call intentionally lives behind this narrow boundary.
  // Until prompt/schema hardening is added, deterministic classification remains the safe fallback.
  return classifyFeedbackText(input.messageText);
}
