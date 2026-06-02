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

export const ADL_PHYSICAL_CVS_LABELS = [
  'Apex',
  'Regularity',
  'Heart sounds',
  'Murmurs',
];

export const ADL_PHYSICAL_CVS_LABEL_LINE = ADL_PHYSICAL_CVS_LABELS.join(', ');

export const resolvePhysicalCvsExamination = (data = {}) =>
  mergeLegacyFields(data, 'physical_cvs_examination', [
    ['physical_cvs_apex', ADL_PHYSICAL_CVS_LABELS[0]],
    ['physical_cvs_regularity', ADL_PHYSICAL_CVS_LABELS[1]],
    ['physical_cvs_heart_sounds', ADL_PHYSICAL_CVS_LABELS[2]],
    ['physical_cvs_murmurs', ADL_PHYSICAL_CVS_LABELS[3]],
  ]);

export const ADL_PHYSICAL_CHEST_LABELS = [
  'Chest expansion',
  'Percussion',
  'Adventitious sounds',
];

export const ADL_PHYSICAL_CHEST_LABEL_LINE = ADL_PHYSICAL_CHEST_LABELS.join(', ');

export const resolvePhysicalChestExamination = (data = {}) =>
  mergeLegacyFields(data, 'physical_chest_examination', [
    ['physical_chest_expansion', ADL_PHYSICAL_CHEST_LABELS[0]],
    ['physical_chest_percussion', ADL_PHYSICAL_CHEST_LABELS[1]],
    ['physical_chest_adventitious', ADL_PHYSICAL_CHEST_LABELS[2]],
  ]);

export const ADL_PHYSICAL_ABDOMEN_LABELS = [
  'Tenderness',
  'Mass',
  'Bowel sounds',
];

export const ADL_PHYSICAL_ABDOMEN_LABEL_LINE = ADL_PHYSICAL_ABDOMEN_LABELS.join(', ');

export const resolvePhysicalAbdomenExamination = (data = {}) =>
  mergeLegacyFields(data, 'physical_abdomen_examination', [
    ['physical_abdomen_tenderness', ADL_PHYSICAL_ABDOMEN_LABELS[0]],
    ['physical_abdomen_mass', ADL_PHYSICAL_ABDOMEN_LABELS[1]],
    ['physical_abdomen_bowel_sounds', ADL_PHYSICAL_ABDOMEN_LABELS[2]],
  ]);
