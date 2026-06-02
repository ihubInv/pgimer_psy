export const ADL_LIVING_SITUATION_HISTORY_LABELS = [
  'Income sharing arrangements',
  'Expenses',
  'Kitchen arrangements',
  'Domestic conflicts',
  'Social class',
];

export const ADL_LIVING_SITUATION_HISTORY_LABEL_LINE =
  ADL_LIVING_SITUATION_HISTORY_LABELS.join(', ');

export const resolveLivingSituationHistory = (data = {}) => {
  if (data.living_situation_history != null && String(data.living_situation_history).trim() !== '') {
    return String(data.living_situation_history);
  }
  const legacy = [
    ['living_income_sharing', ADL_LIVING_SITUATION_HISTORY_LABELS[0]],
    ['living_expenses', ADL_LIVING_SITUATION_HISTORY_LABELS[1]],
    ['living_kitchen', ADL_LIVING_SITUATION_HISTORY_LABELS[2]],
    ['living_domestic_conflicts', ADL_LIVING_SITUATION_HISTORY_LABELS[3]],
    ['living_social_class', ADL_LIVING_SITUATION_HISTORY_LABELS[4]],
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
