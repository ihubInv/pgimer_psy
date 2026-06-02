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

export const ADL_MSE_INSIGHT_LABELS = [
  'Understanding of illness',
  'Judgement',
];

export const ADL_MSE_INSIGHT_LABEL_LINE = ADL_MSE_INSIGHT_LABELS.join(', ');

export const resolveMseInsightExamination = (data = {}) =>
  mergeLegacyFields(data, 'mse_insight_examination', [
    ['mse_insight_understanding', ADL_MSE_INSIGHT_LABELS[0]],
    ['mse_insight_judgement', ADL_MSE_INSIGHT_LABELS[1]],
  ]);

export const ADL_DIAGNOSTIC_FORMULATION_LABELS = [
  'Brief clinical summary',
  'Salient features supporting diagnosis',
  'Psychodynamic formulation',
];

export const ADL_DIAGNOSTIC_FORMULATION_LABEL_LINE =
  ADL_DIAGNOSTIC_FORMULATION_LABELS.join(', ');

export const resolveDiagnosticFormulationHistory = (data = {}) =>
  mergeLegacyFields(data, 'diagnostic_formulation_history', [
    ['diagnostic_formulation_summary', ADL_DIAGNOSTIC_FORMULATION_LABELS[0]],
    ['diagnostic_formulation_features', ADL_DIAGNOSTIC_FORMULATION_LABELS[1]],
    ['diagnostic_formulation_psychodynamic', ADL_DIAGNOSTIC_FORMULATION_LABELS[2]],
  ]);

export const ADL_FINAL_ASSESSMENT_LABELS = [
  'Provisional Diagnosis',
  'Treatment Plan',
  'Consultant Comments',
];

export const ADL_FINAL_ASSESSMENT_LABEL_LINE = ADL_FINAL_ASSESSMENT_LABELS.join(', ');

export const resolveFinalAssessmentHistory = (data = {}) =>
  mergeLegacyFields(data, 'final_assessment_history', [
    ['provisional_diagnosis', ADL_FINAL_ASSESSMENT_LABELS[0]],
    ['treatment_plan', ADL_FINAL_ASSESSMENT_LABELS[1]],
    ['consultant_comments', ADL_FINAL_ASSESSMENT_LABELS[2]],
  ]);
