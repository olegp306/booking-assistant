const state = {
  availability: null,
  slots: [],
  leads: [],
  bookings: [],
  providerClients: [],
  leadInsights: {},
  providerCrm: null,
  providers: [],
  selectedProvider: null,
  selectedLeadId: null
};

const elements = {
  providerForm: document.querySelector("#providerForm"),
  providerName: document.querySelector("#providerName"),
  providerService: document.querySelector("#providerService"),
  providerBio: document.querySelector("#providerBio"),
  providerAvailability: document.querySelector("#providerAvailability"),
  providerPaymentMode: document.querySelector("#providerPaymentMode"),
  providerPrice: document.querySelector("#providerPrice"),
  providerSummary: document.querySelector("#providerSummary"),
  providerCrm: document.querySelector("#providerCrm"),
  providerError: document.querySelector("#providerError"),
  availabilityForm: document.querySelector("#availabilityForm"),
  availabilityInput: document.querySelector("#availabilityInput"),
  availabilitySummary: document.querySelector("#availabilitySummary"),
  availabilityError: document.querySelector("#availabilityError"),
  leadForm: document.querySelector("#leadForm"),
  leadName: document.querySelector("#leadName"),
  leadContact: document.querySelector("#leadContact"),
  leadTopic: document.querySelector("#leadTopic"),
  leadError: document.querySelector("#leadError"),
  selectedLeadLabel: document.querySelector("#selectedLeadLabel"),
  refreshButton: document.querySelector("#refreshButton"),
  slots: document.querySelector("#slots"),
  leads: document.querySelector("#leads"),
  bookings: document.querySelector("#bookings"),
  providerClients: document.querySelector("#providerClients")
};

elements.refreshButton.addEventListener("click", () => loadState());
elements.providerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.providerError.textContent = "";

  const response = await fetch("/api/providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramUserId: `admin-${Date.now()}`,
      displayName: elements.providerName.value,
      serviceName: elements.providerService.value,
      bio: elements.providerBio.value,
      availabilityText: elements.providerAvailability.value,
      confirmationMode: "manual",
      paymentMode: elements.providerPaymentMode.value,
      priceMinor: parsePriceMinor(elements.providerPrice.value),
      currency: "EUR",
      platformFeeBps: elements.providerPaymentMode.value === "none" ? 0 : 500,
      usageNotificationsConsent: true,
      marketingConsent: false
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    elements.providerError.textContent = payload.error;
    return;
  }

  elements.providerForm.reset();
  await loadState(payload.provider.slug);
});

elements.leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.leadError.textContent = "";

  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: elements.leadName.value,
      contact: elements.leadContact.value,
      topic: elements.leadTopic.value,
      source: "manual",
      provider: state.selectedProvider?.slug ?? "default"
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    elements.leadError.textContent = payload.error;
    return;
  }

  state.selectedLeadId = payload.lead.id;
  elements.leadForm.reset();
  await loadState();
});

elements.availabilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.availabilityError.textContent = "";

  const response = await fetch("/api/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: elements.availabilityInput.value,
      provider: state.selectedProvider?.slug ?? "default"
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    elements.availabilityError.textContent = payload.error;
    return;
  }

  await loadState();
});

async function loadState(providerSlug = state.selectedProvider?.slug ?? "default") {
  const response = await fetch(`/api/state?provider=${encodeURIComponent(providerSlug)}`);
  const payload = await response.json();
  Object.assign(state, payload);
  if (!state.selectedLeadId && state.leads.length > 0) {
    state.selectedLeadId = state.leads[0].id;
  }
  render();
}

function render() {
  const selectedLead = state.leads.find((lead) => lead.id === state.selectedLeadId);
  const shareLink = state.selectedProvider ? `https://t.me/slotly_ai_bot?start=${state.selectedProvider.slug}` : "";
  elements.providerSummary.textContent = state.selectedProvider
    ? `${state.selectedProvider.displayName} | ${state.selectedProvider.serviceName} | ${shareLink}`
    : "No provider selected";
  elements.providerCrm.innerHTML = state.providerCrm
    ? [
        `<span class="pill">${state.providerCrm.bookingCount} bookings</span>`,
        `<span class="pill">${escapeHtml(state.providerCrm.plan)} / ${escapeHtml(state.providerCrm.billingStatus)}</span>`,
        `<span class="pill">${escapeHtml(state.selectedProvider.paymentMode)} ${formatPrice(state.selectedProvider)}</span>`,
        `<span class="pill">upgrade: ${state.providerCrm.upgradePromptAllowed ? "yes" : "no"}</span>`,
        `<span class="pill">marketing: ${state.providerCrm.marketingAllowed ? "yes" : "no"}</span>`
      ].join("")
    : "";
  elements.availabilityInput.value = state.availability.originalText;
  elements.availabilitySummary.textContent = `${state.availability.rules.length} weekly windows in ${state.availability.timezone}`;
  elements.selectedLeadLabel.textContent = selectedLead ? `Selected: ${selectedLead.name}` : "No lead selected";
  elements.slots.innerHTML = renderList(
    state.slots.slice(0, 8),
    (slot) => `
      <div class="item">
        <strong>${slot.label}</strong>
        <span class="meta">${slot.start}</span>
        <div class="item-actions">
          <button type="button" data-book-start="${slot.start}" data-book-end="${slot.end}">Book</button>
        </div>
      </div>
    `,
    "No open slots"
  );
  elements.leads.innerHTML = renderList(state.leads, renderLead, "No leads yet");
  elements.bookings.innerHTML = renderList(
    state.bookings,
    (booking) => `
      <div class="item">
        <strong>${new Date(booking.start).toLocaleString()}</strong>
        <span class="meta">${booking.status}</span>
      </div>
    `,
    "No bookings yet"
  );
  elements.providerClients.innerHTML = renderList(
    state.providerClients,
    (client) => `
      <div class="item">
        <strong>${escapeHtml(client.displayName)}</strong>
        <div class="meta">${escapeHtml(client.status)} | ${escapeHtml(client.source)}</div>
        <div class="insight-row">
          <span class="pill">${escapeHtml(client.pricePreview.reason)}</span>
          <span class="pill">${formatMinorPrice(client.pricePreview.amountMinor, client.pricePreview.currency)}</span>
        </div>
      </div>
    `,
    "No clients yet"
  );
  bindDynamicActions();
}

function renderLead(lead) {
  const insight = state.leadInsights[lead.id];
  const missing = insight?.missingFields?.length ? `missing: ${insight.missingFields.join(", ")}` : "complete";
  const temperature = insight?.temperature ?? "unknown";
  const contactKind = insight?.contactKind ?? "unknown";

  return `
    <div class="item">
      <strong>${escapeHtml(lead.name)}</strong>
      <div>${escapeHtml(lead.topic)}</div>
      <div class="meta">${escapeHtml(lead.contact)} | ${lead.exportStatus}</div>
      <div class="insight-row">
        <span class="pill">${escapeHtml(contactKind)}</span>
        <span class="pill">${escapeHtml(temperature)}</span>
        <span class="pill">${escapeHtml(missing)}</span>
      </div>
      <div class="item-actions">
        <button class="secondary-button" type="button" data-select-lead="${lead.id}">Select</button>
      </div>
    </div>
  `;
}

function renderList(items, renderItem, emptyText) {
  if (!items.length) {
    return `<div class="empty">${emptyText}</div>`;
  }
  return items.map(renderItem).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parsePriceMinor(value) {
  const amount = Number(String(value).replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatPrice(provider) {
  if (!provider || provider.paymentMode === "none") {
    return "";
  }
  return `${(provider.priceMinor / 100).toFixed(2)} ${provider.currency}`;
}

function formatMinorPrice(amountMinor, currency) {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

function bindDynamicActions() {
  document.querySelectorAll("[data-select-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLeadId = button.dataset.selectLead;
      render();
    });
  });

  document.querySelectorAll("[data-book-start]").forEach((button) => {
    button.addEventListener("click", async () => {
      elements.leadError.textContent = "";
      if (!state.selectedLeadId) {
        elements.leadError.textContent = "Create or select a lead first.";
        return;
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: state.selectedLeadId,
          start: button.dataset.bookStart,
          end: button.dataset.bookEnd,
          provider: state.selectedProvider?.slug ?? "default"
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        elements.leadError.textContent = payload.error;
        return;
      }

      await loadState();
    });
  });
}

void loadState();
