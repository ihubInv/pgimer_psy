import { useMemo } from 'react';
import { formatDate } from '../utils/formatters';
import { normalizeArrayField } from '../utils/clinicalMultiSelectArray';
import {
  PatientDetailCardShell,
  PatientDetailSectionTitle,
  PatientDetailFieldGroup,
  PatientDetailField,
} from './PatientDetailReadOnlyCard';
import {
  CHILD_CLINICAL_RELIABILITY_OPTIONS,
  CHILD_CLINICAL_FAMILY_TYPE_OPTIONS,
  CHILD_CLINICAL_SCHOOL_TYPE_OPTIONS,
  CHILD_CLINICAL_ACADEMIC_PERFORMANCE_OPTIONS,
  CHILD_CLINICAL_BULLYING_OPTIONS,
  CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS,
  CHILD_CLINICAL_BEHAVIORAL_CONCERNS,
  CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS,
  CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS,
  CHILD_CLINICAL_FAMILY_HISTORY_NEW,
  CHILD_CLINICAL_RISK_ASSESSMENT,
  CHILD_CLINICAL_INVESTIGATIONS_REQUIRED,
  CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS,
  CHILD_CLINICAL_SOURCE_OF_REFERRAL_OPTIONS,
  CHILD_CLINICAL_ONSET_OPTIONS,
  CHILD_CLINICAL_COURSE_OPTIONS,
  CHILD_CLINICAL_DURATION_OF_ILLNESS_OPTIONS,
} from '../utils/constants';

function hasDisplay(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

function joinFromOptions(raw, options) {
  const vals = normalizeArrayField(raw);
  if (!vals.length) return '';
  return vals
    .map((val) => {
      const opt = options?.find((o) => o.value === val);
      return opt ? opt.label : val;
    })
    .join(', ');
}

function labelForValue(value, options) {
  if (!value && value !== 0) return '';
  const opt = options?.find((o) => o.value === value);
  return opt ? opt.label : String(value);
}

function formatVisitDate(p) {
  const raw = p?.visit_date || p?.date;
  if (!raw) return '';
  const s = String(raw);
  try {
    return formatDate(s.includes('T') ? s.split('T')[0] : s);
  } catch {
    return s;
  }
}

function CheckboxSummary({ label, fieldValue, options }) {
  const text = joinFromOptions(fieldValue, options);
  if (!text) return null;
  return <PatientDetailField label={label} value={text} className="md:col-span-2" />;
}

/**
 * Read-only Child Clinical Proforma — same visual language as walk-in summary
 * (blue section titles, grey field tiles).
 * @param {boolean} [hideTitleBlock] — hide top "CHILD CLINICAL PROFORMA" / visit date strip when the parent UI already shows that context (e.g. Past History).
 */
export default function ChildClinicalProformaSummaryView({ proforma, hideTitleBlock = false }) {
  const visitLabel = formatVisitDate(proforma);

  const hasAnyContent = useMemo(() => {
    if (!proforma) return false;
    const checks = [
      visitLabel,
      proforma.child_name,
      proforma.age,
      proforma.sex,
      proforma.room_no,
      proforma.assigned_doctor,
      proforma.informant_relationship,
      proforma.reliability,
      proforma.family_type,
      proforma.socioeconomic_status,
      proforma.source_of_referral,
      proforma.onset,
      proforma.course,
      proforma.duration_of_illness,
      proforma.presenting_complaints,
      proforma.school_name,
      joinFromOptions(proforma.neurodevelopmental_concerns, CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS),
      proforma.neurodevelopmental_description,
      joinFromOptions(proforma.behavioral_concerns, CHILD_CLINICAL_BEHAVIORAL_CONCERNS),
      proforma.behavioral_description,
      joinFromOptions(proforma.emotional_psychological_symptoms, CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS),
      proforma.emotional_psychological_description,
      joinFromOptions(proforma.trauma_psychosocial_stressors, CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS),
      proforma.trauma_description,
      proforma.associated_medical_illness,
      proforma.developmental_history,
      joinFromOptions(proforma.family_history, CHILD_CLINICAL_FAMILY_HISTORY_NEW),
      proforma.family_history_details,
      joinFromOptions(proforma.risk_assessment, CHILD_CLINICAL_RISK_ASSESSMENT),
      proforma.mse_appearance_behaviour,
      proforma.mse_rapport,
      proforma.mse_speech,
      proforma.mse_mood_affect,
      proforma.mse_thought,
      proforma.mse_perception,
      proforma.mse_cognition,
      proforma.mse_insight_judgment,
      proforma.provisional_diagnosis,
      joinFromOptions(proforma.investigations_required, CHILD_CLINICAL_INVESTIGATIONS_REQUIRED),
      proforma.pharmacological_treatment,
      joinFromOptions(proforma.psychological_treatment, CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS),
      proforma.high_risk_management,
      proforma.follow_up_after,
      proforma.referred_to,
      proforma.disposal_status,
    ];
    return checks.some((v) => {
      if (typeof v === 'boolean') return v;
      return hasDisplay(v);
    });
  }, [proforma, visitLabel]);

  if (!proforma) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
        No clinical proforma data.
      </div>
    );
  }

  if (!hasAnyContent) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
        No responses recorded on this child clinical proforma.
      </div>
    );
  }

  const showVisit =
    hasDisplay(visitLabel) ||
    hasDisplay(proforma.child_name) ||
    hasDisplay(proforma.age) ||
    hasDisplay(proforma.sex) ||
    hasDisplay(proforma.room_no) ||
    hasDisplay(proforma.assigned_doctor);

  const showInformant =
    hasDisplay(proforma.informant_relationship) ||
    hasDisplay(proforma.reliability) ||
    hasDisplay(proforma.family_type) ||
    hasDisplay(proforma.socioeconomic_status) ||
    hasDisplay(proforma.source_of_referral);

  const showIllness =
    hasDisplay(proforma.onset) ||
    hasDisplay(proforma.course) ||
    hasDisplay(proforma.duration_of_illness) ||
    hasDisplay(proforma.physical_development);

  const showSchool =
    hasDisplay(proforma.school_name) ||
    hasDisplay(proforma.school_class) ||
    hasDisplay(proforma.school_type) ||
    hasDisplay(proforma.academic_performance) ||
    typeof proforma.school_refusal === 'boolean' ||
    hasDisplay(proforma.bullying);

  const showSymptomDomains =
    joinFromOptions(proforma.neurodevelopmental_concerns, CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS) ||
    hasDisplay(proforma.neurodevelopmental_description) ||
    joinFromOptions(proforma.behavioral_concerns, CHILD_CLINICAL_BEHAVIORAL_CONCERNS) ||
    hasDisplay(proforma.behavioral_description) ||
    joinFromOptions(proforma.emotional_psychological_symptoms, CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS) ||
    hasDisplay(proforma.emotional_psychological_description) ||
    joinFromOptions(proforma.trauma_psychosocial_stressors, CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS) ||
    hasDisplay(proforma.trauma_description);

  const showMedicalFamily =
    hasDisplay(proforma.associated_medical_illness) ||
    hasDisplay(proforma.developmental_history) ||
    joinFromOptions(proforma.family_history, CHILD_CLINICAL_FAMILY_HISTORY_NEW) ||
    hasDisplay(proforma.family_history_details);

  const showMse =
    hasDisplay(proforma.mse_appearance_behaviour) ||
    hasDisplay(proforma.mse_rapport) ||
    hasDisplay(proforma.mse_speech) ||
    hasDisplay(proforma.mse_mood_affect) ||
    hasDisplay(proforma.mse_thought) ||
    hasDisplay(proforma.mse_perception) ||
    hasDisplay(proforma.mse_cognition) ||
    hasDisplay(proforma.mse_insight_judgment);

  const showPlan =
    hasDisplay(proforma.provisional_diagnosis) ||
    joinFromOptions(proforma.investigations_required, CHILD_CLINICAL_INVESTIGATIONS_REQUIRED) ||
    hasDisplay(proforma.pharmacological_treatment) ||
    joinFromOptions(proforma.psychological_treatment, CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS) ||
    hasDisplay(proforma.high_risk_management) ||
    hasDisplay(proforma.follow_up_after) ||
    hasDisplay(proforma.referred_to) ||
    hasDisplay(proforma.disposal_status);

  return (
    <div className="child-clinical-proforma-summary space-y-6">
      {!hideTitleBlock && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-lg font-bold uppercase tracking-wide text-blue-800 sm:text-xl">
            Child Clinical Proforma
          </h2>
          {visitLabel && (
            <p className="mt-1 text-sm text-gray-500">
              Visit date: <span className="font-medium text-gray-700">{visitLabel}</span>
            </p>
          )}
        </div>
      )}

      {showVisit && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Visit</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(visitLabel) && <PatientDetailField label="Visit date" value={visitLabel} />}
              {hasDisplay(proforma.child_name) && (
                <PatientDetailField label="Patient name" value={proforma.child_name} />
              )}
              {hasDisplay(proforma.age) && <PatientDetailField label="Age" value={String(proforma.age)} />}
              {hasDisplay(proforma.sex) && <PatientDetailField label="Sex" value={proforma.sex} />}
              {hasDisplay(proforma.room_no) && <PatientDetailField label="Room" value={proforma.room_no} />}
              {hasDisplay(proforma.assigned_doctor) && (
                <PatientDetailField label="Assigned doctor" value={proforma.assigned_doctor} />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showInformant && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Informant</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.informant_relationship) && (
                <PatientDetailField
                  label="Relationship with patient"
                  value={proforma.informant_relationship}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.reliability) && (
                <PatientDetailField
                  label="Reliability of informant"
                  value={labelForValue(proforma.reliability, CHILD_CLINICAL_RELIABILITY_OPTIONS)}
                />
              )}
              {hasDisplay(proforma.family_type) && (
                <PatientDetailField
                  label="Family type"
                  value={labelForValue(proforma.family_type, CHILD_CLINICAL_FAMILY_TYPE_OPTIONS)}
                />
              )}
              {hasDisplay(proforma.socioeconomic_status) && (
                <PatientDetailField
                  label="Socioeconomic status"
                  value={proforma.socioeconomic_status}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.source_of_referral) && (
                <PatientDetailField
                  label="Source of referral"
                  value={labelForValue(proforma.source_of_referral, CHILD_CLINICAL_SOURCE_OF_REFERRAL_OPTIONS)}
                  className="md:col-span-2"
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showIllness && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Illness course</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.onset) && (
                <PatientDetailField
                  label="Onset"
                  value={labelForValue(proforma.onset, CHILD_CLINICAL_ONSET_OPTIONS)}
                />
              )}
              {hasDisplay(proforma.course) && (
                <PatientDetailField
                  label="Course"
                  value={labelForValue(proforma.course, CHILD_CLINICAL_COURSE_OPTIONS)}
                />
              )}
              {hasDisplay(proforma.duration_of_illness) && (
                <PatientDetailField
                  label="Duration of illness"
                  value={labelForValue(
                    proforma.duration_of_illness,
                    CHILD_CLINICAL_DURATION_OF_ILLNESS_OPTIONS
                  )}
                />
              )}
              {hasDisplay(proforma.physical_development) && (
                <PatientDetailField label="Physical development" value={proforma.physical_development} />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {hasDisplay(proforma.presenting_complaints) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Presenting complaints</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              <PatientDetailField
                label="Chief complaints / history"
                value={proforma.presenting_complaints}
                className="md:col-span-2"
              />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showSchool && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>School information</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.school_name) && (
                <PatientDetailField label="School name" value={proforma.school_name} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.school_class) && (
                <PatientDetailField label="Class / grade" value={proforma.school_class} />
              )}
              {hasDisplay(proforma.school_type) && (
                <PatientDetailField
                  label="School type"
                  value={labelForValue(proforma.school_type, CHILD_CLINICAL_SCHOOL_TYPE_OPTIONS)}
                />
              )}
              {hasDisplay(proforma.academic_performance) && (
                <PatientDetailField
                  label="Academic performance"
                  value={labelForValue(
                    proforma.academic_performance,
                    CHILD_CLINICAL_ACADEMIC_PERFORMANCE_OPTIONS
                  )}
                />
              )}
              {typeof proforma.school_refusal === 'boolean' && (
                <PatientDetailField
                  label="School refusal"
                  value={proforma.school_refusal ? 'Yes' : 'No'}
                />
              )}
              {hasDisplay(proforma.bullying) && (
                <PatientDetailField
                  label="Bullying"
                  value={labelForValue(proforma.bullying, CHILD_CLINICAL_BULLYING_OPTIONS)}
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showSymptomDomains && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Symptoms & concerns</PatientDetailSectionTitle>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <PatientDetailFieldGroup>
              <CheckboxSummary
                label="Neurodevelopmental concerns"
                fieldValue={proforma.neurodevelopmental_concerns}
                options={CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS}
              />
              {hasDisplay(proforma.neurodevelopmental_description) && (
                <PatientDetailField
                  label="Neurodevelopmental — notes"
                  value={proforma.neurodevelopmental_description}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Behavioural concerns"
                fieldValue={proforma.behavioral_concerns}
                options={CHILD_CLINICAL_BEHAVIORAL_CONCERNS}
              />
              {hasDisplay(proforma.behavioral_description) && (
                <PatientDetailField
                  label="Behavioural — notes"
                  value={proforma.behavioral_description}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Emotional & psychological"
                fieldValue={proforma.emotional_psychological_symptoms}
                options={CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS}
              />
              {hasDisplay(proforma.emotional_psychological_description) && (
                <PatientDetailField
                  label="Emotional & psychological — notes"
                  value={proforma.emotional_psychological_description}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Trauma & psychosocial stressors"
                fieldValue={proforma.trauma_psychosocial_stressors}
                options={CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS}
              />
              {hasDisplay(proforma.trauma_description) && (
                <PatientDetailField
                  label="Trauma / stressors — notes"
                  value={proforma.trauma_description}
                  className="md:col-span-2"
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showMedicalFamily && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Medical & family history</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.associated_medical_illness) && (
                <PatientDetailField
                  label="Associated medical illness"
                  value={proforma.associated_medical_illness}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.developmental_history) && (
                <PatientDetailField
                  label="Developmental history"
                  value={proforma.developmental_history}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Family history (psychiatric)"
                fieldValue={proforma.family_history}
                options={CHILD_CLINICAL_FAMILY_HISTORY_NEW}
              />
              {hasDisplay(proforma.family_history_details) && (
                <PatientDetailField
                  label="Family history — details"
                  value={proforma.family_history_details}
                  className="md:col-span-2"
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {joinFromOptions(proforma.risk_assessment, CHILD_CLINICAL_RISK_ASSESSMENT) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Risk assessment</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              <CheckboxSummary
                label="Risks identified"
                fieldValue={proforma.risk_assessment}
                options={CHILD_CLINICAL_RISK_ASSESSMENT}
              />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showMse && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Mental status examination</PatientDetailSectionTitle>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.mse_appearance_behaviour) && (
                <PatientDetailField
                  label="Appearance & behaviour"
                  value={proforma.mse_appearance_behaviour}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.mse_rapport) && (
                <PatientDetailField label="Rapport" value={proforma.mse_rapport} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_speech) && (
                <PatientDetailField label="Speech" value={proforma.mse_speech} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_mood_affect) && (
                <PatientDetailField label="Mood & affect" value={proforma.mse_mood_affect} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_thought) && (
                <PatientDetailField label="Thought" value={proforma.mse_thought} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_perception) && (
                <PatientDetailField label="Perception" value={proforma.mse_perception} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_cognition) && (
                <PatientDetailField label="Cognition" value={proforma.mse_cognition} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.mse_insight_judgment) && (
                <PatientDetailField
                  label="Insight & judgment"
                  value={proforma.mse_insight_judgment}
                  className="md:col-span-2"
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {showPlan && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Diagnosis, investigations & plan</PatientDetailSectionTitle>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.provisional_diagnosis) && (
                <PatientDetailField
                  label="Provisional diagnosis"
                  value={proforma.provisional_diagnosis}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Investigations required"
                fieldValue={proforma.investigations_required}
                options={CHILD_CLINICAL_INVESTIGATIONS_REQUIRED}
              />
              {hasDisplay(proforma.pharmacological_treatment) && (
                <PatientDetailField
                  label="Pharmacological treatment"
                  value={proforma.pharmacological_treatment}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="Psychological treatment"
                fieldValue={proforma.psychological_treatment}
                options={CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS}
              />
              {hasDisplay(proforma.high_risk_management) && (
                <PatientDetailField
                  label="High-risk management"
                  value={proforma.high_risk_management}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.follow_up_after) && (
                <PatientDetailField label="Follow-up after" value={proforma.follow_up_after} />
              )}
              {hasDisplay(proforma.referred_to) && (
                <PatientDetailField label="Referred to" value={proforma.referred_to} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.disposal_status) && (
                <PatientDetailField label="Disposal status" value={proforma.disposal_status} />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}
    </div>
  );
}
