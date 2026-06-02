export const ADL_GENERAL_HOME_SITUATION_LABELS = [
  'Description of childhood home situation',
  "Parents' relationship",
  'Socioeconomic status',
  'Interpersonal relationships',
];

export const ADL_GENERAL_HOME_SITUATION_LABEL_LINE =
  ADL_GENERAL_HOME_SITUATION_LABELS.join(', ');

export const resolveGeneralHomeSituation = (data = {}) => {
  if (data.general_home_situation != null && String(data.general_home_situation).trim() !== '') {
    return String(data.general_home_situation);
  }
  const legacy = [
    ['home_situation_childhood', ADL_GENERAL_HOME_SITUATION_LABELS[0]],
    ['home_situation_parents_relationship', ADL_GENERAL_HOME_SITUATION_LABELS[1]],
    ['home_situation_socioeconomic', ADL_GENERAL_HOME_SITUATION_LABELS[2]],
    ['home_situation_interpersonal', ADL_GENERAL_HOME_SITUATION_LABELS[3]],
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
