/** Labels for combined B. Psychiatric field (comma-separated in UI). */
export const ADL_PAST_HISTORY_PSYCHIATRIC_LABELS = [
  'Diagnosis or salient features',
  'Treatment',
  'Interim history of previous psychiatric illness',
  'Specific enquiry into completeness of recovery and socialization/personal care in the interim period',
];

export const ADL_PAST_HISTORY_PSYCHIATRIC_LABEL_LINE =
  ADL_PAST_HISTORY_PSYCHIATRIC_LABELS.join(', ');

/** Resolve combined psychiatric past history (supports pre-migration columns). */
export const resolvePastHistoryPsychiatric = (data = {}) => {
  if (data.past_history_psychiatric != null && String(data.past_history_psychiatric).trim() !== '') {
    return String(data.past_history_psychiatric);
  }
  const parts = [];
  const legacy = [
    ['past_history_psychiatric_diagnosis', ADL_PAST_HISTORY_PSYCHIATRIC_LABELS[0]],
    ['past_history_psychiatric_treatment', ADL_PAST_HISTORY_PSYCHIATRIC_LABELS[1]],
    ['past_history_psychiatric_interim', ADL_PAST_HISTORY_PSYCHIATRIC_LABELS[2]],
    ['past_history_psychiatric_recovery', ADL_PAST_HISTORY_PSYCHIATRIC_LABELS[3]],
  ];
  legacy.forEach(([key, label]) => {
    const val = data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};
