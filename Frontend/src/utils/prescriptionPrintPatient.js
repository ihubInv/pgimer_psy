/**
 * Normalize adult / child registration records for prescription print header.
 */

export function mapAdultPatientForPrint(patient) {
  if (!patient) return null;
  return {
    name: patient.name || '',
    cr_no: patient.cr_no || patient.cr_number || '',
    psy_no: patient.psy_no || '',
    cgc_number: patient.cgc_number || '',
    age: patient.age != null && patient.age !== '' ? String(patient.age) : '',
    sex: patient.sex || '',
    mobile_no: patient.contact_number || patient.mobile_no || '',
    assigned_doctor_name: patient.assigned_doctor_name || '',
    assigned_doctor_role: patient.assigned_doctor_role || '',
    assigned_room: patient.assigned_room || patient.room_no || '',
    patient_category: 'Adult',
  };
}

/** Map patient block returned from GET /prescriptions/by-patient/:id */
export function mapApiPatientForPrint(patient) {
  if (!patient) return null;
  return {
    name: patient.name || '',
    cr_no: patient.cr_no || patient.cr_number || '',
    psy_no: patient.psy_no || '',
    cgc_number: patient.cgc_number || '',
    age: patient.age != null && patient.age !== '' ? String(patient.age) : '',
    sex: patient.sex || '',
    mobile_no: patient.mobile_no || patient.contact_number || '',
    assigned_doctor_name: patient.assigned_doctor_name || '',
    assigned_doctor_role: patient.assigned_doctor_role || '',
    assigned_room: patient.assigned_room || patient.room_no || '',
    patient_category: patient.patient_category || '',
  };
}

export function mapChildPatientForPrint(child) {
  if (!child) return null;
  return {
    name: child.child_name || '',
    cr_no: child.cr_number || child.cr_no || '',
    psy_no: child.psy_no || '',
    cgc_number: child.cgc_number || '',
    age: child.age != null && child.age !== '' ? String(child.age) : '',
    sex: child.sex || '',
    mobile_no: child.mobile_no || '',
    assigned_doctor_name: child.assigned_doctor_name || '',
    assigned_doctor_role: child.assigned_doctor_role || '',
    assigned_room: child.assigned_room || child.room_no || '',
    patient_category: 'Child',
  };
}
