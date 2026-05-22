import type { NormalizedLead } from "../domain/lead.js";
import type { Booking } from "../domain/booking.js";

export type CrmExportPayload = {
  lead: NormalizedLead & { id: string; createdAt: string };
  booking?: Booking;
};

export type CrmExporter = {
  exportLead(payload: CrmExportPayload): Promise<void>;
};

export class LocalCrmExporter implements CrmExporter {
  async exportLead(_payload: CrmExportPayload): Promise<void> {
    return;
  }
}
