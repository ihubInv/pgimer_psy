const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const ClinicalOption = require('../models/ClinicalOption');
const PatientController = require('../controllers/patientController');
const {
  isMWORole,
  canViewClinicalHistory,
  clinicalProformasOnly,
  followupVisitsOnly,
  flattenPrescriptionRows,
} = require('./patientReportFormatters');

class PatientReportService {
  static async buildReport(patientId, userRole) {
    const id = parseInt(patientId, 10);
    if (isNaN(id) || id <= 0) {
      const err = new Error('Invalid patient ID');
      err.statusCode = 400;
      throw err;
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      const err = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }

    const patientJson = PatientController.filterPatientDataForRole(
      patient.toJSON(),
      userRole
    );

    const includeHistory = canViewClinicalHistory(userRole) && !isMWORole(userRole);

    let clinicalRecords = [];
    let adlFiles = [];
    let prescriptionRecords = [];
    let flatPrescriptions = [];

    let clinicalOptions = {};

    if (includeHistory) {
      const [records, adl, prescriptions, options] = await Promise.all([
        patient.getClinicalRecords(),
        patient.getADLFiles(),
        Prescription.findByPatientId(id),
        ClinicalOption.findAllGroups(true).catch(() => ({})),
      ]);
      clinicalRecords     = records || [];
      adlFiles            = adl    || [];
      prescriptionRecords = (prescriptions || []).map((p) => p.toJSON());
      flatPrescriptions   = flattenPrescriptionRows(prescriptionRecords);
      clinicalOptions     = options || {};
    }

    const allProformas      = clinicalProformasOnly(clinicalRecords);
    const firstVisitProforma = allProformas.find(p => p.visit_type === 'first_visit') || allProformas[0] || null;

    return {
      patient: patientJson,
      clinicalRecords,
      clinicalProformas: allProformas,
      firstVisitProforma,
      followUpVisits: followupVisitsOnly(clinicalRecords),
      adlFiles,
      prescriptionRecords,
      flatPrescriptions,
      clinicalOptions,
      includeHistory,
      isMWO: isMWORole(userRole),
    };
  }

  /** Load report bundles for many patients (bulk export). */
  static async buildBulkReports(patientIds, userRole) {
    const uniqueIds = [...new Set(patientIds.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x) && x > 0))];
    const reports = [];
    for (const id of uniqueIds) {
      try {
        const report = await PatientReportService.buildReport(id, userRole);
        reports.push(report);
      } catch (err) {
        if (err.statusCode === 404) continue;
        throw err;
      }
    }
    return reports;
  }

  /** Resolve patient IDs for bulk export from optional date range. */
  static async resolvePatientIdsForBulk({ dateFrom, dateTo, patientIds }) {
    if (Array.isArray(patientIds) && patientIds.length > 0) {
      return patientIds;
    }

    const db = require('../config/database');
    const params = [];
    let where = '1=1';

    if (dateFrom) {
      params.push(dateFrom);
      where += ` AND DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') >= $${params.length}::date`;
    }
    if (dateTo) {
      params.push(dateTo);
      where += ` AND DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') <= $${params.length}::date`;
    }

    const result = await db.query(
      `SELECT id FROM registered_patient WHERE ${where} ORDER BY id ASC LIMIT 1000`,
      params
    );
    return result.rows.map((r) => r.id);
  }
}

module.exports = PatientReportService;
