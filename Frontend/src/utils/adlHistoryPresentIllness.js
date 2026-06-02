/** Section prompts shown above the combined HPI (A–C) textarea in ADL forms. */
export const ADL_HISTORY_PRESENT_ILLNESS_PROMPTS = [
  'A. Spontaneous narrative account',
  'B. Specific enquiry about mood, sleep, appetite, anxiety symptoms, suicidal risk, social interaction, job efficiency, personal hygiene, memory, etc.',
  'C. Intake of dependence producing and prescription drugs',
];

/**
 * Resolve combined HPI from API row (supports pre-migration column names).
 */
export const resolveHistoryPresentIllness = (data = {}) => {
  if (data.history_present_illness != null && String(data.history_present_illness).trim() !== '') {
    return String(data.history_present_illness);
  }
  const parts = [];
  if (data.history_narrative?.trim?.()) {
    parts.push(`${ADL_HISTORY_PRESENT_ILLNESS_PROMPTS[0]}\n${data.history_narrative.trim()}`);
  }
  if (data.history_specific_enquiry?.trim?.()) {
    parts.push(`${ADL_HISTORY_PRESENT_ILLNESS_PROMPTS[1]}\n${data.history_specific_enquiry.trim()}`);
  }
  if (data.history_drug_intake?.trim?.()) {
    parts.push(`${ADL_HISTORY_PRESENT_ILLNESS_PROMPTS[2]}\n${data.history_drug_intake.trim()}`);
  }
  return parts.join('\n\n');
};
