export const ADL_EDUCATION_HISTORY_LABELS = [
  'Age at start of education',
  'Highest class passed',
  'Performance',
  'Disciplinary problems',
  'Peer relationships',
  'Hobbies and interests',
  'Special abilities',
  'Reason for discontinuing education',
];

export const ADL_EDUCATION_HISTORY_LABEL_LINE =
  ADL_EDUCATION_HISTORY_LABELS.join(', ');

export const resolveEducationHistory = (data = {}) => {
  if (data.education_history != null && String(data.education_history).trim() !== '') {
    return String(data.education_history);
  }
  const legacy = [
    ['education_start_age', ADL_EDUCATION_HISTORY_LABELS[0]],
    ['education_highest_class', ADL_EDUCATION_HISTORY_LABELS[1]],
    ['education_performance', ADL_EDUCATION_HISTORY_LABELS[2]],
    ['education_disciplinary', ADL_EDUCATION_HISTORY_LABELS[3]],
    ['education_peer_relationship', ADL_EDUCATION_HISTORY_LABELS[4]],
    ['education_hobbies', ADL_EDUCATION_HISTORY_LABELS[5]],
    ['education_special_abilities', ADL_EDUCATION_HISTORY_LABELS[6]],
    ['education_discontinue_reason', ADL_EDUCATION_HISTORY_LABELS[7]],
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
