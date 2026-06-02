import { useMemo } from 'react';
import { useGetPatientByIdQuery, useGetChildPatientByIdQuery } from '../features/patients/patientsApiSlice';
import {
  mapAdultPatientForPrint,
  mapChildPatientForPrint,
  mapApiPatientForPrint,
} from '../utils/prescriptionPrintPatient';

/**
 * Resolves patient registration details for prescription print.
 * Tries API-embedded patient first, then child + adult registration endpoints.
 */
export function usePatientForPrescriptionPrint(patientId, options = {}) {
  const {
    patientType,
    apiPatient,
    skip = false,
  } = options;

  const id = patientId ? Number(patientId) : null;
  const shouldFetch = Boolean(id) && !skip;

  const { data: adultData, isFetching: fetchingAdult, isError: adultError } = useGetPatientByIdQuery(id, {
    skip: !shouldFetch || patientType === 'child',
  });

  const { data: childData, isFetching: fetchingChild } = useGetChildPatientByIdQuery(id, {
    skip: !shouldFetch || patientType === 'adult',
  });

  const patientForPrint = useMemo(() => {
    const fromApi = mapApiPatientForPrint(apiPatient);
    if (fromApi?.name) return fromApi;

    const child = mapChildPatientForPrint(childData?.data?.childPatient);
    const adult = mapAdultPatientForPrint(adultData?.data?.patient);

    if (patientType === 'child') return child?.name ? child : adult;
    if (patientType === 'adult') return adult?.name ? adult : child;

    if (child?.name) return child;
    if (adult?.name) return adult;
    if (adultError && child) return child;
    return child || adult || null;
  }, [apiPatient, adultData, childData, patientType, adultError]);

  const isLoadingPatient =
    shouldFetch &&
    !patientForPrint?.name &&
    (fetchingAdult || fetchingChild) &&
    !apiPatient?.name;

  return { patientForPrint, isLoadingPatient };
}
