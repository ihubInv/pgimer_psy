/**
 * Resident workflow: Senior Resident → Walk-in Clinical Proforma; Junior Resident → Intake Record (ADL).
 * Faculty and Admin may use both for supervision.
 */

function canFillClinicalProforma(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return user.role === 'Resident' && user.sub_role === 'Senior Resident';
}

function canFillIntakeRecord(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return user.role === 'Resident' && user.sub_role === 'Junior Resident';
}

/** Referred workflow: Senior and Junior residents may write intake for assigned referrals. */
function canFillIntakeRecordForReferral(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return (
    user.role === 'Resident' &&
    (user.sub_role === 'Junior Resident' || user.sub_role === 'Senior Resident')
  );
}

function canFillClinicalProformaForReferral(user) {
  if (!user?.role) return false;
  if (user.role === 'Admin' || user.role === 'Faculty') return true;
  return (
    user.role === 'Resident' &&
    (user.sub_role === 'Junior Resident' || user.sub_role === 'Senior Resident')
  );
}

module.exports = {
  canFillClinicalProforma,
  canFillIntakeRecord,
  canFillIntakeRecordForReferral,
  canFillClinicalProformaForReferral,
};
