import { useMemo } from 'react';
import { useGetAllClinicalOptionsQuery } from '../features/clinical/clinicalApiSlice';
import { formatDate } from '../utils/formatters';
import { getDoctorDecisionLabel } from '../utils/enumMappings';
import {
  PatientDetailCardShell,
  PatientDetailSectionTitle,
  PatientDetailFieldGroup,
  PatientDetailField,
} from './PatientDetailReadOnlyCard';

const ONSET_DURATION_LABELS = {
  '<1_week': '1. < 1 week',
  '1w_1m': '2. 1 week – 1 month',
  '>1_month': '3. > 1 month',
  not_known: '4. Not known',
};

function normalizeArrayField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch {
      if (value.includes(',')) {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
      return value.trim() ? [value.trim()] : [];
    }
  }
  return value ? [value] : [];
}

function hasDisplay(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return String(value).trim() !== '';
}

function labelsFromOptions(selectedValues, options) {
  if (!options?.length) return selectedValues.join(', ');
  return selectedValues
    .map((val) => {
      const opt = options.find((o) => o.value === val);
      return opt ? opt.label : val;
    })
    .join(', ');
}

function formatMaybeDate(raw) {
  if (!raw) return '';
  const s = String(raw);
  if (s.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      return formatDate(s.split('T')[0]);
    } catch {
      return s;
    }
  }
  return s;
}

function CheckboxSummary({ label, fieldValue, options }) {
  const vals = normalizeArrayField(fieldValue);
  if (!vals.length) return null;
  const text = labelsFromOptions(vals, options || []);
  return <PatientDetailField label={label} value={text} className="md:col-span-2" />;
}

/**
 * Walk-in clinical proforma: read-only tiles (same visual language as Patient Details view).
 * Only sections / fields with recorded data are rendered.
 */
export default function WalkInClinicalProformaSummaryView({ proforma, patient }) {
  const { data: allOptionsData } = useGetAllClinicalOptionsQuery();
  const clinicalOptions = allOptionsData || {};

  const visitDate = proforma?.visit_date
    ? formatDate(
        String(proforma.visit_date).includes('T')
          ? proforma.visit_date.split('T')[0]
          : proforma.visit_date
      )
    : '';

  const onsetLabel = proforma?.onset_duration
    ? ONSET_DURATION_LABELS[proforma.onset_duration] || proforma.onset_duration
    : '';

  const informantLabel =
    proforma?.informant_present === true
      ? 'Present'
      : proforma?.informant_present === false
        ? 'Absent'
        : '';

  const hasAnyClinicalContent = useMemo(() => {
    if (!proforma) return false;
    const checks = [
      visitDate,
      patient?.name,
      proforma.patient_name,
      patient?.age,
      patient?.sex,
      informantLabel,
      proforma.informant_who,
      proforma.nature_of_information,
      onsetLabel,
      proforma.course,
      proforma.precipitating_factor,
      proforma.illness_duration,
      proforma.current_episode_since,
      ...normalizeArrayField(proforma.mood),
      ...normalizeArrayField(proforma.behaviour),
      ...normalizeArrayField(proforma.speech),
      ...normalizeArrayField(proforma.thought),
      ...normalizeArrayField(proforma.perception),
      ...normalizeArrayField(proforma.somatic),
      ...normalizeArrayField(proforma.bio_functions),
      ...normalizeArrayField(proforma.adjustment),
      ...normalizeArrayField(proforma.cognitive_function),
      ...normalizeArrayField(proforma.fits),
      ...normalizeArrayField(proforma.sexual_problem),
      ...normalizeArrayField(proforma.substance_use),
      ...normalizeArrayField(proforma.associated_medical_surgical),
      proforma.past_history,
      proforma.family_history,
      ...normalizeArrayField(proforma.mse_behaviour),
      ...normalizeArrayField(proforma.mse_affect),
      ...normalizeArrayField(proforma.mse_thought),
      proforma.mse_delusions,
      ...normalizeArrayField(proforma.mse_perception),
      ...normalizeArrayField(proforma.mse_cognitive_function),
      proforma.gpe,
      proforma.diagnosis,
      proforma.icd_code,
      proforma.doctor_decision,
      proforma.disposal,
      proforma.referred_to,
      proforma.treatment_prescribed,
      proforma.workup_appointment,
      proforma.adl_reasoning,
      proforma.requires_adl_file,
    ];
    return checks.some((v) => {
      if (typeof v === 'boolean') return v;
      return hasDisplay(v);
    });
  }, [proforma, patient, visitDate, informantLabel, onsetLabel]);

  if (!proforma) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
        No clinical proforma data.
      </div>
    );
  }

  if (!hasAnyClinicalContent) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
        No responses recorded on this walk-in clinical proforma.
      </div>
    );
  }

  const showVisitBlock =
    hasDisplay(visitDate) ||
    hasDisplay(patient?.name || proforma.patient_name) ||
    hasDisplay(patient?.age) ||
    hasDisplay(patient?.sex);

  return (
    <div className="walk-in-clinical-proforma-summary space-y-6">
      {showVisitBlock && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Visit</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(visitDate) && <PatientDetailField label="Visit date" value={visitDate} />}
              {hasDisplay(patient?.name || proforma.patient_name) && (
                <PatientDetailField label="Patient name" value={patient?.name || proforma.patient_name} />
              )}
              {hasDisplay(patient?.age) && <PatientDetailField label="Age" value={patient?.age} />}
              {hasDisplay(patient?.sex) && <PatientDetailField label="Sex" value={patient?.sex} />}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(hasDisplay(informantLabel) ||
        (proforma.informant_present === true && hasDisplay(proforma.informant_who)) ||
        hasDisplay(proforma.nature_of_information)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Informant</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(informantLabel) && (
                <PatientDetailField label="Informant" value={informantLabel} />
              )}
              {proforma.informant_present === true && hasDisplay(proforma.informant_who) && (
                <PatientDetailField
                  label="Who is present with the patient?"
                  value={proforma.informant_who}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.nature_of_information) && (
                <PatientDetailField label="Nature of information" value={proforma.nature_of_information} />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(hasDisplay(onsetLabel) ||
        hasDisplay(proforma.course) ||
        hasDisplay(proforma.precipitating_factor) ||
        hasDisplay(proforma.illness_duration) ||
        hasDisplay(proforma.current_episode_since)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Illness course</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(onsetLabel) && <PatientDetailField label="Onset duration" value={onsetLabel} />}
              {hasDisplay(proforma.course) && <PatientDetailField label="Course" value={proforma.course} />}
              {hasDisplay(proforma.precipitating_factor) && (
                <PatientDetailField
                  label="Precipitating factor"
                  value={proforma.precipitating_factor}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.illness_duration) && (
                <PatientDetailField label="Total duration of illness" value={proforma.illness_duration} />
              )}
              {hasDisplay(proforma.current_episode_since) && (
                <PatientDetailField
                  label="Current episode / worsening since"
                  value={formatMaybeDate(proforma.current_episode_since)}
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(normalizeArrayField(proforma.mood).length > 0 ||
        normalizeArrayField(proforma.behaviour).length > 0 ||
        normalizeArrayField(proforma.speech).length > 0 ||
        normalizeArrayField(proforma.thought).length > 0 ||
        normalizeArrayField(proforma.perception).length > 0 ||
        normalizeArrayField(proforma.somatic).length > 0 ||
        normalizeArrayField(proforma.bio_functions).length > 0 ||
        normalizeArrayField(proforma.adjustment).length > 0 ||
        normalizeArrayField(proforma.cognitive_function).length > 0 ||
        normalizeArrayField(proforma.fits).length > 0 ||
        normalizeArrayField(proforma.sexual_problem).length > 0 ||
        normalizeArrayField(proforma.substance_use).length > 0) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Complaints / HOPI</PatientDetailSectionTitle>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <PatientDetailFieldGroup>
              <CheckboxSummary label="Mood" fieldValue={proforma.mood} options={clinicalOptions.mood} />
              <CheckboxSummary label="Behaviour" fieldValue={proforma.behaviour} options={clinicalOptions.behaviour} />
              <CheckboxSummary label="Speech" fieldValue={proforma.speech} options={clinicalOptions.speech} />
              <CheckboxSummary label="Thought" fieldValue={proforma.thought} options={clinicalOptions.thought} />
              <CheckboxSummary
                label="Perception"
                fieldValue={proforma.perception}
                options={clinicalOptions.perception}
              />
              <CheckboxSummary label="Somatic" fieldValue={proforma.somatic} options={clinicalOptions.somatic} />
              <CheckboxSummary
                label="Bio-functions"
                fieldValue={proforma.bio_functions}
                options={clinicalOptions.bio_functions}
              />
              <CheckboxSummary
                label="Adjustment"
                fieldValue={proforma.adjustment}
                options={clinicalOptions.adjustment}
              />
              <CheckboxSummary
                label="Cognitive function"
                fieldValue={proforma.cognitive_function}
                options={clinicalOptions.cognitive_function}
              />
              <CheckboxSummary label="Fits" fieldValue={proforma.fits} options={clinicalOptions.fits} />
              <CheckboxSummary
                label="Sexual problem"
                fieldValue={proforma.sexual_problem}
                options={clinicalOptions.sexual_problem}
              />
              <CheckboxSummary
                label="Substance use"
                fieldValue={proforma.substance_use}
                options={clinicalOptions.substance_use}
              />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(hasDisplay(proforma.past_history) ||
        hasDisplay(proforma.family_history) ||
        normalizeArrayField(proforma.associated_medical_surgical).length > 0) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Additional history</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.past_history) && (
                <PatientDetailField
                  label="Past psychiatric history"
                  value={proforma.past_history}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.family_history) && (
                <PatientDetailField label="Family history" value={proforma.family_history} className="md:col-span-2" />
              )}
              <CheckboxSummary
                label="Associated medical / surgical illness"
                fieldValue={proforma.associated_medical_surgical}
                options={clinicalOptions.associated_medical_surgical}
              />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(normalizeArrayField(proforma.mse_behaviour).length > 0 ||
        normalizeArrayField(proforma.mse_affect).length > 0 ||
        normalizeArrayField(proforma.mse_thought).length > 0 ||
        hasDisplay(proforma.mse_delusions) ||
        normalizeArrayField(proforma.mse_perception).length > 0 ||
        normalizeArrayField(proforma.mse_cognitive_function).length > 0) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Mental state examination</PatientDetailSectionTitle>
          </div>
          <div className="space-y-3 px-5 pb-5">
            <PatientDetailFieldGroup>
              <CheckboxSummary
                label="MSE — Behaviour"
                fieldValue={proforma.mse_behaviour}
                options={clinicalOptions.mse_behaviour}
              />
              <CheckboxSummary
                label="MSE — Affect & mood"
                fieldValue={proforma.mse_affect}
                options={clinicalOptions.mse_affect}
              />
              <CheckboxSummary
                label="MSE — Thought (flow, form, content)"
                fieldValue={proforma.mse_thought}
                options={clinicalOptions.mse_thought}
              />
              {hasDisplay(proforma.mse_delusions) && (
                <PatientDetailField
                  label="Delusions / ideas of reference (notes)"
                  value={proforma.mse_delusions}
                  className="md:col-span-2"
                />
              )}
              <CheckboxSummary
                label="MSE — Perception"
                fieldValue={proforma.mse_perception}
                options={clinicalOptions.mse_perception}
              />
              <CheckboxSummary
                label="MSE — Cognitive functions"
                fieldValue={proforma.mse_cognitive_function}
                options={clinicalOptions.mse_cognitive_function}
              />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {(hasDisplay(proforma.gpe) ||
        hasDisplay(proforma.diagnosis) ||
        hasDisplay(proforma.icd_code) ||
        hasDisplay(proforma.doctor_decision) ||
        hasDisplay(proforma.disposal) ||
        hasDisplay(proforma.referred_to) ||
        hasDisplay(proforma.treatment_prescribed) ||
        hasDisplay(proforma.workup_appointment) ||
        proforma.requires_adl_file ||
        hasDisplay(proforma.adl_reasoning)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Examination & management</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              {hasDisplay(proforma.gpe) && (
                <PatientDetailField label="GPE findings" value={proforma.gpe} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.diagnosis) && (
                <PatientDetailField label="Diagnosis" value={proforma.diagnosis} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.icd_code) && <PatientDetailField label="ICD code" value={proforma.icd_code} />}
              {hasDisplay(proforma.doctor_decision) && (
                <PatientDetailField
                  label="Doctor decision"
                  value={getDoctorDecisionLabel(proforma.doctor_decision) || proforma.doctor_decision}
                />
              )}
              {hasDisplay(proforma.disposal) && (
                <PatientDetailField label="Disposal & referral" value={proforma.disposal} className="md:col-span-2" />
              )}
              {hasDisplay(proforma.referred_to) && (
                <PatientDetailField label="Referred to" value={proforma.referred_to} />
              )}
              {hasDisplay(proforma.treatment_prescribed) && (
                <PatientDetailField
                  label="Treatment prescribed"
                  value={proforma.treatment_prescribed}
                  className="md:col-span-2"
                />
              )}
              {hasDisplay(proforma.workup_appointment) && (
                <PatientDetailField
                  label="Work-up appointment"
                  value={formatMaybeDate(proforma.workup_appointment)}
                />
              )}
              {proforma.requires_adl_file && (
                <PatientDetailField label="Requires Out Patient Intake Record" value="Yes" />
              )}
              {hasDisplay(proforma.adl_reasoning) && (
                <PatientDetailField
                  label="Out Patient Intake Record reasoning"
                  value={proforma.adl_reasoning}
                  className="md:col-span-2"
                />
              )}
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}
    </div>
  );
}
