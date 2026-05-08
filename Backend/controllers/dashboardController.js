const db = require('../config/database');
const Patient = require('../models/Patient');
const ChildPatientRegistration = require('../models/ChildPatientRegistration');
const ClinicalProforma = require('../models/ClinicalProforma');
const ADLFile = require('../models/ADLFile');
const User = require('../models/User');
const Room = require('../models/Room');
const Prescription = require('../models/Prescription');
const { getTodayRoomDistribution } = require('../utils/roomAssignment');

function normalizePeriod(q) {
  const p = String(q || 'month').toLowerCase();
  if (p === 'day' || p === 'week' || p === 'month') return p;
  return 'month';
}

function todayISTDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

class DashboardController {
  static async getDashboard(req, res) {
    try {
      const role = req.user?.role || '';
      const userId = req.user?.id;
      const period = normalizePeriod(req.query.period);

      if (role === 'Admin') {
        const data = await DashboardController.buildAdminDashboard(period);
        return res.json({ success: true, data });
      }

      if (role === 'Psychiatric Welfare Officer') {
        const data = await DashboardController.buildMwoDashboard();
        return res.json({ success: true, data });
      }

      if (role === 'Faculty' || role === 'Resident') {
        const data = await DashboardController.buildDoctorDashboard(period, userId);
        return res.json({ success: true, data });
      }

      return res.status(403).json({
        success: false,
        message: 'Dashboard is not available for this role',
      });
    } catch (error) {
      console.error('[DashboardController.getDashboard] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async buildAdminDashboard(period) {
    const today = todayISTDate();

    const [
      patientStatsBase,
      clinicalStats,
      adlStats,
      userStatRows,
      ageDistribution,
      patientsSample,
      todayPatientsSample,
      roomsResult,
      todayDistribution,
      recentRx,
      recentADL,
      recentClinical,
    ] = await Promise.all([
      Patient.getStats(null),
      ClinicalProforma.getStats(),
      ADLFile.getStats(),
      User.getStats(),
      Patient.getAgeDistribution(),
      Patient.findAll(1, 100, {}),
      Patient.findAll(1, 100, { date: today }),
      Room.findAll(1, 1000, {}),
      getTodayRoomDistribution().catch(() => ({})),
      Prescription.findAll(1, 5, {}),
      ADLFile.findAll(1, 5, {}),
      ClinicalProforma.findAll(1, 5, {}),
    ]);

    let childTotal = 0;
    try {
      const childResult = await ChildPatientRegistration.findAll(1, 1, {});
      childTotal = childResult?.pagination?.total || 0;
    } catch (e) {
      console.warn('[DashboardController.buildAdminDashboard] child count skipped:', e.message);
    }

    const statsPayload = {
      ...patientStatsBase,
      adult_total: parseInt(patientStatsBase?.total_patients ?? 0, 10) || 0,
      child_total: childTotal,
    };

    return {
      kind: 'admin',
      period,
      patientStats: { data: { stats: statsPayload } },
      clinicalStats: { data: { stats: clinicalStats } },
      adlStats: { data: { stats: adlStats } },
      userStats: { data: { stats: userStatRows } },
      ageDistribution: { data: { distribution: ageDistribution || [] } },
      allPatientsForAdmin: { data: { patients: patientsSample.patients || [], pagination: patientsSample.pagination } },
      todayPatientsForAdmin: { data: { patients: todayPatientsSample.patients || [], pagination: todayPatientsSample.pagination } },
      allRoomsForAdmin: { data: { rooms: (roomsResult.rooms || []).map((r) => r.toJSON()), pagination: roomsResult.pagination } },
      roomDistributionData: { data: { distribution_today: todayDistribution || {} } },
      recentPrescriptions: {
        data: {
          prescriptions: (recentRx.prescriptions || []).map((p) => p.toJSON()),
          pagination: recentRx.pagination,
        },
      },
      recentADLFiles: {
        data: {
          files: (recentADL.files || []).map((f) => f.toJSON()),
          pagination: recentADL.pagination,
        },
      },
      recentClinicalProformas: {
        data: {
          proformas: (recentClinical.proformas || []).map((p) => p.toJSON()),
          pagination: recentClinical.pagination,
        },
      },
    };
  }

  static async buildMwoDashboard() {
    const outpatientStatsRaw = await Patient.getStats(null);
    const statusStatsRows = await ADLFile.getFilesByStatus();

    const [myRecordsPage, allPatientsSample, roomsResult] = await Promise.all([
      Patient.findAll(1, 10, {}),
      Patient.findAll(1, 100, {}),
      Room.findAll(1, 1000, {}),
    ]);

    return {
      kind: 'mwo',
      outpatientStats: { data: { stats: { ...outpatientStatsRaw } } },
      adlByStatus: { data: { statusStats: statusStatsRows || [] } },
      myRecords: { data: { records: myRecordsPage.patients || [], patients: myRecordsPage.patients || [] } },
      allPatientsForMWO: { data: { patients: allPatientsSample.patients || [], pagination: allPatientsSample.pagination } },
      allRoomsForMWO: { data: { rooms: (roomsResult.rooms || []).map((r) => r.toJSON()), pagination: roomsResult.pagination } },
    };
  }

  static async buildDoctorDashboard(period, userId) {
    const [patientPage, decisionResult, trends, myProformas, complexCases, activeFilesList, adultStats] = await Promise.all([
      Patient.findAll(1, 500, { treating_doctor_id: userId }),
      db.query(
        `SELECT doctor_decision, COUNT(*)::int AS count
         FROM clinical_proforma
         WHERE doctor_decision IS NOT NULL AND filled_by = $1
         GROUP BY doctor_decision
         ORDER BY count DESC`,
        [userId],
      ),
      ClinicalProforma.getVisitTrends(period, userId),
      ClinicalProforma.findAll(1, 10, { filled_by: userId }),
      ClinicalProforma.findAll(1, 5, { doctor_decision: 'complex_case', requires_adl_file: true }),
      ADLFile.getActiveFiles(),
      Patient.getStats(null),
    ]);

    return {
      kind: 'clinician',
      roleTier: 'doctor',
      period,
      totalPatients: parseInt(adultStats?.total_patients ?? 0, 10) || 0,
      totalAdultPatients: parseInt(adultStats?.total_patients ?? 0, 10) || 0,
      allAssignedPatients: { data: { patients: patientPage.patients || [], pagination: patientPage.pagination } },
      decisionStats: { data: { decisionStats: decisionResult.rows || [] } },
      visitTrends: { data: { trends: trends || [] } },
      myProformas: {
        data: {
          proformas: (myProformas.proformas || []).map((p) => p.toJSON()),
          pagination: myProformas.pagination,
        },
      },
      complexCases: {
        data: {
          proformas: (complexCases.proformas || []).map((p) => p.toJSON()),
          pagination: complexCases.pagination,
        },
      },
      activeADLFiles: { data: { activeFiles: (activeFilesList || []).map((f) => f.toJSON()) } },
    };
  }
}

module.exports = DashboardController;
