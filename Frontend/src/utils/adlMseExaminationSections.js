const mergeLegacyFields = (data, columnKey, legacyPairs) => {
  if (data[columnKey] != null && String(data[columnKey]).trim() !== '') {
    return String(data[columnKey]);
  }
  const parts = [];
  legacyPairs.forEach(([key, label]) => {
    const val = data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};

export const ADL_MSE_GENERAL_LABELS = [
  'Demeanour',
  'Tidy/Unkempt',
  'Awareness',
  'Cooperation',
];

export const ADL_MSE_GENERAL_LABEL_LINE = ADL_MSE_GENERAL_LABELS.join(', ');

export const resolveMseGeneralExamination = (data = {}) =>
  mergeLegacyFields(data, 'mse_general_examination', [
    ['mse_general_demeanour', ADL_MSE_GENERAL_LABELS[0]],
    ['mse_general_tidy', ADL_MSE_GENERAL_LABELS[1]],
    ['mse_general_awareness', ADL_MSE_GENERAL_LABELS[2]],
    ['mse_general_cooperation', ADL_MSE_GENERAL_LABELS[3]],
  ]);

export const ADL_MSE_PSYCHOMOTOR_LABELS = [
  'Verbalization',
  'Pressure of activity',
  'Tension',
  'Posture',
  'Mannerism/Stereotypy',
  'Catatonic features',
];

export const ADL_MSE_PSYCHOMOTOR_LABEL_LINE = ADL_MSE_PSYCHOMOTOR_LABELS.join(', ');

export const resolveMsePsychomotorExamination = (data = {}) =>
  mergeLegacyFields(data, 'mse_psychomotor_examination', [
    ['mse_psychomotor_verbalization', ADL_MSE_PSYCHOMOTOR_LABELS[0]],
    ['mse_psychomotor_pressure', ADL_MSE_PSYCHOMOTOR_LABELS[1]],
    ['mse_psychomotor_tension', ADL_MSE_PSYCHOMOTOR_LABELS[2]],
    ['mse_psychomotor_posture', ADL_MSE_PSYCHOMOTOR_LABELS[3]],
    ['mse_psychomotor_mannerism', ADL_MSE_PSYCHOMOTOR_LABELS[4]],
    ['mse_psychomotor_catatonic', ADL_MSE_PSYCHOMOTOR_LABELS[5]],
  ]);

export const ADL_MSE_AFFECT_LABELS = [
  'Subjective feeling/Objective Feeling',
  'Tone',
  'Resting expression',
  'Fluctuation',
];

export const ADL_MSE_AFFECT_LABEL_LINE = ADL_MSE_AFFECT_LABELS.join(', ');

export const resolveMseAffectExamination = (data = {}) =>
  mergeLegacyFields(data, 'mse_affect_examination', [
    ['mse_affect_subjective', ADL_MSE_AFFECT_LABELS[0]],
    ['mse_affect_tone', ADL_MSE_AFFECT_LABELS[1]],
    ['mse_affect_resting', ADL_MSE_AFFECT_LABELS[2]],
    ['mse_affect_fluctuation', ADL_MSE_AFFECT_LABELS[3]],
  ]);
