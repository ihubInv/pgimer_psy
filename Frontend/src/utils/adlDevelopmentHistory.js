export const ADL_DEVELOPMENT_HISTORY_LABELS = [
  'Weaning age',
  'First words',
  'Three words sentences',
  'Walking age',
  'Neurotic traits',
  'Nail biting',
  'Bedwetting',
  'Phobias',
  'Childhood illness',
];

export const ADL_DEVELOPMENT_HISTORY_LABEL_LINE =
  ADL_DEVELOPMENT_HISTORY_LABELS.join(', ');

export const resolveDevelopmentHistory = (data = {}) => {
  if (data.development_history != null && String(data.development_history).trim() !== '') {
    return String(data.development_history);
  }
  const legacy = [
    ['development_weaning_age', ADL_DEVELOPMENT_HISTORY_LABELS[0]],
    ['development_first_words', ADL_DEVELOPMENT_HISTORY_LABELS[1]],
    ['development_three_words', ADL_DEVELOPMENT_HISTORY_LABELS[2]],
    ['development_walking', ADL_DEVELOPMENT_HISTORY_LABELS[3]],
    ['development_neurotic_traits', ADL_DEVELOPMENT_HISTORY_LABELS[4]],
    ['development_nail_biting', ADL_DEVELOPMENT_HISTORY_LABELS[5]],
    ['development_bedwetting', ADL_DEVELOPMENT_HISTORY_LABELS[6]],
    ['development_phobias', ADL_DEVELOPMENT_HISTORY_LABELS[7]],
    ['development_childhood_illness', ADL_DEVELOPMENT_HISTORY_LABELS[8]],
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
