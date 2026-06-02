export const ADL_PREMORBID_PERSONALITY_HISTORY_LABELS = [
  'Passive vs Active',
  'Assertiveness',
  'Introvert vs Extrovert',
  'Personality traits',
  'Hobbies and interests',
  'Habits',
  'Alcohol and drug use',
];

export const ADL_PREMORBID_PERSONALITY_HISTORY_LABEL_LINE =
  ADL_PREMORBID_PERSONALITY_HISTORY_LABELS.join(', ');

const formatTraitsValue = (raw) => {
  if (raw == null) return '';
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (typeof t === 'string' ? t : JSON.stringify(t)))
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return formatTraitsValue(parsed);
    } catch {
      return raw.trim();
    }
    return raw.trim();
  }
  return String(raw).trim();
};

export const resolvePremorbidPersonalityHistory = (data = {}) => {
  if (data.premorbid_personality_history != null && String(data.premorbid_personality_history).trim() !== '') {
    return String(data.premorbid_personality_history);
  }
  const legacy = [
    ['premorbid_personality_passive_active', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[0]],
    ['premorbid_personality_assertive', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[1]],
    ['premorbid_personality_introvert_extrovert', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[2]],
    ['premorbid_personality_traits', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[3]],
    ['premorbid_personality_hobbies', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[4]],
    ['premorbid_personality_habits', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[5]],
    ['premorbid_personality_alcohol_drugs', ADL_PREMORBID_PERSONALITY_HISTORY_LABELS[6]],
  ];
  const parts = [];
  legacy.forEach(([key, label]) => {
    const val = key === 'premorbid_personality_traits'
      ? formatTraitsValue(data[key])
      : data[key];
    if (val != null && String(val).trim() !== '') {
      parts.push(`${label}\n${String(val).trim()}`);
    }
  });
  return parts.join('\n\n');
};
