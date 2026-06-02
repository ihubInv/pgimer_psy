/**
 * Resident workflow: Junior and Senior Residents may complete both
 * Walk-in Clinical Proforma and Out-Patient Intake Record (ADL).
 */

function isResidentWithSubRole(user) {
  return (
    user?.role === 'Resident' &&
    (user.sub_role === 'Junior Resident' || user.sub_role === 'Senior Resident')
  );
}

function canFillClinicalProforma(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return isResidentWithSubRole(user);
}

function canFillIntakeRecord(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return isResidentWithSubRole(user);
}

function canFillIntakeRecordForReferral(user) {
  return canFillIntakeRecord(user);
}

function canFillClinicalProformaForReferral(user) {
  return canFillClinicalProforma(user);
}

module.exports = {
  canFillClinicalProforma,
  canFillIntakeRecord,
  canFillIntakeRecordForReferral,
  canFillClinicalProformaForReferral,
};
