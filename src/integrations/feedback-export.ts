import type { FeedbackItem } from "../domain/feedback.js";

export type FeedbackExporter = {
  exportFeedback: (feedback: FeedbackItem) => Promise<void>;
};

export class LocalFeedbackExporter implements FeedbackExporter {
  async exportFeedback(): Promise<void> {
    return undefined;
  }
}
