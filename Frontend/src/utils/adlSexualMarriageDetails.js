export const ADL_SEXUAL_MARRIAGE_DETAILS_LABELS = [
  'Spouse age',
  'Spouse occupation',
  'General adjustment',
  'Sexual adjustment',
  'Sexual problems',
];

export const ADL_SEXUAL_MARRIAGE_DETAILS_LABEL_LINE =
  ADL_SEXUAL_MARRIAGE_DETAILS_LABELS.join(', ');

export const resolveSexualMarriageDetails = (data = {}) => {
  if (data.sexual_marriage_details != null && String(data.sexual_marriage_details).trim() !== '') {
    return String(data.sexual_marriage_details);
  }
  const legacy = [
    ['sexual_spouse_age', ADL_SEXUAL_MARRIAGE_DETAILS_LABELS[0]],
    ['sexual_spouse_occupation', ADL_SEXUAL_MARRIAGE_DETAILS_LABELS[1]],
    ['sexual_adjustment_general', ADL_SEXUAL_MARRIAGE_DETAILS_LABELS[2]],
    ['sexual_adjustment_sexual', ADL_SEXUAL_MARRIAGE_DETAILS_LABELS[3]],
    ['sexual_problems', ADL_SEXUAL_MARRIAGE_DETAILS_LABELS[4]],
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
