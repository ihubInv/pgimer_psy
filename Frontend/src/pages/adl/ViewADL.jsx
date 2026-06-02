import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetADLFileByIdQuery } from '../../features/adl/adlApiSlice';
import { useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { useGetPatientFilesQuery } from '../../features/patients/patientFilesApiSlice';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import FilePreview from '../../components/FilePreview';
import { FiChevronDown, FiChevronUp, FiFileText, FiCalendar, FiUser, FiHome, FiX, FiArrowLeft } from 'react-icons/fi';
import { formatDate, formatDateTime } from '../../utils/formatters';
import Button from '../../components/Button';
import { VIEW_NESTED_PANEL_CLASS } from '../../utils/viewDetailsUi';
import {
  ADL_HISTORY_PRESENT_ILLNESS_PROMPTS,
  resolveHistoryPresentIllness,
} from '../../utils/adlHistoryPresentIllness';
import {
  ADL_PAST_HISTORY_PSYCHIATRIC_LABEL_LINE,
  resolvePastHistoryPsychiatric,
} from '../../utils/adlPastHistoryPsychiatric';
import {
  ADL_GENERAL_HOME_SITUATION_LABEL_LINE,
  resolveGeneralHomeSituation,
} from '../../utils/adlGeneralHomeSituation';
import {
  ADL_DEVELOPMENT_HISTORY_LABEL_LINE,
  resolveDevelopmentHistory,
} from '../../utils/adlDevelopmentHistory';
import {
  ADL_EDUCATION_HISTORY_LABEL_LINE,
  resolveEducationHistory,
} from '../../utils/adlEducationHistory';
import {
  ADL_OCCUPATION_HISTORY_LABEL_LINE,
  resolveOccupationHistory,
} from '../../utils/adlOccupationHistory';
import {
  ADL_SEXUAL_MARRIAGE_DETAILS_LABEL_LINE,
  resolveSexualMarriageDetails,
} from '../../utils/adlSexualMarriageDetails';
import {
  ADL_RELIGION_HISTORY_LABEL_LINE,
  resolveReligionHistory,
} from '../../utils/adlReligionHistory';
import {
  ADL_LIVING_SITUATION_HISTORY_LABEL_LINE,
  resolveLivingSituationHistory,
} from '../../utils/adlLivingSituationHistory';
import {
  ADL_PREMORBID_PERSONALITY_HISTORY_LABEL_LINE,
  resolvePremorbidPersonalityHistory,
} from '../../utils/adlPremorbidPersonalityHistory';
import {
  ADL_DIAGNOSTIC_FORMULATION_LABEL_LINE,
  ADL_FINAL_ASSESSMENT_LABEL_LINE,
  ADL_MSE_INSIGHT_LABEL_LINE,
  resolveDiagnosticFormulationHistory,
  resolveFinalAssessmentHistory,
  resolveMseInsightExamination,
} from '../../utils/adlClosingSections';

// Display Field Component with glassmorphism
const DisplayField = ({ label, value, icon, className = '', rows }) => {
  const displayValue = value || 'N/A';
  const isTextarea = rows && rows > 1;
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
      <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
        {label && (
          <label className={`flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 ${icon ? '' : 'block'}`}>
            {icon && <span className="text-primary-600">{icon}</span>}
            {label}
          </label>
        )}
        {isTextarea ? (
          <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{displayValue}</p>
        ) : (
          <p className="text-base font-medium text-gray-900">{displayValue}</p>
        )}
      </div>
    </div>
  );
};

const ViewADL = ( {adlFiles} ) => {
  const navigate = useNavigate();
  const adlFile = adlFiles;
  const patientId = adlFiles?.patient_id;
  const { data: patientData, isLoading: isLoadingPatient } = useGetPatientByIdQuery(patientId, { skip: !patientId });
  const patient = patientData?.data?.patient;
  
  // Fetch patient files for preview
  const { data: patientFilesData } = useGetPatientFilesQuery(patientId, {
    skip: !patientId
  });
  const existingFiles = patientFilesData?.data?.files || [];


  // Parse JSON arrays
  const parseArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  };

  const informants = useMemo(() => parseArray(adlFile?.informants), [adlFile?.informants]);
  const complaintsPatient = useMemo(() => parseArray(adlFile?.complaints_patient), [adlFile?.complaints_patient]);
  const complaintsInformant = useMemo(() => parseArray(adlFile?.complaints_informant), [adlFile?.complaints_informant]);
  const familyHistorySiblings = useMemo(() => parseArray(adlFile?.family_history_siblings), [adlFile?.family_history_siblings]);
  const sexualChildren = useMemo(() => parseArray(adlFile?.sexual_children), [adlFile?.sexual_children]);
  const [expandedCards, setExpandedCards] = useState({
    mainWrapper: true,
    patient: true,
    informants: true,
    complaints: true,
    history: true,
    pastHistory: true,
    familyHistory: true,
    personalHistory: true,
    education: true,
    occupation: true,
    sexual: true,
    religion: true,
    living: true,
    homeSituation: true,
    development: true,
    premorbid: true,
    physical: true,
    mse: true,
    diagnostic: true,
    final: true,
  });

  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  if (!adlFile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Out Patient Intake file not found</p>
          <Button onClick={() => navigate('/adl-files')} className="mt-4">
          Back to All Out Patient Intake Records
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Main Wrapper Card - Collapsible */}
        {/* <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden mb-6"> */}
          

          {expandedCards.mainWrapper && (
            <div className="p-6 space-y-6">
              {/* Patient Information Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('patient')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiUser className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Patient Information</h3>
                <p className="text-sm text-gray-600 mt-1">{patient?.name || 'N/A'}</p>
              </div>
            </div>
            {expandedCards.patient ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.patient && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <DisplayField
                  label="Date"
                  value={patient?.date ? (patient.date.includes('T') ? patient.date.split('T')[0] : patient.date) : ''}
                  icon={<FiCalendar className="w-4 h-4" />}
                />
                <DisplayField
                  label="Patient Name"
                  value={patient?.name || ''}
                  icon={<FiUser className="w-4 h-4" />}
                />
                <DisplayField
                  label="Age"
                  value={patient?.age || ''}
                />
                <DisplayField
                  label="Sex"
                  value={patient?.sex || ''}
                />
                <DisplayField
                  label="Psy. No."
                  value={patient?.psy_no || ''}
                  icon={<FiFileText className="w-4 h-4" />}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <DisplayField
                  label="Marital Status"
                  value={patient?.marital_status || ''}
                />
                <DisplayField
                  label="Education"
                  value={patient?.education || patient?.education_level || ''}
                />
                <DisplayField
                  label="Occupation"
                  value={patient?.occupation || ''}
                />
                <DisplayField
                  label="City/District"
                  value={(() => {
                    const city = patient?.city || patient?.present_city_town_village || '';
                    const district = patient?.district || patient?.present_district || '';
                    if (city && district) return `${city}, ${district}`;
                    return city || district || '';
                  })()}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Informants Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('informants')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiUser className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Informants</h3>
                <p className="text-sm text-gray-600 mt-1">{informants.filter(i => i.name).length || 0} informant(s)</p>
              </div>
            </div>
            {expandedCards.informants ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.informants && (
            <div className="p-6 space-y-4">
              {informants.length > 0 ? (
                informants.map((informant, index) => (
                  <div key={index} className="relative backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl p-6 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 rounded-2xl"></div>
                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DisplayField label="Relationship" value={informant.relationship} />
                      <DisplayField label="Name" value={informant.name} />
                      <DisplayField label="Age" value={informant.age} />
                      <DisplayField label="Sex" value={informant.sex} />
                      <DisplayField label="Education" value={informant.education} />
                      <DisplayField label="Marital Status" value={informant.marital_status} />
                      <DisplayField label="Occupation" value={informant.occupation} />
                      <DisplayField label="Name of the City/District" value={informant.city_district} />
                      <DisplayField label="Reliability / Ability to report" value={informant.reliability} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No informant details available.</div>
              )}
            </div>
          )}
        </Card>

        {/* Complaints Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('complaints')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Complaints and Duration</h3>
                <p className="text-sm text-gray-600 mt-1">Chief complaints from patient and informant</p>
              </div>
            </div>
            {expandedCards.complaints ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.complaints && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Chief Complaints as per patient</h4>
                {complaintsPatient.length > 0 && complaintsPatient.some(c => c.complaint) ? (
                  <div className="space-y-3">
                    {complaintsPatient.filter(c => c.complaint).map((complaint, index) => (
                      <div key={index} className="relative backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl p-4 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
                        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div className="md:col-span-3">
                            <DisplayField
                              label={`Complaint ${index + 1}`}
                              value={complaint.complaint}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <DisplayField
                              label="Duration"
                              value={complaint.duration}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500">No patient complaints available.</div>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Chief Complaints as per informant</h4>
                {complaintsInformant.length > 0 && complaintsInformant.some(c => c.complaint) ? (
                  <div className="space-y-3">
                    {complaintsInformant.filter(c => c.complaint).map((complaint, index) => (
                      <div key={index} className="relative backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl p-4 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-rose-500/5 rounded-2xl"></div>
                        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div className="md:col-span-3">
                            <DisplayField
                              label={`Complaint ${index + 1}`}
                              value={complaint.complaint}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <DisplayField
                              label="Duration"
                              value={complaint.duration}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500">No informant complaints available.</div>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Onset, Precipitating Factor, Course</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DisplayField
                    label="Onset"
                    value={adlFile?.onset_duration}
                  />
                  <DisplayField
                    label="Precipitating Factor"
                    value={adlFile?.precipitating_factor}
                  />
                  <DisplayField
                    label="Course"
                    value={adlFile?.course}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* History of Present Illness Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('history')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">History of Present Illness</h3>
              </div>
            </div>
            {expandedCards.history ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.history && (
            <div className="p-6 space-y-6">
              <div className={`${VIEW_NESTED_PANEL_CLASS} space-y-2`}>
                {ADL_HISTORY_PRESENT_ILLNESS_PROMPTS.map((line) => (
                  <p key={line} className="text-sm text-gray-700 leading-snug">
                    {line}
                  </p>
                ))}
              </div>
              <DisplayField
                label="History (sections A–C)"
                value={resolveHistoryPresentIllness(adlFile)}
                rows={10}
              />
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">D. Treatment received so far in this illness</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DisplayField
                    label="Drugs"
                    value={adlFile?.history_treatment_drugs}
                    rows={3}
                    className="md:col-span-2"
                  />
                  <DisplayField
                    label="Response"
                    value={adlFile?.history_treatment_response}
                    rows={2}
                    className="md:col-span-2"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Past History Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('pastHistory')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Past History</h3>
                <p className="text-sm text-gray-600 mt-1">Medical and psychiatric history</p>
              </div>
            </div>
            {expandedCards.pastHistory ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.pastHistory && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">A. Medical</h4>
                <DisplayField
                  label="Including injuries and operations"
                  value={adlFile?.past_history_medical}
                  rows={3}
                />
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">B. Psychiatric</h4>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  {ADL_PAST_HISTORY_PSYCHIATRIC_LABEL_LINE}
                </p>
                <DisplayField
                  label="Psychiatric past history"
                  value={resolvePastHistoryPsychiatric(adlFile)}
                  rows={8}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Family History Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('familyHistory')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Family History</h3>
                <p className="text-sm text-gray-600 mt-1">Father, Mother, and Siblings information</p>
              </div>
            </div>
            {expandedCards.familyHistory ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.familyHistory && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Father</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DisplayField label="Age" value={adlFile?.family_history_father_age} />
                  <DisplayField label="Education" value={adlFile?.family_history_father_education} />
                  <DisplayField label="Occupation" value={adlFile?.family_history_father_occupation} />
                  <DisplayField label="Deceased" value={adlFile?.family_history_father_deceased ? 'Yes' : 'No'} />
                  {adlFile?.family_history_father_deceased && (
                    <>
                      <DisplayField label="Age at death" value={adlFile?.family_history_father_death_age} />
                      <DisplayField label="Date of death" value={adlFile?.family_history_father_death_date} />
                      <DisplayField label="Cause of death" value={adlFile?.family_history_father_death_cause} rows={2} className="md:col-span-2" />
                    </>
                  )}
                  <DisplayField label="General personality and relationship with patient" value={adlFile?.family_history_father_personality} rows={2} className="md:col-span-2" />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Mother</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DisplayField label="Age" value={adlFile?.family_history_mother_age} />
                  <DisplayField label="Education" value={adlFile?.family_history_mother_education} />
                  <DisplayField label="Occupation" value={adlFile?.family_history_mother_occupation} />
                  <DisplayField label="Deceased" value={adlFile?.family_history_mother_deceased ? 'Yes' : 'No'} />
                  {adlFile?.family_history_mother_deceased && (
                    <>
                      <DisplayField label="Age at death" value={adlFile?.family_history_mother_death_age} />
                      <DisplayField label="Date of death" value={adlFile?.family_history_mother_death_date} />
                      <DisplayField label="Cause of death" value={adlFile?.family_history_mother_death_cause} rows={2} className="md:col-span-2" />
                    </>
                  )}
                  <DisplayField label="General personality and relationship with patient" value={adlFile?.family_history_mother_personality} rows={2} className="md:col-span-2" />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Siblings</h4>
                {familyHistorySiblings.length > 0 ? (
                  familyHistorySiblings.map((sibling, index) => (
                    <div key={index} className="border-b pb-4 mb-4 last:border-b-0">
                      <h5 className="font-medium text-gray-700 mb-3">Sibling {index + 1}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <DisplayField label="Age" value={sibling.age} />
                        <DisplayField label="Sex" value={sibling.sex} />
                        <DisplayField label="Education" value={sibling.education} />
                        <DisplayField label="Occupation" value={sibling.occupation} />
                        <DisplayField label="Marital Status" value={sibling.marital_status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No sibling information available.</div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Home Situation & Early Development Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('homeSituation')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Home Situation & Early Development</h3>
                <p className="text-sm text-gray-600 mt-1">Personal history, birth, and development milestones</p>
              </div>
            </div>
            {expandedCards.homeSituation ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.homeSituation && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">General Home Situation</h4>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  {ADL_GENERAL_HOME_SITUATION_LABEL_LINE}
                </p>
                <DisplayField
                  value={resolveGeneralHomeSituation(adlFile || {})}
                  rows={6}
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Personal History</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DisplayField label="Birth Date" value={adlFile?.personal_birth_date} icon={<FiCalendar className="w-4 h-4" />} />
                  <DisplayField label="Birth Place" value={adlFile?.personal_birth_place} />
                  <DisplayField label="Delivery Type" value={adlFile?.personal_delivery_type} />
                  <DisplayField label="Prenatal complications" value={adlFile?.personal_complications_prenatal} rows={2} />
                  <DisplayField label="Natal complications" value={adlFile?.personal_complications_natal} rows={2} />
                  <DisplayField label="Postnatal complications" value={adlFile?.personal_complications_postnatal} rows={2} />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Development</h4>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  {ADL_DEVELOPMENT_HISTORY_LABEL_LINE}
                </p>
                <DisplayField
                  value={resolveDevelopmentHistory(adlFile || {})}
                  rows={6}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Education Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('education')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Education</h3>
                <p className="text-sm text-gray-600 mt-1">Educational history and performance</p>
              </div>
            </div>
            {expandedCards.education ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.education && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_EDUCATION_HISTORY_LABEL_LINE}
              </p>
              <DisplayField
                value={resolveEducationHistory(adlFile || {})}
                rows={6}
              />
            </div>
          )}
        </Card>

        {/* Occupation Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('occupation')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Occupation</h3>
                <p className="text-sm text-gray-600 mt-1">Employment history and work adjustments</p>
              </div>
            </div>
            {expandedCards.occupation ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.occupation && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_OCCUPATION_HISTORY_LABEL_LINE}
              </p>
              <DisplayField
                value={resolveOccupationHistory(adlFile || {})}
                rows={6}
              />
            </div>
          )}
        </Card>

        {/* Sexual History Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('sexual')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Sexual & Marital History</h3>
                <p className="text-sm text-gray-600 mt-1">Development, relationships, and family</p>
              </div>
            </div>
            {expandedCards.sexual ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.sexual && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DisplayField label="Menarche age (for females)" value={adlFile?.sexual_menarche_age} />
                <DisplayField label="Reaction to menarche" value={adlFile?.sexual_menarche_reaction} rows={2} />
                <DisplayField label="Sexual education" value={adlFile?.sexual_education} rows={2} className="md:col-span-2" />
                <DisplayField label="Masturbation" value={adlFile?.sexual_masturbation} rows={2} />
                <DisplayField label="Sexual contact" value={adlFile?.sexual_contact} rows={2} />
                <DisplayField label="Premarital/Extramarital relationships" value={adlFile?.sexual_premarital_extramarital} rows={2} className="md:col-span-2" />
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Marriage</h4>
                <DisplayField label="Marriage type" value={adlFile?.sexual_marriage_arranged} />
                <p className="text-sm text-gray-600 mt-4 mb-3 leading-relaxed">
                  {ADL_SEXUAL_MARRIAGE_DETAILS_LABEL_LINE}
                </p>
                <DisplayField
                  value={resolveSexualMarriageDetails(adlFile || {})}
                  rows={6}
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Children</h4>
                {sexualChildren.length > 0 ? (
                  sexualChildren.map((child, index) => (
                    <div key={index} className="border-b pb-4 mb-4 last:border-b-0">
                      <h5 className="font-medium text-gray-700 mb-3">Child {index + 1}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DisplayField label="Age" value={child.age} />
                        <DisplayField label="Sex" value={child.sex} />
                        <DisplayField label="Health" value={child.health} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No children information available.</div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Religion Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('religion')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Religion</h3>
                <p className="text-sm text-gray-600 mt-1">Religious beliefs and practices</p>
              </div>
            </div>
            {expandedCards.religion ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.religion && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_RELIGION_HISTORY_LABEL_LINE}
              </p>
              <DisplayField
                value={resolveReligionHistory(adlFile || {})}
                rows={6}
              />
            </div>
          )}
        </Card>

        {/* Living Situation Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('living')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiHome className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Living Situation</h3>
                <p className="text-sm text-gray-600 mt-1">Current living arrangements</p>
              </div>
            </div>
            {expandedCards.living ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.living && (
            <div className="p-6 space-y-4">
              {(adlFile?.living_type || adlFile?.living_rooms || adlFile?.living_relationship) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DisplayField label="Type of residence" value={adlFile?.living_type} />
                  <DisplayField label="Number of rooms" value={adlFile?.living_rooms} />
                  <DisplayField label="Relationship with residents" value={adlFile?.living_relationship} rows={2} className="md:col-span-2" />
                </div>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_LIVING_SITUATION_HISTORY_LABEL_LINE}
              </p>
              <DisplayField
                value={resolveLivingSituationHistory(adlFile || {})}
                rows={6}
              />
            </div>
          )}
        </Card>

        {/* Premorbid Personality Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('premorbid')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-slate-500/20 to-gray-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Premorbid Personality</h3>
                <p className="text-sm text-gray-600 mt-1">Personality traits before illness</p>
              </div>
            </div>
            {expandedCards.premorbid ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.premorbid && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_PREMORBID_PERSONALITY_HISTORY_LABEL_LINE}
              </p>
              <DisplayField
                value={resolvePremorbidPersonalityHistory(adlFile || {})}
                rows={6}
              />
            </div>
          )}
        </Card>

        {/* Physical Examination Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('physical')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Physical Examination</h3>
                <p className="text-sm text-gray-600 mt-1">General physical examination findings</p>
              </div>
            </div>
            {expandedCards.physical ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.physical && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DisplayField label="General appearance" value={adlFile?.physical_general_appearance} rows={2} />
                <DisplayField label="Build" value={adlFile?.physical_build} />
                <DisplayField label="Nutrition" value={adlFile?.physical_nutrition} />
                <DisplayField label="Pallor" value={adlFile?.physical_pallor ? 'Yes' : 'No'} />
                <DisplayField label="Icterus" value={adlFile?.physical_icterus ? 'Yes' : 'No'} />
                <DisplayField label="Oedema" value={adlFile?.physical_oedema ? 'Yes' : 'No'} />
                <DisplayField label="Lymphadenopathy" value={adlFile?.physical_lymphadenopathy ? 'Yes' : 'No'} />
                <DisplayField label="Other findings" value={adlFile?.physical_other} rows={3} className="md:col-span-2" />
              </div>
            </div>
          )}
        </Card>

        {/* Mental Status Examination (MSE) Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('mse')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Mental Status Examination (MSE)</h3>
                <p className="text-sm text-gray-600 mt-1">Comprehensive mental status assessment</p>
              </div>
            </div>
            {expandedCards.mse ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.mse && (
            <div className="p-6 space-y-6">
              <DisplayField label="General appearance and behavior" value={adlFile?.mse_appearance} rows={3} />
              <DisplayField label="Speech" value={adlFile?.mse_speech} rows={2} />
              <DisplayField label="Mood and affect" value={adlFile?.mse_mood_affect} rows={2} />
              <DisplayField label="Thought process" value={adlFile?.mse_thought_process} rows={2} />
              <DisplayField label="Thought content" value={adlFile?.mse_thought_content} rows={2} />
              <DisplayField label="Perception" value={adlFile?.mse_perception} rows={2} />
              <DisplayField label="Cognition" value={adlFile?.mse_cognition} rows={2} />
              <p className="text-sm text-gray-600 leading-relaxed">{ADL_MSE_INSIGHT_LABEL_LINE}</p>
              <DisplayField value={resolveMseInsightExamination(adlFile || {})} rows={4} />
            </div>
          )}
        </Card>

        {/* Diagnostic Formulation Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('diagnostic')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Diagnostic Formulation</h3>
                <p className="text-sm text-gray-600 mt-1">Clinical diagnosis and formulation</p>
              </div>
            </div>
            {expandedCards.diagnostic ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.diagnostic && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_DIAGNOSTIC_FORMULATION_LABEL_LINE}
              </p>
              <DisplayField value={resolveDiagnosticFormulationHistory(adlFile || {})} rows={6} />
            </div>
          )}
        </Card>

        {/* Final Assessment Card */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('final')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Final Assessment</h3>
                <p className="text-sm text-gray-600 mt-1">Diagnosis, treatment plan, and consultant comments</p>
              </div>
            </div>
            {expandedCards.final ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedCards.final && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {ADL_FINAL_ASSESSMENT_LABEL_LINE}
              </p>
              <DisplayField value={resolveFinalAssessmentHistory(adlFile || {})} rows={6} />
            </div>
          )}
         </Card>
            </div>
          )}
        {/* </Card> */}

        {/* Patient Documents & Files Preview Section */}
        {patientId && existingFiles && existingFiles.length > 0 && (
          <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden mb-6">
            <div className="p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                  <FiFileText className="w-5 h-5 text-purple-600" />
                </div>
                Patient Documents & Files
              </h4>
              <FilePreview
                files={existingFiles}
                canDelete={false}
                baseUrl={import.meta.env.VITE_API_URL || '/api'}
              />
            </div>
          </Card>
        )}

        {/* <div className="relative mt-8">
              
              <div className="flex flex-col sm:flex-row justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
                  className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
                  <FiX className="mr-2" />
                  Back to All Out Patient Intake Records
            </Button>

              </div>
            </div> */}
      </div>
    </div>
  );
};

export default ViewADL;
