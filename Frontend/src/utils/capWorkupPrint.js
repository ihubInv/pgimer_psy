import PGI_Logo from '../assets/PGI_Logo.png';

function getLogoAbsoluteUrl() {
  const path = typeof PGI_Logo === 'string' ? PGI_Logo : '';
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function esc(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function val(v) {
  return esc(v) || '<span class="empty">—</span>';
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
}

function bool(v) {
  if (v === true || v === 'true') return '&#10003; Yes';
  if (v === false || v === 'false') return '&#10007; No';
  return val(v);
}

/** A two-column label+value row */
function row(label, value, fullWidth = false) {
  if (value == null || value === '' || value === undefined) return '';
  const display = typeof value === 'boolean' ? bool(value) : val(value);
  return `<div class="field${fullWidth ? ' full' : ''}">
    <span class="lbl">${esc(label)}</span>
    <span class="vl">${display}</span>
  </div>`;
}

function sectionTitle(title) {
  return `<div class="sec-title">${esc(title)}</div>`;
}

function subTitle(title) {
  return `<h4 class="sub-title">${esc(title)}</h4>`;
}

function grid(rows, cols = 2) {
  if (!rows.trim()) return '';
  return `<div class="grid-${cols}">${rows}</div>`;
}

function tableRow(cells) {
  return `<tr>${cells.map(c => `<td>${esc(String(c ?? '—'))}</td>`).join('')}</tr>`;
}

function buildHeader(form) {
  const logoUrl = getLogoAbsoluteUrl();
  return `
  <div class="print-header">
    <div class="header-inner">
      ${logoUrl ? `<img src="${logoUrl}" alt="PGIMER Logo" class="logo" />` : ''}
      <div class="header-text">
        <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION &amp; RESEARCH</h1>
        <p class="dept">Department of Psychiatry, Chandigarh</p>
        <h2>CAP Detailed Work-up Record</h2>
        <p class="subdept">Child &amp; Adolescent Psychiatry Clinic</p>
      </div>
    </div>
    <div class="header-meta">
      <span><b>CAP No:</b> ${esc(form.cap_no) || '—'}</span>
      <span><b>Workup Date:</b> ${fmtDate(form.workup_date)}</span>
      <span><b>Patient:</b> ${esc(form.patient_name) || '—'}</span>
    </div>
  </div>`;
}

function buildAdmin(form) {
  return `
  ${sectionTitle('Administrative & Identification Details')}
  ${grid([
    row('CAP No.', form.cap_no),
    row('Workup Date', fmtDate(form.workup_date)),
    row('Patient Name', form.patient_name),
    row('Age', form.age),
    row('Date of Birth', fmtDate(form.date_of_birth)),
    row('Gender', form.gender),
    row('Education', form.education),
    row('School Type', form.school_type),
    row('Referred By', form.referred_by),
    row('Reason for Referral / Present Consultation', form.reason_referral_present_consultation, true),
  ].join(''))}`;
}

function buildInformants(form) {
  const informants = form.informants || [];
  if (!informants.length) return '';
  const rows = informants.map((inf, i) => `
    ${subTitle(`Informant ${i + 1}`)}
    ${grid([
      row('Name', inf.name),
      row('Relationship', inf.relationship_with_patient),
      row('Age', inf.age),
      row('Sex', inf.sex),
      row('Education', inf.education),
      row('Occupation', inf.occupation),
      row('Duration of Stay with Patient', inf.duration_stay_with_patient),
    ].join(''))}`).join('');
  return `
  ${sectionTitle('Informants')}
  ${row('Reliability & Adequacy of Information', form.information_reliability_adequacy, true)}
  ${rows}`;
}

function buildComplaints(form) {
  const complaints = form.chief_complaints_course || [];
  if (!complaints.length) return '';
  const rows = complaints.map((c, i) => `
    ${subTitle(`Complaint ${i + 1}`)}
    ${grid([
      row('Complaint', c.complaint),
      row('Duration', c.duration),
      row('Onset', c.onset),
      row('Precipitating Factor', c.precipitating_factor_present),
      row('Precipitating Factor Details', c.precipitating_factor_elaborate),
      row('Course', c.course),
    ].join(''))}`).join('');
  return `
  ${sectionTitle('Chief Complaints, Onset, Precipitating Factor & Course')}
  ${rows}`;
}

function buildHPI(form) {
  const fields = [
    ['Developmental History & Symptoms', form.hpi_developmental_history_symptoms],
    ['Symptoms & Impairment at Developmental Age', form.hpi_symptoms_impairment_developmental_age],
    ['Behavioral Symptom Factors', form.hpi_behavioral_symptom_factors],
    ['Phenomenology of Symptoms', form.hpi_phenomenology_symptoms],
    ['Adolescent Biological Enquiry', form.hpi_adolescent_biological_enquiry],
    ['Sensory Impairments', form.hpi_sensory_impairments],
    ['Comorbid Physical Illness', form.hpi_comorbid_physical_illness],
    ['Treatment History (Summary)', form.hpi_treatment_history],
    ['HPI Continued', form.hpi_continued],
    ['Relevant Negative History', form.relevant_negative_history],
    ['Overall Functioning Assessment', form.functioning_overall_assessment],
    ['Impairment Severity', form.impairment_severity],
  ].filter(([, v]) => v).map(([l, v]) => row(l, v, true)).join('');
  if (!fields) return '';
  return `${sectionTitle('History of Present Illness (HPI)')}${fields}`;
}

function buildTreatment(form) {
  const chart = form.treatment_history_chart || [];
  const chartHtml = chart.length ? `
    <table class="tbl">
      <thead><tr><th>#</th><th>Year</th><th>Facility</th><th>Diagnosis</th><th>Treatment</th><th>Duration</th><th>Response</th></tr></thead>
      <tbody>${chart.map((t, i) => tableRow([i + 1, t.year, t.facility, t.diagnosis, t.treatment, t.duration, t.response])).join('')}</tbody>
    </table>` : '';
  const meta = [
    row('Who Initiated First Contact', form.treatment_who_initiated_first_contact, true),
    row('First Contact Due To', form.treatment_first_contact_due_to),
    row('First Contact – Other (specify)', form.treatment_first_contact_due_to_other),
  ].join('');
  if (!meta && !chartHtml) return '';
  return `
  ${sectionTitle('Treatment History')}
  ${meta}
  ${chartHtml ? subTitle('Treatment History Chart') + chartHtml : ''}`;
}

function buildHistory(form) {
  const fields = [
    ['Past Psychiatric History', form.past_psychiatric_history, true],
    ['Medical History Details', form.medical_history_details, true],
    ['Epilepsy', form.medical_enquiry_epilepsy],
    ['Syncope', form.medical_enquiry_syncope],
    ['Exercise Intolerance', form.medical_enquiry_exercise_intolerance],
    ['Cardiac Ailment', form.medical_enquiry_cardiac_ailment],
    ['Family History Details', form.family_history_details, true],
    ['Family History – Epilepsy', form.family_history_epilepsy],
    ['Family History – Sudden Cardiac Death', form.family_history_sudden_cardiac_death],
    ['Family Pedigree', form.family_pedigree_description],
    ['Consanguinity', form.family_consanguinity],
    ['Previous Abortions / Stillbirths', form.family_previous_abortions_stillbirths],
    ['Life Chart', form.life_chart_details, true],
    ['Psychiatric History – Past & Present', form.life_chart_psychiatric_past_present, true],
    ['Physical Comorbidities & Treatment', form.life_chart_physical_comorbidities_treatment, true],
    ['Relation: Physical & Psychiatric', form.life_chart_relation_physical_psychiatric, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Past Psychiatric, Medical, Family History & Life Chart')}${fields}`;
}

function buildAntenatal(form) {
  const fields = [
    ['Mother\'s Age at Conception', form.ante_natal_mother_age_conception],
    ['Father\'s Age at Conception', form.ante_natal_father_age_conception],
    ['Pregnancy Planned?', form.ante_natal_pregnancy_planned],
    ['Pregnancy Wanted?', form.ante_natal_pregnancy_wanted],
    ['If Unwanted – Reason', form.ante_natal_pregnancy_unwanted_reason],
    ['Conception Method', form.ante_natal_conception_method],
    ['Pre-conception Folate?', form.ante_natal_preconception_folate],
    ['Folate – Months Before Conception', form.ante_natal_preconception_folate_months],
    ['Mother\'s Nutritional Status', form.ante_natal_nutritional_status_mother],
    ['Medical Illness / Treatment in Pregnancy', form.ante_natal_medical_illness_treatment],
    ['Other Medical/Surgical Interventions', form.ante_natal_other_medical_surgery],
    ['Hyperemesis', form.ante_natal_hyperemesis],
    ['Fever in First Trimester', form.ante_natal_fever_first_trimester],
    ['X-ray Exposure', form.ante_natal_xray_exposure],
    ['Drug Intake (Non-supplement)', form.ante_natal_drug_intake_non_supplement],
    ['Psychotropic Drug Use', form.ante_natal_psychotropic_use],
    ['Alcohol / Tobacco Use', form.ante_natal_alcohol_tobacco],
    ['Ante-natal Visits', form.ante_natal_antenatal_visits],
    ['Immunization during Pregnancy', form.ante_natal_immunization],
    ['USG Details', form.ante_natal_usg],
    ['Special Procedures', form.ante_natal_special_procedures],
    ['Attempted Abortion?', form.ante_natal_attempted_abortion],
    ['Rh Incompatibility?', form.ante_natal_rh_incompatibility],
    ['Single / Twin Pregnancy', form.ante_natal_single_or_twin],
    ['Threatened Abortion / Bleeding PV', form.ante_natal_threatened_abortion_bleeding_pv],
    ['Pre-eclampsia / Eclampsia', form.ante_natal_preeclampsia_eclampsia],
    ['Foetal Movements', form.ante_natal_foetal_movements],
    ['Other Significant Ante-natal History', form.ante_natal_other_significant_history, true],
  ].filter(([, v]) => v != null && v !== '').map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Ante-natal History')}${grid(fields)}`;
}

function buildNatal(form) {
  const fields = [
    ['Gestational Age (weeks)', form.natal_gestational_age_weeks],
    ['Delivery Location', form.natal_delivery_location],
    ['Delivery at Term?', form.natal_delivery_term],
    ['Delivery Method', form.natal_delivery_method],
    ['Reason for Method', form.natal_delivery_method_reason],
    ['Abnormal Presentation?', form.natal_abnormal_presentation],
    ['Large Head?', form.natal_large_head],
    ['Low-lying Placenta?', form.natal_low_placenta],
    ['Prolapsed Cord?', form.natal_prolapsed_cord],
    ['Cord Around Neck?', form.natal_cord_around_neck],
    ['Foetal Distress?', form.natal_foetal_distress],
    ['Prolonged Labour?', form.natal_prolonged_labour],
    ['PROM?', form.natal_prom],
    ['Non-progress of Labour?', form.natal_non_progress_labour],
    ['Meconium Stained Liquor?', form.natal_meconium_stained],
    ['Eclampsia?', form.natal_eclampsia],
    ['Excessive Bleeding / PPH?', form.natal_excessive_bleeding_pph],
    ['Infections During Labour', form.natal_infections],
    ['Other Significant Natal History', form.natal_other_significant_history, true],
  ].filter(([, v]) => v != null && v !== '').map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Natal History')}${grid(fields)}`;
}

function buildNeonatal(form) {
  const fields = [
    ['Birth Weight (kg)', form.neonatal_birth_weight_kg],
    ['Birth Weight Category', form.neonatal_birth_weight_category],
    ['Large for Gestational Age (LGA)?', form.neonatal_lga],
    ['Birth Cry', form.neonatal_birth_cry],
    ['Colour at Birth', form.neonatal_colour],
    ['Respiratory Distress?', form.neonatal_respiratory_distress],
    ['Activity', form.neonatal_activity],
    ['Suckling', form.neonatal_suckling],
    ['Feeding Method', form.neonatal_feeding_method],
    ['Feeding Schedule', form.neonatal_feeding_schedule],
    ['Feeding Problems', form.neonatal_feeding_problem],
    ['Urine & Stools', form.neonatal_urine_stools],
    ['Congenital Anomalies / Stigmata', form.neonatal_congenital_anomalies_stigmata],
    ['Neonatal Seizures?', form.neonatal_seizures],
    ['Jaundice?', form.neonatal_jaundice],
    ['Infection?', form.neonatal_infection],
    ['NICU / Incubator Admission?', form.neonatal_hospital_incubator_nicu],
    ['ICU Stay Details', form.neonatal_icu_stay_details],
    ['Other Significant Neonatal History', form.neonatal_other_significant_history, true],
  ].filter(([, v]) => v != null && v !== '').map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Neonatal & Post-natal History')}${grid(fields)}`;
}

function buildDev(form) {
  const milestones = [
    ['Social Smile', form.dev_social_smile_age],
    ['Neck Holding', form.dev_neck_holding_age],
    ['Recognizing Mother', form.dev_recognizing_mother_age],
    ['Rolling Over', form.dev_rolling_over_age],
    ['Sitting Without Support', form.dev_sitting_without_support_age],
    ['First Meaningful Word', form.dev_first_meaningful_word_age],
    ['Standing With Support', form.dev_standing_with_support_age],
    ['Walking', form.dev_walking_age],
    ['Teething', form.dev_teething_age],
    ['10 Meaningful Words', form.dev_ten_meaningful_words_age],
    ['2-word Phrases', form.dev_two_word_phrases_age],
    ['Fluent Speech / Sentences', form.dev_fluent_speech_sentence_age],
    ['Bowel Control', form.dev_bowel_control_age],
    ['Bladder Control', form.dev_bladder_control_age],
  ].filter(([, v]) => v != null && v !== '');
  if (!milestones.length) return '';
  return `
  ${sectionTitle('Developmental Milestones')}
  <table class="tbl milestone-tbl">
    <thead><tr><th>Milestone</th><th>Age Achieved</th><th>Milestone</th><th>Age Achieved</th></tr></thead>
    <tbody>
      ${milestones.reduce((rows, [lbl, v], i) => {
        if (i % 2 === 0) {
          const next = milestones[i + 1];
          rows.push(`<tr><td>${esc(lbl)}</td><td>${esc(String(v))}</td><td>${next ? esc(next[0]) : ''}</td><td>${next ? esc(String(next[1])) : ''}</td></tr>`);
        }
        return rows;
      }, []).join('')}
    </tbody>
  </table>`;
}

function buildHabits(form) {
  const traits = [
    ['Nail Biting', form.habits_neurotic_nail_biting],
    ['Thumb Sucking', form.habits_neurotic_thumb_sucking],
    ['Morbid Fears', form.habits_neurotic_morbid_fears],
    ['Obstinacy', form.habits_neurotic_obstinacy],
    ['Temper Tantrums', form.habits_neurotic_temper_tantrums],
    ['Enuresis / Encopresis', form.habits_neurotic_enuresis_encopresis],
  ].filter(([, v]) => v != null);
  const traitsHtml = traits.length
    ? `${subTitle('Neurotic Traits')}${grid(traits.map(([l, v]) => row(l, v)).join(''), 3)}`
    : '';
  const fields = [
    ['Feeding Type', form.habits_feeding_type],
    ['Exclusive Breastfeeding (months)', form.habits_exclusive_breastfeeding_months],
    ['Reasons Not Exclusive Breastfed', form.habits_reasons_not_exclusive_breastfeeding],
    ['Weaning Age (months)', form.habits_weaning_age_months],
    ['Food Fads / Preferences', form.habits_food_fads_preferences],
    ['Sleep Details', form.habits_sleep_details],
    ['Bedtime Behavioural Problems', form.habits_sleep_bedtime_behavioral_problems],
    ['Abnormal Movements / Behaviours During Sleep', form.habits_sleep_abnormal_movements_behaviours],
    ['Other Significant Habits / Play History', form.habits_play_other_significant_history, true],
  ].filter(([, v]) => v != null && v !== '').map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields && !traitsHtml) return '';
  return `${sectionTitle('Habits, Feeding, Sleep & Neurotic Traits')}${fields}${traitsHtml}`;
}

function buildPlay(form) {
  const playBools = [
    ['Indifferent to Playmates', form.play_indifferent_to_playmates],
    ['Inappropriate Intrusion / Impulsivity', form.play_inappropriate_intrusion_impulsivity],
    ['Understands Rule-based Games', form.play_understands_rules_based_games],
    ['Shows Cooperation', form.play_shows_cooperation_in_play],
    ['Is a Bully', form.play_is_bully],
    ['Is Bullied', form.play_is_bullied],
    ['Functional Play', form.play_indulges_functional_play],
    ['Symbolic / Pretend Play', form.play_indulges_symbolic_pretend_play],
  ].filter(([, v]) => v != null);
  const fields = [
    ['Play Preference', form.play_preference],
    ['Number of Friends', form.play_friends_quantity],
    ['Friends\' Age / Relationship', form.play_friends_age_relation],
    ['Bully Details', form.play_bully_details],
    ['Bullied Details', form.play_bullied_details],
    ['Play Peculiarities', form.play_peculiarities],
  ].filter(([, v]) => v).map(([l, v]) => row(l, v)).join('');
  const boolsHtml = playBools.length ? grid(playBools.map(([l, v]) => row(l, v)).join(''), 3) : '';
  if (!fields && !boolsHtml) return '';
  return `${sectionTitle('Play')}${fields}${boolsHtml}`;
}

function buildEducation(form) {
  const fields = [
    ['Schooling Type', form.edu_schooling_type],
    ['School Nature', form.edu_school_nature],
    ['Literacy Before Formal Schooling?', form.edu_literacy_before_formal_schooling],
    ['Age Started Schooling', form.edu_age_started_schooling],
    ['Studied Up To Class', form.edu_studied_up_to_class],
    ['Current School & Address', form.edu_current_school_address],
    ['Attendance', form.edu_attendance],
    ['Scholastic Performance', form.edu_scholastic_performance],
    ['Peer Group Adjustment', form.edu_peer_group_adjustment],
    ['Problems with Teachers', form.edu_problems_with_teachers],
    ['Classroom Behaviour', form.edu_classroom_behaviour],
    ['School Change – Frequency & Reasons', form.edu_school_change_frequency_reasons],
    ['Dropout Reasons', form.edu_dropout_reasons],
    ['Other Educational Information', form.edu_any_other_information, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Educational History')}${grid(fields)}`;
}

function buildSexual(form) {
  const fields = [
    ['Age-appropriate Context / Awareness', form.sexual_menstrual_age_appropriate_context, true],
    ['Menarche, Regularity & LMP', form.sexual_menstrual_menarche_regularity_lmp],
    ['Reaction to Menarche', form.sexual_menstrual_reaction_menarche],
    ['Sexual Orientation', form.sexual_menstrual_orientation],
    ['Masturbation / Guilt', form.sexual_menstrual_masturbation_guilt],
    ['Intercourse / Protection', form.sexual_menstrual_intercourse_protection],
    ['Knowledge & Perceptions', form.sexual_menstrual_knowledge_perceptions, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Sexual & Menstrual History')}${fields}`;
}

function buildTemperament(form) {
  const dims = [
    ['Activity', 'temperament_activity_infancy', 'temperament_activity_later'],
    ['Rhythmicity', 'temperament_rhythmicity_infancy', 'temperament_rhythmicity_later'],
    ['Approach / Withdrawal', 'temperament_approach_withdrawal_infancy', 'temperament_approach_withdrawal_later'],
    ['Adaptability', 'temperament_adaptability_infancy', 'temperament_adaptability_later'],
    ['Mood', 'temperament_mood_infancy', 'temperament_mood_later'],
    ['Intensity of Reaction', 'temperament_intensity_reaction_infancy', 'temperament_intensity_reaction_later'],
    ['Threshold of Responsiveness', 'temperament_threshold_responsiveness_infancy', 'temperament_threshold_responsiveness_later'],
    ['Attention Span', 'temperament_attention_span_infancy', 'temperament_attention_span_later'],
    ['Persistence', 'temperament_persistence_infancy', 'temperament_persistence_later'],
    ['Distractibility', 'temperament_distractibility_infancy', 'temperament_distractibility_later'],
  ].filter(([, k1, k2]) => form[k1] || form[k2]);
  if (!dims.length) return '';
  return `
  ${sectionTitle('Temperamental Characteristics')}
  <table class="tbl">
    <thead><tr><th>Characteristic</th><th>Infancy</th><th>Later</th></tr></thead>
    <tbody>${dims.map(([lbl, k1, k2]) =>
      `<tr><td>${esc(lbl)}</td><td>${esc(form[k1] || '—')}</td><td>${esc(form[k2] || '—')}</td></tr>`
    ).join('')}</tbody>
  </table>`;
}

function buildFamily(form) {
  const ppfDims = [
    ['Permissiveness / Rigidity', 'ppf_mother_permissiveness_rigidity', 'ppf_father_permissiveness_rigidity'],
    ['Consistency / Inconsistency', 'ppf_mother_consistency_inconsistency', 'ppf_father_consistency_inconsistency'],
    ['Discipline / Liberal Supervision', 'ppf_mother_discipline_liberal_supervision', 'ppf_father_discipline_liberal_supervision'],
    ['Approval / Disapproval / Interest', 'ppf_mother_approval_disapproval_interest', 'ppf_father_approval_disapproval_interest'],
    ['Protectiveness / Overprotection', 'ppf_mother_protectiveness_overprotection', 'ppf_father_protectiveness_overprotection'],
    ['Toleration of Deviation', 'ppf_mother_toleration_deviation', 'ppf_father_toleration_deviation'],
  ].filter(([, km, kf]) => form[km] || form[kf]);

  const ppfHtml = ppfDims.length ? `
    ${subTitle('Patterns of Parental Functioning')}
    <table class="tbl">
      <thead><tr><th>Dimension</th><th>Mother</th><th>Father</th></tr></thead>
      <tbody>${ppfDims.map(([lbl, km, kf]) =>
        `<tr><td>${esc(lbl)}</td><td>${esc(form[km] || '—')}</td><td>${esc(form[kf] || '—')}</td></tr>`
      ).join('')}</tbody>
    </table>` : '';

  const fields = [
    ['Psychosocial Assets / Strengths', form.child_strengths_psychosocial_assets, true],
    ['Interests & Hobbies', form.child_strengths_interests_hobbies, true],
    ['Primary Caregivers', form.family_primary_caregivers],
    ['Primary Breadwinner', form.family_primary_breadwinner],
    ['Family Structure Type', form.family_structure_type],
    ['Main Decision Makers', form.family_main_decision_makers],
    ['Parent-Child Interaction', form.pci_interaction_patterns_communication_warmth_abuse_indulgence, true],
    ['Attachment & Bonding', form.pci_attachment_bonding_child_parents, true],
    ['Family Understanding & Expectations', form.pci_family_understanding_illness_expectations, true],
    ['Family Functioning: Discord & Communication', form.family_functioning_discord_communication, true],
    ['Role of Significant Others', form.family_functioning_role_significant_others, true],
    ['Stressful Events & Impact on Child', form.family_functioning_stressful_events_child_impact, true],
    ['Social/Environmental: Dwelling, Crowding, Finance', form.social_environmental_dwelling_crowding_finance_neighborhood, true],
    ['Resources, Milieu & Support', form.social_environmental_resources_milieu_support, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');

  if (!fields && !ppfHtml) return '';
  return `${sectionTitle('Strengths, Family Structure & Parental Functioning')}${fields}${ppfHtml}`;
}

function buildPhysical(form) {
  const fields = [
    ['Built', form.gpe_built],
    ['Height / Length (cm)', form.gpe_height_length_cm],
    ['Height – Growth Chart Position', form.gpe_height_growth_chart_position],
    ['Weight (kg)', form.gpe_weight_kg],
    ['Weight – Growth Chart Position', form.gpe_weight_growth_chart_position],
    ['BMI', form.gpe_bmi],
    ['BMI – Growth Chart Position', form.gpe_bmi_growth_chart_position],
    ['Waist Circumference (cm)', form.gpe_waist_circumference_cm],
    ['Hip Circumference (cm)', form.gpe_hip_circumference_cm],
    ['Head Circumference (cm)', form.gpe_head_circumference_cm],
    ['HC – Growth Chart Position', form.gpe_head_circumference_growth_chart_position],
    ['Vitals – HR', form.gpe_vitals_hr],
    ['Vitals – RR', form.gpe_vitals_rr],
    ['Vitals – BP', form.gpe_vitals_bp],
    ['General Signs', form.gpe_general_signs, true],
    ['Facial Dysmorphism', form.gpe_facial_dysmorphism, true],
    ['Skin / Neurocutaneous Stigmata', form.gpe_skin_neurocutaneous_stigmata, true],
  ].filter(([, v]) => v != null && v !== '').map(([l, v, fw]) => row(l, v, fw)).join('');

  const sysFields = [
    ['Respiratory System', form.sys_exam_respiratory],
    ['Cardiovascular System', form.sys_exam_cardiovascular],
    ['Gastrointestinal System', form.sys_exam_gastrointestinal],
    ['Nervous System', form.sys_exam_nervous_system],
  ].filter(([, v]) => v).map(([l, v]) => row(l, v)).join('');

  if (!fields && !sysFields) return '';
  return `
  ${sectionTitle('General Physical & Systemic Examination')}
  ${grid(fields)}
  ${sysFields ? subTitle('Systemic Examination') + grid(sysFields) : ''}`;
}

function buildMSE(form) {
  const fields = [
    ['Interview Approach / Notes', form.mse_interview_approach_notes, true],
    ['General Appearance, Attitude & Behaviour', form.mse_general_appearance_attitude_behaviour, true],
    ['Relationship Capacity', form.mse_relationship_capacity, true],
    ['Spontaneous Motility', form.mse_spontaneous_motility, true],
    ['Speech & Language', form.mse_speech_and_language, true],
    ['Affect', form.mse_affect, true],
    ['Thought Flow', form.mse_thought_flow],
    ['Thought Form', form.mse_thought_form],
    ['Thought Content', form.mse_thought_content, true],
    ['Possession', form.mse_possession, true],
    ['Perception', form.mse_perception, true],
    ['HMF – Orientation', form.mse_hmf_orientation],
    ['HMF – Attention & Distractibility', form.mse_hmf_attention_distractibility],
    ['HMF – Memory', form.mse_hmf_memory],
    ['HMF – Intelligence & Fund of Knowledge', form.mse_hmf_intelligence_fund_of_knowledge, true],
    ['Insight & Motivation', form.mse_insight_motivation, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Mental State Examination (MSE)')}${fields}`;
}

function buildDiagnosis(form) {
  const fields = [
    ['Diagnostic Formulation', form.diagnostic_formulation, true],
    ['Provisional Diagnosis', form.provisional_diagnosis, true],
    ['ICD-10 Diagnosis', form.icd10_diagnosis],
    ['DSM-5 Diagnosis', form.dsm5_diagnosis],
    ['Resident\'s Plan of Management', form.residents_plan_of_management, true],
    ['Consultant / SR Discussion', form.consultant_sr_discussion, true],
    ['Final Diagnosis', form.final_diagnosis, true],
    ['Final ICD-10 Diagnosis', form.final_icd10_diagnosis],
    ['Final DSM-5 Diagnosis', form.final_dsm5_diagnosis],
    ['Management: Follow-up Setting & Frequency', form.mgmt_planned_followup_setting_frequency, true],
    ['Management: Further Exploration Planned', form.mgmt_planned_further_exploration, true],
    ['Management: Rating Scales Planned', form.mgmt_planned_rating_scales, true],
    ['General Advice', form.management_advice, true],
  ].filter(([, v]) => v).map(([l, v, fw]) => row(l, v, fw)).join('');
  if (!fields) return '';
  return `${sectionTitle('Diagnosis & Management Plan')}${fields}`;
}

function buildSignatures(form) {
  const hasSig = form.signature_consultant_sr_name || form.signature_resident_name;
  if (!hasSig) return '';
  return `
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(form.signature_consultant_sr_name) || ''}</div>
      <div class="sig-label">Consultant / SR</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(form.signature_resident_name) || ''}</div>
      <div class="sig-label">Resident</div>
    </div>
  </div>`;
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm 10mm 18mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; line-height: 1.5; color: #111; background: #fff; }

  /* ── Header ── */
  .print-header { border-bottom: 3px solid #1a3a6b; padding-bottom: 8px; margin-bottom: 10px; }
  .header-inner { display: flex; align-items: center; gap: 14px; }
  .logo { height: 72px; width: auto; flex-shrink: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header-text { flex: 1; }
  .header-text h1 { font-size: 13pt; font-weight: 800; color: #1a3a6b; line-height: 1.2; }
  .header-text .dept { font-size: 9.5pt; color: #444; margin-top: 2px; }
  .header-text h2 { font-size: 11pt; font-weight: 700; color: #8b0000; margin-top: 4px; }
  .header-text .subdept { font-size: 8.5pt; color: #555; }
  .header-meta { display: flex; gap: 24px; margin-top: 7px; padding-top: 5px; border-top: 1px solid #cdd; font-size: 9pt; color: #222; }
  .header-meta span b { color: #1a3a6b; }

  /* ── Section titles ── */
  .sec-title { font-size: 10pt; font-weight: 700; color: #fff; background: #1a3a6b; padding: 4px 10px; margin: 10px 0 6px 0; border-radius: 3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sub-title { font-size: 9pt; font-weight: 600; color: #1a3a6b; border-bottom: 1px solid #aac; padding-bottom: 2px; margin: 7px 0 4px 0; }

  /* ── Field grids ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 12px; }
  .field { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; border-bottom: 1px dotted #ddd; }
  .field.full { grid-column: 1 / -1; }
  .lbl { font-weight: 600; color: #333; min-width: 160px; flex-shrink: 0; font-size: 8.5pt; }
  .vl { flex: 1; color: #111; white-space: pre-wrap; word-break: break-word; }
  .empty { color: #aaa; }

  /* ── Tables ── */
  .tbl { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
  .tbl th { background: #e8eef8; color: #1a3a6b; font-weight: 700; padding: 5px 7px; border: 1px solid #b0bcd4; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tbl td { padding: 4px 7px; border: 1px solid #ccc; vertical-align: top; }
  .tbl tr:nth-child(even) td { background: #f8f9fc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .milestone-tbl th, .milestone-tbl td { width: 25%; }

  /* ── Signatures ── */
  .signatures { display: flex; gap: 40px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #999; }
  .sig-box { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #333; margin-bottom: 4px; height: 36px; }
  .sig-name { font-size: 9pt; font-weight: 600; }
  .sig-label { font-size: 8pt; color: #555; }

  /* ── Footer ── */
  .print-footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #bbb; font-size: 7.5pt; font-style: italic; text-align: center; color: #666; }

  /* ── Page breaks ── */
  .sec-title { page-break-before: auto; }
  .tbl { page-break-inside: avoid; }
`;

/**
 * Open a clean print window for the CAP detailed workup record.
 * @param {Object} form  — the form state object from EditChildCapWorkup
 */
export function printCapWorkup(form) {
  const body = [
    buildAdmin(form),
    buildInformants(form),
    buildComplaints(form),
    buildHPI(form),
    buildTreatment(form),
    buildHistory(form),
    buildAntenatal(form),
    buildNatal(form),
    buildNeonatal(form),
    buildDev(form),
    buildHabits(form),
    buildPlay(form),
    buildEducation(form),
    buildSexual(form),
    buildTemperament(form),
    buildFamily(form),
    buildPhysical(form),
    buildMSE(form),
    buildDiagnosis(form),
    buildSignatures(form),
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CAP Work-up – ${esc(form.patient_name) || 'Patient'}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${buildHeader(form)}
  ${body}
  <div class="print-footer">This is an electronically generated record. CAP No: ${esc(form.cap_no) || '—'} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-IN')}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };
}
