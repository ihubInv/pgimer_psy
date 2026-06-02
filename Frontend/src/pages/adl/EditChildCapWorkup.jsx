import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FiSave, FiPlus, FiX, FiChevronDown, FiChevronUp,
  FiUser, FiCalendar, FiFileText, FiActivity, FiHeart,
  FiBook, FiHome, FiClipboard,
} from 'react-icons/fi';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  useGetChildCapWorkupsByChildPatientIdQuery,
  useCreateChildCapWorkupMutation,
  useUpdateChildCapWorkupMutation,
} from '../../features/childCapWorkup/childCapWorkupApiSlice';

/** CAP intake form is fully enabled. */
export const CHILD_CAP_INTAKE_COMING_SOON = false;

// ─── Helper components ────────────────────────────────────────────────────────

const DisplayField = ({ label, value, rows, plain = false }) => (
  <div className="relative">
    {!plain && (
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl" />
    )}
    <div
      className={
        plain
          ? 'relative rounded-lg border border-gray-200 bg-gray-50 p-4'
          : 'relative bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm'
      }
    >
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
      {rows && rows > 1
        ? <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{value || 'N/A'}</p>
        : <p className="text-base font-medium text-gray-900">{value || 'N/A'}</p>}
    </div>
  </div>
);

const Field = ({
  readOnly,
  label,
  value,
  rows,
  name,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}) => {
  if (readOnly) return <DisplayField label={label} value={value} rows={rows} plain />;
  if (rows && rows > 1) {
    return (
      <Textarea
        label={label}
        name={name}
        value={value || ''}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    );
  }
  return (
    <Input
      label={label}
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={className}
    />
  );
};

const BoolField = ({ readOnly, label, name, value, onChange }) => {
  if (readOnly) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className={`w-4 h-4 rounded border flex items-center justify-center ${value ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {value && <span className="text-white text-xs">✓</span>}
        </span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
    );
  }
  return (
    <label className="flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={!!value}
        onChange={onChange}
        className="w-4 h-4 rounded text-blue-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
};

const SectionHeader = ({
  title,
  icon: Icon,
  expanded,
  onToggle,
  color = 'blue',
  collapsible = true,
}) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  if (!collapsible) {
    return (
      <div className="w-full flex items-center justify-between p-4 rounded-t-xl border-b border-gray-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {expanded ? <FiChevronUp className="h-5 w-5 text-gray-500" /> : <FiChevronDown className="h-5 w-5 text-gray-500" />}
    </button>
  );
};

const EMPTY_INFORMANT = { name: '', relationship_with_patient: '', age: '', sex: '', education: '', occupation: '', duration_stay_with_patient: '' };
const EMPTY_COMPLAINT = { complaint: '', duration: '', onset: '', precipitating_factor_present: '', precipitating_factor_elaborate: '', course: '' };
const EMPTY_TREATMENT = { contact_no: '', year: '', facility: '', diagnosis: '', treatment: '', duration: '', response: '' };
const ALL_SECTION_KEYS = [
  'admin',
  'informants',
  'complaints',
  'hpi',
  'treatment',
  'history',
  'antenatal',
  'natal',
  'neonatal',
  'dev',
  'habits',
  'play',
  'education',
  'sexual',
  'temperament',
  'family',
  'physical',
  'mse',
  'diagnosis',
  'consultant',
];

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT_FORM = {
  workup_date: new Date().toISOString().split('T')[0],
  cap_no: '', patient_name: '', age: '', date_of_birth: '', gender: '', education: '', school_type: '',
  referred_by: '', reason_referral_present_consultation: '',
  informants: [{ ...EMPTY_INFORMANT }],
  information_reliability_adequacy: '',
  chief_complaints_course: [{ ...EMPTY_COMPLAINT }],

  hpi_developmental_history_symptoms: '', hpi_symptoms_impairment_developmental_age: '',
  hpi_behavioral_symptom_factors: '', hpi_phenomenology_symptoms: '',
  hpi_adolescent_biological_enquiry: '', hpi_sensory_impairments: '',
  hpi_comorbid_physical_illness: '', hpi_treatment_history: '', hpi_continued: '',
  relevant_negative_history: '', functioning_overall_assessment: '', impairment_severity: '',

  treatment_who_initiated_first_contact: '', treatment_first_contact_due_to: '',
  treatment_first_contact_due_to_other: '',
  treatment_history_chart: [{ ...EMPTY_TREATMENT }],

  past_psychiatric_history: '', medical_history_details: '', medical_enquiry_epilepsy: '',
  medical_enquiry_syncope: '', medical_enquiry_exercise_intolerance: '',
  medical_enquiry_cardiac_ailment: '', family_history_details: '',
  family_history_epilepsy: '', family_history_sudden_cardiac_death: '',
  family_pedigree_description: '', family_consanguinity: '',
  family_previous_abortions_stillbirths: '',
  life_chart_details: '', life_chart_psychiatric_past_present: '',
  life_chart_physical_comorbidities_treatment: '', life_chart_relation_physical_psychiatric: '',

  ante_natal_pregnancy_planned: '', ante_natal_pregnancy_wanted: '',
  ante_natal_pregnancy_unwanted_reason: '', ante_natal_conception_method: '',
  ante_natal_preconception_folate: '', ante_natal_preconception_folate_months: '',
  ante_natal_nutritional_status_mother: '', ante_natal_medical_illness_treatment: '',
  ante_natal_other_medical_surgery: '', ante_natal_hyperemesis: '',
  ante_natal_fever_first_trimester: '', ante_natal_xray_exposure: '',
  ante_natal_drug_intake_non_supplement: '', ante_natal_psychotropic_use: '',
  ante_natal_alcohol_tobacco: '', ante_natal_antenatal_visits: '',
  ante_natal_immunization: '', ante_natal_usg: '', ante_natal_special_procedures: '',
  ante_natal_attempted_abortion: '', ante_natal_rh_incompatibility: '',
  ante_natal_single_or_twin: '', ante_natal_threatened_abortion_bleeding_pv: '',
  ante_natal_preeclampsia_eclampsia: '', ante_natal_foetal_movements: '',
  ante_natal_other_significant_history: '',
  ante_natal_mother_age_conception: '', ante_natal_father_age_conception: '',

  natal_gestational_age_weeks: '', natal_delivery_location: '', natal_delivery_term: '',
  natal_delivery_method: '', natal_delivery_method_reason: '',
  natal_abnormal_presentation: '', natal_large_head: '', natal_low_placenta: '',
  natal_prolapsed_cord: '', natal_cord_around_neck: '', natal_foetal_distress: '',
  natal_prolonged_labour: '', natal_prom: '', natal_non_progress_labour: '',
  natal_meconium_stained: '', natal_eclampsia: '', natal_excessive_bleeding_pph: '',
  natal_infections: '', natal_other_significant_history: '',

  neonatal_birth_weight_kg: '', neonatal_birth_weight_category: '', neonatal_lga: '',
  neonatal_birth_cry: '', neonatal_colour: '', neonatal_respiratory_distress: '',
  neonatal_activity: '', neonatal_suckling: '', neonatal_feeding_method: '',
  neonatal_feeding_schedule: '', neonatal_feeding_problem: '', neonatal_urine_stools: '',
  neonatal_congenital_anomalies_stigmata: '', neonatal_seizures: '', neonatal_jaundice: '',
  neonatal_infection: '', neonatal_hospital_incubator_nicu: '',
  neonatal_icu_stay_details: '', neonatal_other_significant_history: '',

  dev_social_smile_age: '', dev_neck_holding_age: '', dev_recognizing_mother_age: '',
  dev_rolling_over_age: '', dev_sitting_without_support_age: '',
  dev_first_meaningful_word_age: '', dev_standing_with_support_age: '',
  dev_walking_age: '', dev_teething_age: '', dev_ten_meaningful_words_age: '',
  dev_two_word_phrases_age: '', dev_fluent_speech_sentence_age: '',
  dev_bowel_control_age: '', dev_bladder_control_age: '',

  immunization_iap_grid: {},

  habits_exclusive_breastfeeding_months: '', habits_feeding_type: '',
  habits_reasons_not_exclusive_breastfeeding: '', habits_weaning_age_months: '',
  habits_food_fads_preferences: '', habits_sleep_details: '',
  habits_sleep_bedtime_behavioral_problems: '', habits_sleep_abnormal_movements_behaviours: '',
  habits_neurotic_nail_biting: false, habits_neurotic_thumb_sucking: false,
  habits_neurotic_morbid_fears: false, habits_neurotic_obstinacy: false,
  habits_neurotic_temper_tantrums: false, habits_neurotic_enuresis_encopresis: false,

  play_preference: '', play_friends_quantity: '', play_friends_age_relation: '',
  play_indifferent_to_playmates: false, play_inappropriate_intrusion_impulsivity: false,
  play_understands_rules_based_games: false, play_shows_cooperation_in_play: false,
  play_is_bully: false, play_is_bullied: false,
  play_bully_details: '', play_bullied_details: '',
  play_indulges_functional_play: false, play_indulges_symbolic_pretend_play: false,
  play_peculiarities: '', habits_play_other_significant_history: '',

  edu_schooling_type: '', edu_school_nature: '', edu_literacy_before_formal_schooling: '',
  edu_age_started_schooling: '', edu_studied_up_to_class: '', edu_current_school_address: '',
  edu_attendance: '', edu_scholastic_performance: '', edu_peer_group_adjustment: '',
  edu_problems_with_teachers: '', edu_classroom_behaviour: '',
  edu_school_change_frequency_reasons: '', edu_dropout_reasons: '', edu_any_other_information: '',

  sexual_menstrual_age_appropriate_context: '', sexual_menstrual_menarche_regularity_lmp: '',
  sexual_menstrual_reaction_menarche: '', sexual_menstrual_orientation: '',
  sexual_menstrual_masturbation_guilt: '', sexual_menstrual_intercourse_protection: '',
  sexual_menstrual_knowledge_perceptions: '',

  temperament_activity_infancy: '', temperament_activity_later: '',
  temperament_rhythmicity_infancy: '', temperament_rhythmicity_later: '',
  temperament_approach_withdrawal_infancy: '', temperament_approach_withdrawal_later: '',
  temperament_adaptability_infancy: '', temperament_adaptability_later: '',
  temperament_mood_infancy: '', temperament_mood_later: '',
  temperament_intensity_reaction_infancy: '', temperament_intensity_reaction_later: '',
  temperament_threshold_responsiveness_infancy: '', temperament_threshold_responsiveness_later: '',
  temperament_attention_span_infancy: '', temperament_attention_span_later: '',
  temperament_persistence_infancy: '', temperament_persistence_later: '',
  temperament_distractibility_infancy: '', temperament_distractibility_later: '',

  child_strengths_psychosocial_assets: '', child_strengths_interests_hobbies: '',
  family_primary_caregivers: '', family_primary_breadwinner: '',
  family_structure_type: '', family_main_decision_makers: '',

  ppf_mother_permissiveness_rigidity: '', ppf_father_permissiveness_rigidity: '',
  ppf_mother_consistency_inconsistency: '', ppf_father_consistency_inconsistency: '',
  ppf_mother_discipline_liberal_supervision: '', ppf_father_discipline_liberal_supervision: '',
  ppf_mother_approval_disapproval_interest: '', ppf_father_approval_disapproval_interest: '',
  ppf_mother_protectiveness_overprotection: '', ppf_father_protectiveness_overprotection: '',
  ppf_mother_toleration_deviation: '', ppf_father_toleration_deviation: '',

  pci_interaction_patterns_communication_warmth_abuse_indulgence: '',
  pci_attachment_bonding_child_parents: '', pci_family_understanding_illness_expectations: '',
  family_functioning_discord_communication: '', family_functioning_role_significant_others: '',
  family_functioning_stressful_events_child_impact: '',
  social_environmental_dwelling_crowding_finance_neighborhood: '',
  social_environmental_resources_milieu_support: '',

  gpe_built: '', gpe_height_length_cm: '', gpe_height_growth_chart_position: '',
  gpe_weight_kg: '', gpe_weight_growth_chart_position: '',
  gpe_bmi: '', gpe_bmi_growth_chart_position: '',
  gpe_waist_circumference_cm: '', gpe_hip_circumference_cm: '',
  gpe_head_circumference_cm: '', gpe_head_circumference_growth_chart_position: '',
  gpe_vitals_hr: '', gpe_vitals_rr: '', gpe_vitals_bp: '',
  gpe_general_signs: '', gpe_facial_dysmorphism: '', gpe_skin_neurocutaneous_stigmata: '',
  sys_exam_respiratory: '', sys_exam_gastrointestinal: '',
  sys_exam_cardiovascular: '', sys_exam_nervous_system: '',

  mse_interview_approach_notes: '', mse_general_appearance_attitude_behaviour: '',
  mse_relationship_capacity: '', mse_spontaneous_motility: '',
  mse_speech_and_language: '', mse_affect: '', mse_thought_flow: '',
  mse_thought_form: '', mse_thought_content: '', mse_possession: '',
  mse_perception: '', mse_hmf_orientation: '',
  mse_hmf_attention_distractibility: '', mse_hmf_memory: '',
  mse_hmf_intelligence_fund_of_knowledge: '', mse_insight_motivation: '',

  investigations_assessments: {},
  diagnostic_formulation: '', provisional_diagnosis: '',
  icd10_diagnosis: '', dsm5_diagnosis: '', residents_plan_of_management: '',

  consultant_sr_discussion: '', final_diagnosis: '',
  final_icd10_diagnosis: '', final_dsm5_diagnosis: '',
  mgmt_planned_followup_setting_frequency: '', mgmt_planned_further_exploration: '',
  mgmt_planned_rating_scales: '', management_plan_interventions: {},
  management_advice: '', signature_consultant_sr_name: '', signature_resident_name: '',
};

// ─── Main Component (legacy CAP intake — gated by CHILD_CAP_INTAKE_COMING_SOON) ─

const EditChildCapWorkupLegacy = ({
  childPatientId,
  isEmbedded = false,
  hideToolbar = false,
  flatLayout = false,
  readOnlyView = false,
}) => {
  const effectiveFlatLayout = flatLayout || readOnlyView;
  const effectiveHideToolbar = hideToolbar || readOnlyView;
  const buildOpenSections = (openAll = false) =>
    ALL_SECTION_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: openAll || key === 'admin' }),
      {}
    );

  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [recordId, setRecordId] = useState(null);
  const [readOnly, setReadOnly] = useState(readOnlyView);
  const [openSections, setOpenSections] = useState(buildOpenSections(effectiveFlatLayout));

  const { data, isLoading: isFetching, refetch } = useGetChildCapWorkupsByChildPatientIdQuery(childPatientId, {
    skip: !childPatientId,
    refetchOnMountOrArgChange: true,
  });
  const [createWorkup, { isLoading: isCreating }] = useCreateChildCapWorkupMutation();
  const [updateWorkup, { isLoading: isUpdating }] = useUpdateChildCapWorkupMutation();

  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (!effectiveFlatLayout) return;
    setOpenSections(buildOpenSections(true));
  }, [effectiveFlatLayout]);

  useEffect(() => {
    const records = data?.data?.records || [];
    if (records.length > 0) {
      const rec = records[0];
      setRecordId(rec.id);
      setReadOnly(true);
      // Merge fetched data over defaults
      const merged = { ...DEFAULT_FORM };
      Object.keys(merged).forEach((k) => {
        if (rec[k] !== undefined && rec[k] !== null) {
          merged[k] = rec[k];
        }
      });
      // Ensure JSONB arrays have at least one row for editing later
      if (!Array.isArray(merged.informants) || merged.informants.length === 0) merged.informants = [{ ...EMPTY_INFORMANT }];
      if (!Array.isArray(merged.chief_complaints_course) || merged.chief_complaints_course.length === 0) merged.chief_complaints_course = [{ ...EMPTY_COMPLAINT }];
      if (!Array.isArray(merged.treatment_history_chart) || merged.treatment_history_chart.length === 0) merged.treatment_history_chart = [{ ...EMPTY_TREATMENT }];
      setForm(merged);
    } else {
      setReadOnly(readOnlyView);
      setForm({ ...DEFAULT_FORM });
    }
  }, [data, readOnlyView]);

  const toggleSection = useCallback((key) => {
    if (effectiveFlatLayout) return;
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [effectiveFlatLayout]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  // Generic helpers for dynamic rows
  const handleRowChange = (field, index, key, value) => {
    setForm((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const addRow = (field, template) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), { ...template }],
    }));
  };

  const removeRow = (field, index) => {
    setForm((prev) => {
      const arr = [...(prev[field] || [])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr.length ? arr : [{}] };
    });
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, child_patient_id: childPatientId };
      if (recordId) {
        await updateWorkup({ id: recordId, ...payload }).unwrap();
        toast.success('CAP Workup record updated successfully');
      } else {
        const result = await createWorkup(payload).unwrap();
        setRecordId(result.data?.record?.id);
        toast.success('CAP Workup record created successfully');
      }
      setReadOnly(true);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save workup record');
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const S = ({ k, ...rest }) => (
    <Field
      readOnly={readOnly}
      onChange={handleChange}
      {...rest}
      name={k}
      value={form[k]}
    />
  );

  const B = ({ k, label }) => (
    <BoolField readOnly={readOnly} label={label} name={k} value={form[k]} onChange={handleChange} />
  );

  return (
    <div className="space-y-4">
      {!effectiveHideToolbar && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">CAP Detailed Work-up Record</h2>
            <p className="text-sm text-gray-500">Child & Adolescent Psychiatry Clinic</p>
          </div>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReadOnly(false)}
                className="flex items-center gap-1.5 border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                Edit Record
              </Button>
            ) : (
              <>
                {recordId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReadOnly(true)}
                    className="flex items-center gap-1.5"
                  >
                    <FiX className="w-4 h-4" /> Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  <FiSave className="w-4 h-4" />
                  {recordId ? 'Update' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Section: Administrative Details ─────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Administrative & Identification Details" icon={FiFileText} color="blue"
          expanded={effectiveFlatLayout ? true : openSections.admin}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('admin')}
          collapsible={!effectiveFlatLayout} />
        {openSections.admin && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <S k="workup_date" label="Workup Date" type="date" />
            <S k="cap_no" label="CAP No." placeholder="CAP number" />
            <S k="patient_name" label="Patient Name" placeholder="Full name" />
            <S k="age" label="Age" placeholder="Age" />
            <S k="date_of_birth" label="Date of Birth" type="date" />
            <S k="gender" label="Gender" placeholder="Male / Female / Other" />
            <S k="education" label="Education" placeholder="Current class / level" />
            <S k="school_type" label="School Type" placeholder="Government / Private / Special" />
            <S k="referred_by" label="Referred By" placeholder="Referral source" />
            <div className="md:col-span-3">
              <S k="reason_referral_present_consultation" label="Reason for Referral / Present Consultation" rows={3} placeholder="Reason for referral..." />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Informants ──────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Informants" icon={FiUser} color="indigo"
          expanded={effectiveFlatLayout ? true : openSections.informants}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('informants')}
          collapsible={!effectiveFlatLayout} />
        {openSections.informants && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="md:col-span-3">
              <S k="information_reliability_adequacy" label="Reliability & Adequacy of Information" rows={2} placeholder="Assessment of information quality..." />
            </div>
            {(form.informants || []).map((inf, i) => (
              <div key={i} className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-indigo-700">Informant {i + 1}</h4>
                  {!readOnly && form.informants.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeRow('informants', i)}>
                      <FiX className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['name', 'relationship_with_patient', 'age', 'sex', 'education', 'occupation', 'duration_stay_with_patient'].map((key) => (
                    readOnly ? (
                      <DisplayField key={key} label={key.replace(/_/g, ' ')} value={inf[key]} />
                    ) : (
                      <Input key={key} label={key.replace(/_/g, ' ')} value={inf[key] || ''}
                        onChange={(e) => handleRowChange('informants', i, key, e.target.value)}
                        placeholder={key.replace(/_/g, ' ')} />
                    )
                  ))}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" onClick={() => addRow('informants', EMPTY_INFORMANT)}>
                <FiPlus className="w-4 h-4 mr-1" /> Add Informant
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── Section: Chief Complaints ────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Chief Complaints, Onset, Precipitating Factor & Course" icon={FiClipboard} color="rose"
          expanded={effectiveFlatLayout ? true : openSections.complaints}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('complaints')}
          collapsible={!effectiveFlatLayout} />
        {openSections.complaints && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            {(form.chief_complaints_course || []).map((c, i) => (
              <div key={i} className="border border-rose-100 rounded-xl p-4 bg-rose-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-rose-700">Complaint {i + 1}</h4>
                  {!readOnly && form.chief_complaints_course.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeRow('chief_complaints_course', i)}>
                      <FiX className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['complaint', 'Complaint'],
                    ['duration', 'Duration'],
                    ['onset', 'Onset'],
                    ['precipitating_factor_present', 'Precipitating Factor (Yes/No)'],
                    ['precipitating_factor_elaborate', 'Precipitating Factor Details'],
                    ['course', 'Course'],
                  ].map(([key, lbl]) => (
                    readOnly ? (
                      <DisplayField key={key} label={lbl} value={c[key]} />
                    ) : (
                      <Input key={key} label={lbl} value={c[key] || ''}
                        onChange={(e) => handleRowChange('chief_complaints_course', i, key, e.target.value)}
                        placeholder={lbl} />
                    )
                  ))}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" onClick={() => addRow('chief_complaints_course', EMPTY_COMPLAINT)}>
                <FiPlus className="w-4 h-4 mr-1" /> Add Complaint
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── Section: HPI ─────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="History of Present Illness (HPI)" icon={FiFileText} color="purple"
          expanded={effectiveFlatLayout ? true : openSections.hpi}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('hpi')}
          collapsible={!effectiveFlatLayout} />
        {openSections.hpi && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 gap-4">
            <S k="hpi_developmental_history_symptoms" label="Developmental History & Symptoms" rows={4} placeholder="Developmental history and symptom description..." />
            <S k="hpi_symptoms_impairment_developmental_age" label="Symptoms & Impairment at Developmental Age" rows={3} placeholder="Impairment at developmental age..." />
            <S k="hpi_behavioral_symptom_factors" label="Behavioral Symptom Factors" rows={3} placeholder="Behavioral and symptom factors..." />
            <S k="hpi_phenomenology_symptoms" label="Phenomenology of Symptoms" rows={3} placeholder="Phenomenological description..." />
            <S k="hpi_adolescent_biological_enquiry" label="Adolescent Biological Enquiry" rows={3} placeholder="Biological enquiry (for adolescents)..." />
            <S k="hpi_sensory_impairments" label="Sensory Impairments" rows={2} placeholder="Sensory impairments..." />
            <S k="hpi_comorbid_physical_illness" label="Comorbid Physical Illness" rows={2} placeholder="Comorbid physical illnesses..." />
            <S k="hpi_treatment_history" label="Treatment History (Summary)" rows={3} placeholder="Brief treatment history..." />
            <S k="hpi_continued" label="HPI Continued" rows={3} placeholder="Continued narrative..." />
            <S k="relevant_negative_history" label="Relevant Negative History" rows={3} placeholder="Relevant negatives..." />
            <S k="functioning_overall_assessment" label="Overall Functioning Assessment" rows={3} placeholder="Global functioning assessment..." />
            <S k="impairment_severity" label="Impairment Severity (Mild / Moderate / Severe / None)" placeholder="Mild / Moderate / Severe / None / Not impaired" />
          </div>
        )}
      </Card>

      {/* ── Section: Treatment History ───────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Treatment History" icon={FiActivity} color="teal"
          expanded={effectiveFlatLayout ? true : openSections.treatment}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('treatment')}
          collapsible={!effectiveFlatLayout} />
        {openSections.treatment && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="treatment_who_initiated_first_contact" label="Who Initiated First Contact?" rows={2} placeholder="Person who initiated first contact..." />
              <S k="treatment_first_contact_due_to" label="First Contact Due To" placeholder="Parental perception / Teacher referral / Physician / Pediatrician / Relative / Other" />
              <S k="treatment_first_contact_due_to_other" label="First Contact (Other – specify)" placeholder="If other, specify..." />
            </div>
            <h4 className="font-semibold text-sm text-teal-700 mt-2">Treatment History Chart (up to 4 contacts)</h4>
            {(form.treatment_history_chart || []).map((t, i) => (
              <div key={i} className="border border-teal-100 rounded-xl p-4 bg-teal-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm text-teal-800">Contact {i + 1}</h5>
                  {!readOnly && form.treatment_history_chart.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeRow('treatment_history_chart', i)}>
                      <FiX className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['year', 'Year'], ['facility', 'Facility'], ['diagnosis', 'Diagnosis'], ['treatment', 'Treatment'], ['duration', 'Duration'], ['response', 'Response']].map(([key, lbl]) => (
                    readOnly ? (
                      <DisplayField key={key} label={lbl} value={t[key]} />
                    ) : (
                      <Input key={key} label={lbl} value={t[key] || ''}
                        onChange={(e) => handleRowChange('treatment_history_chart', i, key, e.target.value)}
                        placeholder={lbl} />
                    )
                  ))}
                </div>
              </div>
            ))}
            {!readOnly && form.treatment_history_chart.length < 4 && (
              <Button type="button" variant="outline" size="sm" onClick={() => addRow('treatment_history_chart', EMPTY_TREATMENT)}>
                <FiPlus className="w-4 h-4 mr-1" /> Add Contact
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── Section: Past / Medical / Family / Life Chart ────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Past Psychiatric, Medical, Family History & Life Chart" icon={FiHeart} color="amber"
          expanded={effectiveFlatLayout ? true : openSections.history}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('history')}
          collapsible={!effectiveFlatLayout} />
        {openSections.history && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 gap-4">
            <S k="past_psychiatric_history" label="Past Psychiatric History" rows={3} placeholder="Details of past psychiatric history..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="medical_history_details" label="Medical History Details" rows={3} />
              <S k="medical_enquiry_epilepsy" label="Epilepsy" rows={2} />
              <S k="medical_enquiry_syncope" label="Syncope" rows={2} />
              <S k="medical_enquiry_exercise_intolerance" label="Exercise Intolerance" rows={2} />
              <S k="medical_enquiry_cardiac_ailment" label="Cardiac Ailment" rows={2} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="family_history_details" label="Family History Details" rows={3} />
              <S k="family_history_epilepsy" label="Family History – Epilepsy" rows={2} />
              <S k="family_history_sudden_cardiac_death" label="Family History – Sudden Cardiac Death" rows={2} />
              <S k="family_pedigree_description" label="Family Pedigree Description" rows={3} />
              <S k="family_consanguinity" label="Consanguinity" rows={2} />
              <S k="family_previous_abortions_stillbirths" label="Previous Abortions / Stillbirths" rows={2} />
            </div>
            <S k="life_chart_details" label="Life Chart" rows={3} placeholder="Timeline of events..." />
            <S k="life_chart_psychiatric_past_present" label="Psychiatric Illness – Past & Present (Life Chart)" rows={3} />
            <S k="life_chart_physical_comorbidities_treatment" label="Physical Comorbidities & Treatment (Life Chart)" rows={3} />
            <S k="life_chart_relation_physical_psychiatric" label="Relation: Physical & Psychiatric (Life Chart)" rows={2} />
          </div>
        )}
      </Card>

      {/* ── Section: Ante-natal History ─────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Ante-natal History" icon={FiCalendar} color="green"
          expanded={effectiveFlatLayout ? true : openSections.antenatal}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('antenatal')}
          collapsible={!effectiveFlatLayout} />
        {openSections.antenatal && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="ante_natal_mother_age_conception" label="Mother's Age at Conception" type="number" />
            <S k="ante_natal_father_age_conception" label="Father's Age at Conception" type="number" />
            <S k="ante_natal_pregnancy_planned" label="Pregnancy Planned?" placeholder="Yes / No" />
            <S k="ante_natal_pregnancy_wanted" label="Pregnancy Wanted?" placeholder="Yes / No" />
            <S k="ante_natal_pregnancy_unwanted_reason" label="If Unwanted – Reason" rows={2} />
            <S k="ante_natal_conception_method" label="Conception Method" placeholder="Natural / ART / etc." />
            <S k="ante_natal_preconception_folate" label="Pre-conception Folate?" placeholder="Yes / No" />
            <S k="ante_natal_preconception_folate_months" label="Folate – Months Before Conception" />
            <S k="ante_natal_nutritional_status_mother" label="Mother's Nutritional Status" />
            <S k="ante_natal_medical_illness_treatment" label="Medical Illness / Treatment in Pregnancy" rows={2} />
            <S k="ante_natal_other_medical_surgery" label="Other Medical/Surgical Interventions" rows={2} />
            <S k="ante_natal_hyperemesis" label="Hyperemesis" placeholder="Yes / No / Details" />
            <S k="ante_natal_fever_first_trimester" label="Fever in First Trimester" placeholder="Yes / No" />
            <S k="ante_natal_xray_exposure" label="X-ray Exposure" placeholder="Yes / No" />
            <S k="ante_natal_drug_intake_non_supplement" label="Drug Intake (Non-supplement)" rows={2} />
            <S k="ante_natal_psychotropic_use" label="Psychotropic Drug Use" rows={2} />
            <S k="ante_natal_alcohol_tobacco" label="Alcohol / Tobacco Use" />
            <S k="ante_natal_antenatal_visits" label="Ante-natal Visits" placeholder="Number / Regular / Irregular" />
            <S k="ante_natal_immunization" label="Immunization during Pregnancy" />
            <S k="ante_natal_usg" label="USG Details" rows={2} />
            <S k="ante_natal_special_procedures" label="Special Procedures" rows={2} />
            <S k="ante_natal_attempted_abortion" label="Attempted Abortion?" placeholder="Yes / No" />
            <S k="ante_natal_rh_incompatibility" label="Rh Incompatibility?" placeholder="Yes / No" />
            <S k="ante_natal_single_or_twin" label="Single / Twin Pregnancy" />
            <S k="ante_natal_threatened_abortion_bleeding_pv" label="Threatened Abortion / Bleeding PV" />
            <S k="ante_natal_preeclampsia_eclampsia" label="Pre-eclampsia / Eclampsia" placeholder="Yes / No / Details" />
            <S k="ante_natal_foetal_movements" label="Foetal Movements" placeholder="Normal / Reduced / Excessive" />
            <div className="md:col-span-2">
              <S k="ante_natal_other_significant_history" label="Other Significant Ante-natal History" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Natal History ───────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Natal History" icon={FiCalendar} color="cyan"
          expanded={effectiveFlatLayout ? true : openSections.natal}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('natal')}
          collapsible={!effectiveFlatLayout} />
        {openSections.natal && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="natal_gestational_age_weeks" label="Gestational Age (weeks)" type="number" />
            <S k="natal_delivery_location" label="Delivery Location" placeholder="Hospital / Home / etc." />
            <S k="natal_delivery_term" label="Delivery at Term?" placeholder="Term / Pre-term / Post-term" />
            <S k="natal_delivery_method" label="Delivery Method" placeholder="Normal / LSCS / Forceps / Vacuum" />
            <S k="natal_delivery_method_reason" label="Reason for Method" rows={2} />
            <S k="natal_abnormal_presentation" label="Abnormal Presentation?" placeholder="Yes / No / Details" />
            <S k="natal_large_head" label="Large Head?" placeholder="Yes / No" />
            <S k="natal_low_placenta" label="Low-lying Placenta?" placeholder="Yes / No" />
            <S k="natal_prolapsed_cord" label="Prolapsed Cord?" placeholder="Yes / No" />
            <S k="natal_cord_around_neck" label="Cord Around Neck?" placeholder="Yes / No" />
            <S k="natal_foetal_distress" label="Foetal Distress?" placeholder="Yes / No" />
            <S k="natal_prolonged_labour" label="Prolonged Labour?" placeholder="Yes / No" />
            <S k="natal_prom" label="PROM?" placeholder="Yes / No" />
            <S k="natal_non_progress_labour" label="Non-progress of Labour?" placeholder="Yes / No" />
            <S k="natal_meconium_stained" label="Meconium Stained Liquor?" placeholder="Yes / No" />
            <S k="natal_eclampsia" label="Eclampsia?" placeholder="Yes / No" />
            <S k="natal_excessive_bleeding_pph" label="Excessive Bleeding / PPH?" placeholder="Yes / No" />
            <S k="natal_infections" label="Infections During Labour" rows={2} />
            <div className="md:col-span-2">
              <S k="natal_other_significant_history" label="Other Significant Natal History" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Neonatal / Post-natal ──────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Neonatal & Post-natal History" icon={FiHeart} color="orange"
          expanded={effectiveFlatLayout ? true : openSections.neonatal}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('neonatal')}
          collapsible={!effectiveFlatLayout} />
        {openSections.neonatal && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="neonatal_birth_weight_kg" label="Birth Weight (kg)" type="number" />
            <S k="neonatal_birth_weight_category" label="Birth Weight Category" placeholder="Normal / LBW / VLBW / Macrosomic" />
            <S k="neonatal_lga" label="Large for Gestational Age (LGA)?" placeholder="Yes / No" />
            <S k="neonatal_birth_cry" label="Birth Cry" placeholder="Immediate / Delayed / Absent" />
            <S k="neonatal_colour" label="Colour at Birth" placeholder="Pink / Cyanosed / Pale" />
            <S k="neonatal_respiratory_distress" label="Respiratory Distress?" placeholder="Yes / No" />
            <S k="neonatal_activity" label="Activity" placeholder="Normal / Hypotonic / Hypertonic" />
            <S k="neonatal_suckling" label="Suckling" placeholder="Good / Poor / Absent" />
            <S k="neonatal_feeding_method" label="Feeding Method" placeholder="Breast / Formula / Mixed" />
            <S k="neonatal_feeding_schedule" label="Feeding Schedule" placeholder="Demand / Scheduled" />
            <S k="neonatal_feeding_problem" label="Feeding Problems" rows={2} />
            <S k="neonatal_urine_stools" label="Urine & Stools" placeholder="Normal / Abnormal / Details" />
            <S k="neonatal_congenital_anomalies_stigmata" label="Congenital Anomalies / Stigmata" rows={2} />
            <S k="neonatal_seizures" label="Neonatal Seizures?" placeholder="Yes / No / Details" />
            <S k="neonatal_jaundice" label="Jaundice?" placeholder="Yes / No / Treated" />
            <S k="neonatal_infection" label="Infection?" rows={2} />
            <S k="neonatal_hospital_incubator_nicu" label="NICU / Incubator Admission?" placeholder="Yes / No" />
            <S k="neonatal_icu_stay_details" label="ICU Stay Details" rows={2} />
            <div className="md:col-span-2">
              <S k="neonatal_other_significant_history" label="Other Significant Neonatal History" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Developmental Milestones ───────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Developmental Milestones" icon={FiActivity} color="green"
          expanded={effectiveFlatLayout ? true : openSections.dev}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('dev')}
          collapsible={!effectiveFlatLayout} />
        {openSections.dev && (
          <div className="p-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['dev_social_smile_age', 'Social Smile'],
                ['dev_neck_holding_age', 'Neck Holding'],
                ['dev_recognizing_mother_age', 'Recognizing Mother'],
                ['dev_rolling_over_age', 'Rolling Over'],
                ['dev_sitting_without_support_age', 'Sitting Without Support'],
                ['dev_first_meaningful_word_age', 'First Meaningful Word'],
                ['dev_standing_with_support_age', 'Standing With Support'],
                ['dev_walking_age', 'Walking'],
                ['dev_teething_age', 'Teething'],
                ['dev_ten_meaningful_words_age', '10 Meaningful Words'],
                ['dev_two_word_phrases_age', '2-word Phrases'],
                ['dev_fluent_speech_sentence_age', 'Fluent Speech / Sentences'],
                ['dev_bowel_control_age', 'Bowel Control'],
                ['dev_bladder_control_age', 'Bladder Control'],
              ].map(([k, lbl]) => (
                <S key={k} k={k} label={lbl} placeholder="Age (e.g. 3m, 1y)" />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Habits & Neurotic Traits ───────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Habits, Feeding, Sleep & Neurotic Traits" icon={FiHome} color="amber"
          expanded={effectiveFlatLayout ? true : openSections.habits}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('habits')}
          collapsible={!effectiveFlatLayout} />
        {openSections.habits && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <S k="habits_feeding_type" label="Feeding Type" placeholder="Breast / Formula / Mixed" />
              <S k="habits_exclusive_breastfeeding_months" label="Exclusive Breastfeeding (months)" type="number" />
              <S k="habits_reasons_not_exclusive_breastfeeding" label="Reasons Not Exclusive Breastfed" rows={2} />
              <S k="habits_weaning_age_months" label="Weaning Age (months)" type="number" />
              <S k="habits_food_fads_preferences" label="Food Fads / Preferences" rows={2} />
              <S k="habits_sleep_details" label="Sleep Details" rows={2} />
              <S k="habits_sleep_bedtime_behavioral_problems" label="Bedtime Behavioural Problems" rows={2} />
              <S k="habits_sleep_abnormal_movements_behaviours" label="Abnormal Movements / Behaviours During Sleep" rows={2} />
            </div>
            <h4 className="font-semibold text-sm text-amber-700">Neurotic Traits</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <B k="habits_neurotic_nail_biting" label="Nail Biting" />
              <B k="habits_neurotic_thumb_sucking" label="Thumb Sucking" />
              <B k="habits_neurotic_morbid_fears" label="Morbid Fears" />
              <B k="habits_neurotic_obstinacy" label="Obstinacy" />
              <B k="habits_neurotic_temper_tantrums" label="Temper Tantrums" />
              <B k="habits_neurotic_enuresis_encopresis" label="Enuresis / Encopresis" />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Play ────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Play" icon={FiUser} color="teal"
          expanded={effectiveFlatLayout ? true : openSections.play}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('play')}
          collapsible={!effectiveFlatLayout} />
        {openSections.play && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="play_preference" label="Play Preference" rows={2} />
              <S k="play_friends_quantity" label="Number of Friends" />
              <S k="play_friends_age_relation" label="Friends' Age / Relationship" />
              <S k="play_bully_details" label="Bully Details" rows={2} />
              <S k="play_bullied_details" label="Bullied Details" rows={2} />
              <S k="play_peculiarities" label="Play Peculiarities" rows={2} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <B k="play_indifferent_to_playmates" label="Indifferent to Playmates" />
              <B k="play_inappropriate_intrusion_impulsivity" label="Inappropriate Intrusion / Impulsivity" />
              <B k="play_understands_rules_based_games" label="Understands Rule-based Games" />
              <B k="play_shows_cooperation_in_play" label="Shows Cooperation" />
              <B k="play_is_bully" label="Is a Bully" />
              <B k="play_is_bullied" label="Is Bullied" />
              <B k="play_indulges_functional_play" label="Functional Play" />
              <B k="play_indulges_symbolic_pretend_play" label="Symbolic / Pretend Play" />
            </div>
            <S k="habits_play_other_significant_history" label="Other Significant Habits / Play History" rows={3} />
          </div>
        )}
      </Card>

      {/* ── Section: Educational History ────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Educational History" icon={FiBook} color="purple"
          expanded={effectiveFlatLayout ? true : openSections.education}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('education')}
          collapsible={!effectiveFlatLayout} />
        {openSections.education && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="edu_schooling_type" label="Schooling Type" placeholder="Formal / Non-formal / Home-schooled" />
            <S k="edu_school_nature" label="School Nature" placeholder="Government / Private / Special" />
            <S k="edu_literacy_before_formal_schooling" label="Literacy Before Formal Schooling?" placeholder="Yes / No" />
            <S k="edu_age_started_schooling" label="Age Started Schooling" />
            <S k="edu_studied_up_to_class" label="Studied Up To Class" />
            <S k="edu_current_school_address" label="Current School & Address" rows={2} />
            <S k="edu_attendance" label="Attendance" placeholder="Regular / Irregular / % attendance" />
            <S k="edu_scholastic_performance" label="Scholastic Performance" rows={2} />
            <S k="edu_peer_group_adjustment" label="Peer Group Adjustment" rows={2} />
            <S k="edu_problems_with_teachers" label="Problems with Teachers" rows={2} />
            <S k="edu_classroom_behaviour" label="Classroom Behaviour" rows={2} />
            <S k="edu_school_change_frequency_reasons" label="School Change – Frequency & Reasons" rows={2} />
            <S k="edu_dropout_reasons" label="Dropout Reasons" rows={2} />
            <div className="md:col-span-2">
              <S k="edu_any_other_information" label="Any Other Educational Information" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Sexual & Menstrual History ─────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Sexual & Menstrual History" icon={FiUser} color="rose"
          expanded={effectiveFlatLayout ? true : openSections.sexual}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('sexual')}
          collapsible={!effectiveFlatLayout} />
        {openSections.sexual && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="sexual_menstrual_age_appropriate_context" label="Age-appropriate Context / Awareness" rows={2} />
            <S k="sexual_menstrual_menarche_regularity_lmp" label="Menarche, Regularity & LMP" rows={2} />
            <S k="sexual_menstrual_reaction_menarche" label="Reaction to Menarche" rows={2} />
            <S k="sexual_menstrual_orientation" label="Sexual Orientation" />
            <S k="sexual_menstrual_masturbation_guilt" label="Masturbation / Guilt" rows={2} />
            <S k="sexual_menstrual_intercourse_protection" label="Intercourse / Protection" rows={2} />
            <div className="md:col-span-2">
              <S k="sexual_menstrual_knowledge_perceptions" label="Knowledge & Perceptions" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Temperamental Characteristics ──────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Temperamental Characteristics" icon={FiActivity} color="indigo"
          expanded={effectiveFlatLayout ? true : openSections.temperament}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('temperament')}
          collapsible={!effectiveFlatLayout} />
        {openSections.temperament && (
          <div className="p-4 border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-indigo-50">
                    <th className="text-left p-3 font-semibold text-indigo-700 border border-indigo-100">Characteristic</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 border border-indigo-100">Infancy</th>
                    <th className="text-left p-3 font-semibold text-indigo-700 border border-indigo-100">Later</th>
                  </tr>
                </thead>
                <tbody>
                  {[
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
                  ].map(([lbl, k1, k2]) => (
                    <tr key={lbl} className="even:bg-gray-50">
                      <td className="p-3 font-medium text-gray-700 border border-gray-100">{lbl}</td>
                      <td className="p-2 border border-gray-100">
                        {readOnly ? <span className="text-gray-900">{form[k1] || '—'}</span>
                          : <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" name={k1} value={form[k1] || ''} onChange={handleChange} placeholder="Description" />}
                      </td>
                      <td className="p-2 border border-gray-100">
                        {readOnly ? <span className="text-gray-900">{form[k2] || '—'}</span>
                          : <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" name={k2} value={form[k2] || ''} onChange={handleChange} placeholder="Description" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Strengths & Family ─────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Strengths, Family Structure & Parental Functioning" icon={FiHome} color="green"
          expanded={effectiveFlatLayout ? true : openSections.family}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('family')}
          collapsible={!effectiveFlatLayout} />
        {openSections.family && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="child_strengths_psychosocial_assets" label="Psychosocial Assets / Strengths" rows={3} />
              <S k="child_strengths_interests_hobbies" label="Interests & Hobbies" rows={3} />
              <S k="family_primary_caregivers" label="Primary Caregivers" />
              <S k="family_primary_breadwinner" label="Primary Breadwinner" />
              <S k="family_structure_type" label="Family Structure Type" placeholder="Nuclear / Joint / Extended" />
              <S k="family_main_decision_makers" label="Main Decision Makers" />
            </div>

            <h4 className="font-semibold text-sm text-green-700 mt-4">Patterns of Parental Functioning</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="text-left p-3 font-semibold text-green-700 border border-green-100">Dimension</th>
                    <th className="text-left p-3 font-semibold text-green-700 border border-green-100">Mother</th>
                    <th className="text-left p-3 font-semibold text-green-700 border border-green-100">Father</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Permissiveness / Rigidity', 'ppf_mother_permissiveness_rigidity', 'ppf_father_permissiveness_rigidity'],
                    ['Consistency / Inconsistency', 'ppf_mother_consistency_inconsistency', 'ppf_father_consistency_inconsistency'],
                    ['Discipline / Liberal Supervision', 'ppf_mother_discipline_liberal_supervision', 'ppf_father_discipline_liberal_supervision'],
                    ['Approval / Disapproval / Interest', 'ppf_mother_approval_disapproval_interest', 'ppf_father_approval_disapproval_interest'],
                    ['Protectiveness / Overprotection', 'ppf_mother_protectiveness_overprotection', 'ppf_father_protectiveness_overprotection'],
                    ['Toleration of Deviation', 'ppf_mother_toleration_deviation', 'ppf_father_toleration_deviation'],
                  ].map(([lbl, km, kf]) => (
                    <tr key={lbl} className="even:bg-gray-50">
                      <td className="p-3 font-medium text-gray-700 border border-gray-100">{lbl}</td>
                      <td className="p-2 border border-gray-100">
                        {readOnly ? <span className="text-gray-900">{form[km] || '—'}</span>
                          : <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" name={km} value={form[km] || ''} onChange={handleChange} />}
                      </td>
                      <td className="p-2 border border-gray-100">
                        {readOnly ? <span className="text-gray-900">{form[kf] || '—'}</span>
                          : <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" name={kf} value={form[kf] || ''} onChange={handleChange} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <S k="pci_interaction_patterns_communication_warmth_abuse_indulgence" label="Parent-Child Interaction: Communication, Warmth, Abuse, Indulgence" rows={3} />
              <S k="pci_attachment_bonding_child_parents" label="Attachment & Bonding: Child–Parents" rows={3} />
              <S k="pci_family_understanding_illness_expectations" label="Family Understanding of Illness & Expectations" rows={3} />
              <S k="family_functioning_discord_communication" label="Family Functioning: Discord & Communication" rows={3} />
              <S k="family_functioning_role_significant_others" label="Role of Significant Others" rows={2} />
              <S k="family_functioning_stressful_events_child_impact" label="Stressful Events & Impact on Child" rows={2} />
              <S k="social_environmental_dwelling_crowding_finance_neighborhood" label="Social/Environmental: Dwelling, Crowding, Finance, Neighbourhood" rows={3} />
              <S k="social_environmental_resources_milieu_support" label="Resources, Milieu & Support" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Physical Examination ───────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="General Physical & Systemic Examination" icon={FiActivity} color="slate"
          expanded={effectiveFlatLayout ? true : openSections.physical}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('physical')}
          collapsible={!effectiveFlatLayout} />
        {openSections.physical && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <S k="gpe_built" label="Built" placeholder="Ectomorph / Endomorph / Mesomorph" />
              <S k="gpe_height_length_cm" label="Height / Length (cm)" type="number" />
              <S k="gpe_height_growth_chart_position" label="Height – Growth Chart Position" />
              <S k="gpe_weight_kg" label="Weight (kg)" type="number" />
              <S k="gpe_weight_growth_chart_position" label="Weight – Growth Chart Position" />
              <S k="gpe_bmi" label="BMI" type="number" />
              <S k="gpe_bmi_growth_chart_position" label="BMI – Growth Chart Position" />
              <S k="gpe_waist_circumference_cm" label="Waist Circumference (cm)" type="number" />
              <S k="gpe_hip_circumference_cm" label="Hip Circumference (cm)" type="number" />
              <S k="gpe_head_circumference_cm" label="Head Circumference (cm)" type="number" />
              <S k="gpe_head_circumference_growth_chart_position" label="HC – Growth Chart Position" />
              <S k="gpe_vitals_hr" label="Vitals – HR" placeholder="bpm" />
              <S k="gpe_vitals_rr" label="Vitals – RR" placeholder="breaths/min" />
              <S k="gpe_vitals_bp" label="Vitals – BP" placeholder="mmHg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="gpe_general_signs" label="General Signs" rows={3} placeholder="Pallor, icterus, lymphadenopathy, oedema..." />
              <S k="gpe_facial_dysmorphism" label="Facial Dysmorphism" rows={3} />
              <S k="gpe_skin_neurocutaneous_stigmata" label="Skin / Neurocutaneous Stigmata" rows={3} />
            </div>
            <h4 className="font-semibold text-sm text-slate-700 mt-2">Systemic Examination</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S k="sys_exam_respiratory" label="Respiratory System" rows={3} />
              <S k="sys_exam_cardiovascular" label="Cardiovascular System" rows={3} />
              <S k="sys_exam_gastrointestinal" label="Gastrointestinal System" rows={3} />
              <S k="sys_exam_nervous_system" label="Nervous System" rows={3} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: MSE ─────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Mental State Examination (MSE)" icon={FiClipboard} color="purple"
          expanded={effectiveFlatLayout ? true : openSections.mse}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('mse')}
          collapsible={!effectiveFlatLayout} />
        {openSections.mse && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <S k="mse_interview_approach_notes" label="Interview Approach / Notes" rows={2} />
            <S k="mse_general_appearance_attitude_behaviour" label="General Appearance, Attitude & Behaviour" rows={3} />
            <S k="mse_relationship_capacity" label="Relationship Capacity" rows={2} />
            <S k="mse_spontaneous_motility" label="Spontaneous Motility" rows={2} />
            <S k="mse_speech_and_language" label="Speech & Language" rows={2} />
            <S k="mse_affect" label="Affect" rows={2} />
            <S k="mse_thought_flow" label="Thought Flow" rows={2} />
            <S k="mse_thought_form" label="Thought Form" rows={2} />
            <S k="mse_thought_content" label="Thought Content" rows={2} />
            <S k="mse_possession" label="Possession" rows={2} />
            <S k="mse_perception" label="Perception" rows={2} />
            <S k="mse_hmf_orientation" label="HMF – Orientation" rows={2} />
            <S k="mse_hmf_attention_distractibility" label="HMF – Attention & Distractibility" rows={2} />
            <S k="mse_hmf_memory" label="HMF – Memory" rows={2} />
            <S k="mse_hmf_intelligence_fund_of_knowledge" label="HMF – Intelligence & Fund of Knowledge" rows={2} />
            <S k="mse_insight_motivation" label="Insight & Motivation" rows={2} />
          </div>
        )}
      </Card>

      {/* ── Section: Diagnosis & Plan ────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Diagnosis & Plan" icon={FiFileText} color="indigo"
          expanded={effectiveFlatLayout ? true : openSections.diagnosis}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('diagnosis')}
          collapsible={!effectiveFlatLayout} />
        {openSections.diagnosis && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <S k="diagnostic_formulation" label="Diagnostic Formulation" rows={5} placeholder="Biopsychosocial formulation..." />
            </div>
            <S k="provisional_diagnosis" label="Provisional Diagnosis" rows={2} />
            <S k="icd10_diagnosis" label="ICD-10 Diagnosis" rows={2} />
            <S k="dsm5_diagnosis" label="DSM-5 Diagnosis" rows={2} />
            <div className="md:col-span-2">
              <S k="residents_plan_of_management" label="Resident's Plan of Management" rows={4} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Section: Consultant Review ───────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <SectionHeader title="Consultant / SR Review & Final Management" icon={FiClipboard} color="rose"
          expanded={effectiveFlatLayout ? true : openSections.consultant}
          onToggle={effectiveFlatLayout ? undefined : () => toggleSection('consultant')}
          collapsible={!effectiveFlatLayout} />
        {openSections.consultant && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <S k="consultant_sr_discussion" label="Consultant / SR Discussion" rows={4} />
            </div>
            <S k="final_diagnosis" label="Final Diagnosis" rows={2} />
            <S k="final_icd10_diagnosis" label="Final ICD-10 Diagnosis" rows={2} />
            <S k="final_dsm5_diagnosis" label="Final DSM-5 Diagnosis" rows={2} />
            <S k="mgmt_planned_followup_setting_frequency" label="Management: Follow-up Setting & Frequency" rows={2} />
            <S k="mgmt_planned_further_exploration" label="Management: Further Exploration Planned" rows={2} />
            <S k="mgmt_planned_rating_scales" label="Management: Rating Scales Planned" rows={2} />
            <div className="md:col-span-2">
              <S k="management_advice" label="General Advice" rows={4} />
            </div>
            <S k="signature_consultant_sr_name" label="Consultant / SR Name & Signature" />
            <S k="signature_resident_name" label="Resident Name & Signature" />
          </div>
        )}
      </Card>

      {/* Bottom Save Bar */}
      {!readOnly && !readOnlyView && (!effectiveHideToolbar || effectiveFlatLayout) && (
        <div className="sticky bottom-0 z-10 flex justify-end gap-3 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-4 -mx-4 shadow-lg">
          {recordId && (
            <Button type="button" variant="outline" onClick={() => setReadOnly(true)}>
              <FiX className="w-4 h-4 mr-1" /> Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-6"
          >
            <FiSave className="w-4 h-4" />
            {recordId ? 'Update Workup Record' : 'Save Workup Record'}
          </Button>
        </div>
      )}
    </div>
  );
};

const EditChildCapWorkup = (props) => {
  return <EditChildCapWorkupLegacy {...props} />;
};

export default EditChildCapWorkup;
