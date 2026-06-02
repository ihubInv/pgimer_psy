export const ADL_RELIGION_HISTORY_LABELS = [
  'Type of religion',
  'Participation in religious activities',
  'Changes in religious beliefs',
];

export const ADL_RELIGION_HISTORY_LABEL_LINE =
  ADL_RELIGION_HISTORY_LABELS.join(', ');

export const resolveReligionHistory = (data = {}) => {
  if (data.religion_history != null && String(data.religion_history).trim() !== '') {
    return String(data.religion_history);
  }
  const legacy = [
    ['religion_type', ADL_RELIGION_HISTORY_LABELS[0]],
    ['religion_participation', ADL_RELIGION_HISTORY_LABELS[1]],
    ['religion_changes', ADL_RELIGION_HISTORY_LABELS[2]],
  ];
  const parts = [];
  legacy.forEach(([key, label]) => {
    const val = data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};
