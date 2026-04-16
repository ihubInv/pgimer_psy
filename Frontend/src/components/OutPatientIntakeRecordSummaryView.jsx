import React, { useMemo } from 'react';
import { useGetPatientFilesQuery } from '../features/patients/patientFilesApiSlice';
import { formatDate } from '../utils/formatters';
import {
  PatientDetailCardShell,
  PatientDetailSectionTitle,
  PatientDetailFieldGroup,
  PatientDetailField,
} from './PatientDetailReadOnlyCard';
import FilePreview from './FilePreview';
import { FiFileText } from 'react-icons/fi';

function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function hasRecorded(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return String(value).trim() !== '';
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

function Val({ label, value, className = '' }) {
  if (!hasRecorded(value)) return null;
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value).trim();
  return <PatientDetailField label={label} value={display} className={className} />;
}

function SectionBlock({ title, children }) {
  const visible = React.Children.toArray(children).filter(Boolean);
  if (!visible.length) return null;
  return (
    <PatientDetailCardShell className="mb-0">
      <div className="px-5 pt-5">
        <PatientDetailSectionTitle>{title}</PatientDetailSectionTitle>
      </div>
      <div className="space-y-4 px-5 pb-5">
        <PatientDetailFieldGroup>{visible}</PatientDetailFieldGroup>
      </div>
    </PatientDetailCardShell>
  );
}

/**
 * Out Patient Intake Record (ADL): read-only tiles like Patient Details.
 * Only fields with recorded values are shown.
 */
export default function OutPatientIntakeRecordSummaryView({ adlFile, patient: patientProp }) {
  const patientId = adlFile?.patient_id || patientProp?.id;
  const { data: patientFilesData } = useGetPatientFilesQuery(patientId, { skip: !patientId });
  const existingFiles = patientFilesData?.data?.files || [];

  const patient = patientProp;

  const informants = useMemo(() => parseArray(adlFile?.informants), [adlFile?.informants]);
  const complaintsPatient = useMemo(() => parseArray(adlFile?.complaints_patient), [adlFile?.complaints_patient]);
  const complaintsInformant = useMemo(() => parseArray(adlFile?.complaints_informant), [adlFile?.complaints_informant]);
  const familyHistorySiblings = useMemo(() => parseArray(adlFile?.family_history_siblings), [adlFile?.family_history_siblings]);
  const occupationJobs = useMemo(() => parseArray(adlFile?.occupation_jobs), [adlFile?.occupation_jobs]);
  const sexualChildren = useMemo(() => parseArray(adlFile?.sexual_children), [adlFile?.sexual_children]);
  const livingResidents = useMemo(() => parseArray(adlFile?.living_residents), [adlFile?.living_residents]);
  const livingInlaws = useMemo(() => parseArray(adlFile?.living_inlaws), [adlFile?.living_inlaws]);
  const premorbidPersonalityTraits = useMemo(
    () => parseArray(adlFile?.premorbid_personality_traits),
    [adlFile?.premorbid_personality_traits]
  );

  if (!adlFile) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
        No Out Patient Intake Record on file.
      </div>
    );
  }

  const cityDistrict =
    (() => {
      const city = patient?.city || patient?.present_city_town_village || '';
      const district = patient?.district || patient?.present_district || '';
      if (city && district) return `${city}, ${district}`;
      return city || district || '';
    })();

  const patientDate =
    patient?.date && String(patient.date).includes('T') ? patient.date.split('T')[0] : patient?.date;

  const showIdentifiers =
    hasRecorded(adlFile.adl_no) ||
    hasRecorded(patientDate) ||
    hasRecorded(patient?.name) ||
    hasRecorded(patient?.age) ||
    hasRecorded(patient?.sex) ||
    hasRecorded(patient?.psy_no) ||
    hasRecorded(patient?.marital_status) ||
    hasRecorded(patient?.education || patient?.education_level) ||
    hasRecorded(patient?.occupation) ||
    hasRecorded(cityDistrict);

  return (
    <div className="out-patient-intake-record-summary space-y-6">
      {showIdentifiers && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Patient information</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              <Val label="Out Patient Intake Record No." value={adlFile.adl_no} />
              <Val label="Date" value={patientDate ? formatMaybeDate(patientDate) : ''} />
              <Val label="Patient name" value={patient?.name} />
              <Val label="Age" value={patient?.age} />
              <Val label="Sex" value={patient?.sex} />
              <Val label="Psy. No." value={patient?.psy_no} />
              <Val label="Marital status" value={patient?.marital_status} />
              <Val label="Education" value={patient?.education || patient?.education_level} />
              <Val label="Occupation" value={patient?.occupation} />
              <Val label="City / district" value={cityDistrict} className="md:col-span-2" />
            </PatientDetailFieldGroup>
          </div>
        </PatientDetailCardShell>
      )}

      {informants.some((i) => hasRecorded(i?.name) || hasRecorded(i?.relationship) || hasRecorded(i?.reliability)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Informants</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {informants.map((inf, index) => {
              const any =
                hasRecorded(inf?.relationship) || hasRecorded(inf?.name) || hasRecorded(inf?.reliability);
              if (!any) return null;
              return (
                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Informant {index + 1}
                  </p>
                  <PatientDetailFieldGroup>
                    <Val label="Relationship" value={inf?.relationship} />
                    <Val label="Name" value={inf?.name} />
                    <Val
                      label="Reliability / ability to report"
                      value={inf?.reliability}
                      className="md:col-span-2"
                    />
                  </PatientDetailFieldGroup>
                </div>
              );
            })}
          </div>
        </PatientDetailCardShell>
      )}

      {(complaintsPatient.some((c) => hasRecorded(c?.complaint) || hasRecorded(c?.duration)) ||
        complaintsInformant.some((c) => hasRecorded(c?.complaint) || hasRecorded(c?.duration)) ||
        hasRecorded(adlFile.onset_duration) ||
        hasRecorded(adlFile.precipitating_factor) ||
        hasRecorded(adlFile.course)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Complaints & course</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {complaintsPatient.some((c) => hasRecorded(c?.complaint)) && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800">Chief complaints (patient)</p>
                {complaintsPatient.map((c, i) =>
                  hasRecorded(c?.complaint) || hasRecorded(c?.duration) ? (
                    <PatientDetailFieldGroup key={`cp-${i}`}>
                      <Val label={`Complaint ${i + 1}`} value={c?.complaint} className="md:col-span-2" />
                      <Val label="Duration" value={c?.duration} />
                    </PatientDetailFieldGroup>
                  ) : null
                )}
              </div>
            )}
            {complaintsInformant.some((c) => hasRecorded(c?.complaint)) && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800">Chief complaints (informant)</p>
                {complaintsInformant.map((c, i) =>
                  hasRecorded(c?.complaint) || hasRecorded(c?.duration) ? (
                    <PatientDetailFieldGroup key={`ci-${i}`}>
                      <Val label={`Complaint ${i + 1}`} value={c?.complaint} className="md:col-span-2" />
                      <Val label="Duration" value={c?.duration} />
                    </PatientDetailFieldGroup>
                  ) : null
                )}
              </div>
            )}
            {(hasRecorded(adlFile.onset_duration) ||
              hasRecorded(adlFile.precipitating_factor) ||
              hasRecorded(adlFile.course)) && (
              <PatientDetailFieldGroup>
                <Val label="Onset" value={adlFile.onset_duration} />
                <Val label="Precipitating factor" value={adlFile.precipitating_factor} className="md:col-span-2" />
                <Val label="Course" value={adlFile.course} />
              </PatientDetailFieldGroup>
            )}
          </div>
        </PatientDetailCardShell>
      )}

      <SectionBlock title="History of present illness">
        <Val label="A. Spontaneous narrative" value={adlFile.history_narrative} className="md:col-span-2" />
        <Val label="B. Specific enquiry" value={adlFile.history_specific_enquiry} className="md:col-span-2" />
        <Val label="C. Drug intake" value={adlFile.history_drug_intake} className="md:col-span-2" />
        <Val label="D. Treatment — place" value={adlFile.history_treatment_place} />
        <Val label="D. Treatment — dates" value={adlFile.history_treatment_dates} />
        <Val label="D. Treatment — drugs" value={adlFile.history_treatment_drugs} className="md:col-span-2" />
        <Val label="D. Treatment — response" value={adlFile.history_treatment_response} className="md:col-span-2" />
      </SectionBlock>

      <SectionBlock title="Past history">
        <Val label="A. Medical (injuries & operations)" value={adlFile.past_history_medical} className="md:col-span-2" />
        <Val label="B. Psychiatric — dates" value={adlFile.past_history_psychiatric_dates} />
        <Val
          label="B. Psychiatric — diagnosis / salient features"
          value={adlFile.past_history_psychiatric_diagnosis}
          className="md:col-span-2"
        />
        <Val label="B. Psychiatric — treatment" value={adlFile.past_history_psychiatric_treatment} className="md:col-span-2" />
        <Val label="B. Psychiatric — interim history" value={adlFile.past_history_psychiatric_interim} className="md:col-span-2" />
        <Val label="B. Psychiatric — recovery / socialization" value={adlFile.past_history_psychiatric_recovery} className="md:col-span-2" />
      </SectionBlock>

      {(hasRecorded(adlFile.family_history_father_age) ||
        hasRecorded(adlFile.family_history_father_education) ||
        hasRecorded(adlFile.family_history_father_occupation) ||
        typeof adlFile.family_history_father_deceased === 'boolean' ||
        hasRecorded(adlFile.family_history_father_death_age) ||
        hasRecorded(adlFile.family_history_father_death_date) ||
        hasRecorded(adlFile.family_history_father_death_cause) ||
        hasRecorded(adlFile.family_history_father_personality) ||
        hasRecorded(adlFile.family_history_mother_age) ||
        hasRecorded(adlFile.family_history_mother_education) ||
        hasRecorded(adlFile.family_history_mother_occupation) ||
        typeof adlFile.family_history_mother_deceased === 'boolean' ||
        hasRecorded(adlFile.family_history_mother_death_age) ||
        hasRecorded(adlFile.family_history_mother_death_date) ||
        hasRecorded(adlFile.family_history_mother_death_cause) ||
        hasRecorded(adlFile.family_history_mother_personality) ||
        familyHistorySiblings.some((s) => Object.values(s || {}).some((x) => hasRecorded(x)))) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Family history</PatientDetailSectionTitle>
          </div>
          <div className="space-y-6 px-5 pb-5">
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-800">Father</p>
              <PatientDetailFieldGroup>
                <Val label="Age" value={adlFile.family_history_father_age} />
                <Val label="Education" value={adlFile.family_history_father_education} />
                <Val label="Occupation" value={adlFile.family_history_father_occupation} />
                <Val label="Deceased" value={adlFile.family_history_father_deceased} />
                {adlFile.family_history_father_deceased && (
                  <>
                    <Val label="Age at death" value={adlFile.family_history_father_death_age} />
                    <Val label="Date of death" value={formatMaybeDate(adlFile.family_history_father_death_date)} />
                    <Val
                      label="Cause of death"
                      value={adlFile.family_history_father_death_cause}
                      className="md:col-span-2"
                    />
                  </>
                )}
                <Val
                  label="Personality & relationship with patient"
                  value={adlFile.family_history_father_personality}
                  className="md:col-span-2"
                />
              </PatientDetailFieldGroup>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">Mother</p>
              <PatientDetailFieldGroup>
                <Val label="Age" value={adlFile.family_history_mother_age} />
                <Val label="Education" value={adlFile.family_history_mother_education} />
                <Val label="Occupation" value={adlFile.family_history_mother_occupation} />
                <Val label="Deceased" value={adlFile.family_history_mother_deceased} />
                {adlFile.family_history_mother_deceased && (
                  <>
                    <Val label="Age at death" value={adlFile.family_history_mother_death_age} />
                    <Val label="Date of death" value={formatMaybeDate(adlFile.family_history_mother_death_date)} />
                    <Val
                      label="Cause of death"
                      value={adlFile.family_history_mother_death_cause}
                      className="md:col-span-2"
                    />
                  </>
                )}
                <Val
                  label="Personality & relationship with patient"
                  value={adlFile.family_history_mother_personality}
                  className="md:col-span-2"
                />
              </PatientDetailFieldGroup>
            </div>
            {familyHistorySiblings.some((s) => Object.values(s || {}).some((x) => hasRecorded(x))) && (
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Siblings</p>
                {familyHistorySiblings.map((sibling, index) => {
                  const row = ['age', 'sex', 'education', 'occupation', 'marital_status'].some((k) =>
                    hasRecorded(sibling?.[k])
                  );
                  if (!row) return null;
                  return (
                    <div key={index} className="mb-4 last:mb-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Sibling {index + 1}
                      </p>
                      <PatientDetailFieldGroup>
                        <Val label="Age" value={sibling?.age} />
                        <Val label="Sex" value={sibling?.sex} />
                        <Val label="Education" value={sibling?.education} />
                        <Val label="Occupation" value={sibling?.occupation} />
                        <Val label="Marital status" value={sibling?.marital_status} />
                      </PatientDetailFieldGroup>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PatientDetailCardShell>
      )}

      <SectionBlock title="Home situation & early development">
        <Val label="Childhood home situation" value={adlFile.home_situation_childhood} className="md:col-span-2" />
        <Val label="Parents' relationship" value={adlFile.home_situation_parents_relationship} className="md:col-span-2" />
        <Val label="Socioeconomic status" value={adlFile.home_situation_socioeconomic} className="md:col-span-2" />
        <Val label="Interpersonal relationships" value={adlFile.home_situation_interpersonal} className="md:col-span-2" />
        <Val label="Birth date" value={formatMaybeDate(adlFile.personal_birth_date)} />
        <Val label="Birth place" value={adlFile.personal_birth_place} />
        <Val label="Delivery type" value={adlFile.personal_delivery_type} />
        <Val label="Prenatal complications" value={adlFile.personal_complications_prenatal} className="md:col-span-2" />
        <Val label="Natal complications" value={adlFile.personal_complications_natal} className="md:col-span-2" />
        <Val label="Postnatal complications" value={adlFile.personal_complications_postnatal} className="md:col-span-2" />
        <Val label="Weaning age" value={adlFile.development_weaning_age} />
        <Val label="First words" value={adlFile.development_first_words} />
        <Val label="Three-word sentences" value={adlFile.development_three_words} />
        <Val label="Walking age" value={adlFile.development_walking} />
        <Val label="Neurotic traits" value={adlFile.development_neurotic_traits} className="md:col-span-2" />
        <Val label="Nail biting" value={adlFile.development_nail_biting} />
        <Val label="Bedwetting" value={adlFile.development_bedwetting} />
        <Val label="Phobias" value={adlFile.development_phobias} className="md:col-span-2" />
        <Val label="Childhood illness" value={adlFile.development_childhood_illness} className="md:col-span-2" />
      </SectionBlock>

      <SectionBlock title="Education">
        <Val label="Age at start of education" value={adlFile.education_start_age} />
        <Val label="Highest class passed" value={adlFile.education_highest_class} />
        <Val label="Performance" value={adlFile.education_performance} className="md:col-span-2" />
        <Val label="Disciplinary problems" value={adlFile.education_disciplinary} className="md:col-span-2" />
        <Val label="Peer relationships" value={adlFile.education_peer_relationship} className="md:col-span-2" />
        <Val label="Hobbies & interests" value={adlFile.education_hobbies} className="md:col-span-2" />
        <Val label="Special abilities" value={adlFile.education_special_abilities} className="md:col-span-2" />
        <Val label="Reason for discontinuing" value={adlFile.education_discontinue_reason} className="md:col-span-2" />
      </SectionBlock>

      {occupationJobs.some((j) =>
        ['job', 'dates', 'adjustment', 'difficulties', 'promotions', 'change_reason'].some((k) => hasRecorded(j?.[k]))
      ) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Occupation</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {occupationJobs.map((job, index) => {
              const any = ['job', 'dates', 'adjustment', 'difficulties', 'promotions', 'change_reason'].some((k) =>
                hasRecorded(job?.[k])
              );
              if (!any) return null;
              return (
                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Job {index + 1}</p>
                  <PatientDetailFieldGroup>
                    <Val label="Job title" value={job?.job} className="md:col-span-2" />
                    <Val label="Dates" value={job?.dates} />
                    <Val label="Adjustment" value={job?.adjustment} className="md:col-span-2" />
                    <Val label="Difficulties" value={job?.difficulties} className="md:col-span-2" />
                    <Val label="Promotions" value={job?.promotions} />
                    <Val label="Reason for change" value={job?.change_reason} className="md:col-span-2" />
                  </PatientDetailFieldGroup>
                </div>
              );
            })}
          </div>
        </PatientDetailCardShell>
      )}

      <SectionBlock title="Sexual & marital history">
        <Val label="Menarche age" value={adlFile.sexual_menarche_age} />
        <Val label="Reaction to menarche" value={adlFile.sexual_menarche_reaction} className="md:col-span-2" />
        <Val label="Sexual education" value={adlFile.sexual_education} className="md:col-span-2" />
        <Val label="Masturbation" value={adlFile.sexual_masturbation} className="md:col-span-2" />
        <Val label="Sexual contact" value={adlFile.sexual_contact} className="md:col-span-2" />
        <Val label="Marriage date" value={formatMaybeDate(adlFile.sexual_marriage_date)} />
        <Val label="Marital adjustment" value={adlFile.sexual_marital_adjustment} className="md:col-span-2" />
        <Val label="Sexual adjustment" value={adlFile.sexual_sexual_adjustment} className="md:col-span-2" />
      </SectionBlock>

      {sexualChildren.some((ch) => hasRecorded(ch?.age) || hasRecorded(ch?.sex) || hasRecorded(ch?.health)) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Children</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {sexualChildren.map((child, index) => {
              if (!hasRecorded(child?.age) && !hasRecorded(child?.sex) && !hasRecorded(child?.health)) return null;
              return (
                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Child {index + 1}</p>
                  <PatientDetailFieldGroup>
                    <Val label="Age" value={child?.age} />
                    <Val label="Sex" value={child?.sex} />
                    <Val label="Health" value={child?.health} />
                  </PatientDetailFieldGroup>
                </div>
              );
            })}
          </div>
        </PatientDetailCardShell>
      )}

      <SectionBlock title="Religion">
        <Val label="Religious beliefs & practices" value={adlFile.religion} className="md:col-span-2" />
      </SectionBlock>

      {(hasRecorded(adlFile.living_type) ||
        hasRecorded(adlFile.living_rooms) ||
        hasRecorded(adlFile.living_relationship) ||
        livingResidents.length > 0 ||
        livingInlaws.length > 0) && (
        <PatientDetailCardShell className="mb-0">
          <div className="px-5 pt-5">
            <PatientDetailSectionTitle>Living situation</PatientDetailSectionTitle>
          </div>
          <div className="space-y-4 px-5 pb-5">
            <PatientDetailFieldGroup>
              <Val label="Type of residence" value={adlFile.living_type} />
              <Val label="Number of rooms" value={adlFile.living_rooms} />
              <Val label="Relationship with residents" value={adlFile.living_relationship} className="md:col-span-2" />
            </PatientDetailFieldGroup>
            {livingResidents.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Residents</p>
                <PatientDetailFieldGroup>
                  {livingResidents.map((resident, index) => {
                    const text =
                      typeof resident === 'string' ? resident : JSON.stringify(resident);
                    if (!hasRecorded(text)) return null;
                    return <Val key={index} label={`Resident ${index + 1}`} value={text} className="md:col-span-2" />;
                  })}
                </PatientDetailFieldGroup>
              </div>
            )}
            {livingInlaws.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">In-laws</p>
                <PatientDetailFieldGroup>
                  {livingInlaws.map((inlaw, index) => {
                    const text = typeof inlaw === 'string' ? inlaw : JSON.stringify(inlaw);
                    if (!hasRecorded(text)) return null;
                    return <Val key={index} label={`In-law ${index + 1}`} value={text} className="md:col-span-2" />;
                  })}
                </PatientDetailFieldGroup>
              </div>
            )}
          </div>
        </PatientDetailCardShell>
      )}

      {premorbidPersonalityTraits.length > 0 &&
        premorbidPersonalityTraits.some((t) =>
          hasRecorded(typeof t === 'string' ? t : JSON.stringify(t))
        ) && (
          <PatientDetailCardShell className="mb-0">
            <div className="px-5 pt-5">
              <PatientDetailSectionTitle>Premorbid personality</PatientDetailSectionTitle>
            </div>
            <div className="space-y-3 px-5 pb-5">
              <PatientDetailFieldGroup>
                {premorbidPersonalityTraits.map((trait, index) => {
                  const text = typeof trait === 'string' ? trait : JSON.stringify(trait);
                  if (!hasRecorded(text)) return null;
                  return <Val key={index} label={`Trait ${index + 1}`} value={text} className="md:col-span-2" />;
                })}
              </PatientDetailFieldGroup>
            </div>
          </PatientDetailCardShell>
        )}

      <SectionBlock title="Physical examination">
        <Val label="General appearance" value={adlFile.physical_general_appearance} className="md:col-span-2" />
        <Val label="Build" value={adlFile.physical_build} />
        <Val label="Nutrition" value={adlFile.physical_nutrition} />
        {typeof adlFile.physical_pallor === 'boolean' && <Val label="Pallor" value={adlFile.physical_pallor} />}
        {typeof adlFile.physical_icterus === 'boolean' && <Val label="Icterus" value={adlFile.physical_icterus} />}
        {typeof adlFile.physical_oedema === 'boolean' && <Val label="Oedema" value={adlFile.physical_oedema} />}
        {typeof adlFile.physical_lymphadenopathy === 'boolean' && (
          <Val label="Lymphadenopathy" value={adlFile.physical_lymphadenopathy} />
        )}
        <Val label="Other findings" value={adlFile.physical_other} className="md:col-span-2" />
      </SectionBlock>

      <SectionBlock title="Mental status examination (MSE)">
        <Val label="General appearance & behaviour" value={adlFile.mse_appearance} className="md:col-span-2" />
        <Val label="Speech" value={adlFile.mse_speech} className="md:col-span-2" />
        <Val label="Mood & affect" value={adlFile.mse_mood_affect} className="md:col-span-2" />
        <Val label="Thought process" value={adlFile.mse_thought_process} className="md:col-span-2" />
        <Val label="Thought content" value={adlFile.mse_thought_content} className="md:col-span-2" />
        <Val label="Perception" value={adlFile.mse_perception} className="md:col-span-2" />
        <Val label="Cognition" value={adlFile.mse_cognition} className="md:col-span-2" />
        <Val label="Insight" value={adlFile.mse_insight} className="md:col-span-2" />
        <Val label="Judgment" value={adlFile.mse_judgment} className="md:col-span-2" />
      </SectionBlock>

      <SectionBlock title="Diagnostic formulation">
        <Val label="Diagnostic formulation" value={adlFile.diagnostic_formulation} className="md:col-span-2" />
      </SectionBlock>

      <SectionBlock title="Final assessment">
        <Val label="Provisional diagnosis" value={adlFile.provisional_diagnosis} className="md:col-span-2" />
        <Val label="Treatment plan" value={adlFile.treatment_plan} className="md:col-span-2" />
        <Val label="Consultant comments" value={adlFile.consultant_comments} className="md:col-span-2" />
      </SectionBlock>

      {patientId && existingFiles.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
            <div className="rounded-lg bg-indigo-50 p-2">
              <FiFileText className="h-5 w-5 text-indigo-600" />
            </div>
            Patient documents & files
          </h4>
          <FilePreview
            files={existingFiles}
            patient_id={patientId}
            canDelete={false}
            baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
          />
        </div>
      )}
    </div>
  );
}
