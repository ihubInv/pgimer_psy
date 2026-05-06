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
      const department = String(req.user?.department || '').trim();
      const isChildDepartment = department.toLowerCase() === 'child department';
      const period = normalizePeriod(req.query.period);

      if (role === 'Admin') {
        const data = await DashboardController.buildAdminDashboard(period, isChildDepartment, department);
        return res.json({ success: true, data });
      }

      if (role === 'Psychiatric Welfare Officer') {
        const data = await DashboardController.buildMwoDashboard(isChildDepartment, department);
        return res.json({ success: true, data });
      }

      if (role === 'Faculty' || role === 'Resident') {
        const data = await DashboardController.buildDoctorDashboard(period, userId, isChildDepartment, department);
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

  static async buildAdminDashboard(period, isChildDepartment, department) {
    const today = todayISTDate();

    if (isChildDepartment) {
      const [children, roomsResult, userStats] = await Promise.all([
        ChildPatientRegistration.findAll(1, 100, {}),
        Room.findAll(1, 1000, {}),
        User.getStats(),
      ]);

      const childPatients = children.child_patients || [];
      const stats = {
        total_patients: children.pagination?.total || childPatients.length || 0,
        male_patients: childPatients.filter((p) => String(p.sex || '').toLowerCase() === 'male').length,
        female_patients: childPatients.filter((p) => String(p.sex || '').toLowerCase() === 'female').length,
        other_patients: childPatients.filter((p) => {
          const s = String(p.sex || '').toLowerCase();
          return s && s !== 'male' && s !== 'female';
        }).length,
        patients_with_adl: 0,
        complex_cases: 0,
        simple_cases: children.pagination?.total || childPatients.length || 0,
        adult_total: 0,
        child_total: children.pagination?.total || childPatients.length || 0,
        department,
        scope: 'department',
      };

      return {
        kind: 'admin',
        period,
        patientStats: { data: { stats } },
        clinicalStats: { data: { stats: { first_visits: 0, follow_ups: 0 } } },
        adlStats: { data: { stats: { total_files: 0, created_files: 0, stored_files: 0, retrieved_files: 0, archived_files: 0 } } },
        userStats: { data: { stats: userStats || [] } },
        ageDistribution: { data: { distribution: [] } },
        allPatientsForAdmin: {
          data: {
            patients: childPatients.map((cp) => ({
              id: cp.id,
              name: cp.child_name ?? cp.name ?? null,
              cr_no: cp.cr_number ?? null,
              psy_no: null,
              special_clinic_no: cp.cgc_number ?? null,
              assigned_room: cp.assigned_room ?? null,
              assigned_doctor_id: null,
              assigned_doctor_name: null,
              assigned_doctor_role: null,
              sex: cp.sex ?? null,
              age: null,
              age_group: cp.age_group ?? null,
              created_at: cp.created_at ?? null,
              updated_at: cp.updated_at ?? null,
              has_adl_file: false,
              case_complexity: 'simple',
              patient_type: 'child',
              filled_by_name: cp.filled_by_name ?? null,
              filled_by_role: cp.filled_by_role ?? null,
            })),
            pagination: children.pagination,
          },
        },
        todayPatientsForAdmin: {
          data: {
            patients: childPatients.filter((cp) => {
              if (!cp.created_at) return false;
              const d = new Date(cp.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
              return d === today;
            }),
            pagination: children.pagination,
          },
        },
        allRoomsForAdmin: {
          data: {
            rooms: (roomsResult.rooms || []).map((r) => r.toJSON()),
            pagination: roomsResult.pagination,
          },
        },
        roomDistributionData: { data: { distribution_today: await getTodayRoomDistribution().catch(() => ({})) } },
        recentPrescriptions: { data: { prescriptions: [], pagination: { page: 1, limit: 5, total: 0, pages: 0 } } },
        recentADLFiles: { data: { files: [], pagination: { page: 1, limit: 5, total: 0, pages: 0 } } },
        recentClinicalProformas: { data: { proformas: [], pagination: { page: 1, limit: 5, total: 0, pages: 0 } } },
      };
    }

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
      department,
      scope: 'department',
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

  static async buildMwoDashboard(isChildDepartment, department) {
    if (isChildDepartment) {
      const [childResult, roomsResult] = await Promise.all([
        ChildPatientRegistration.findAll(1, 100, {}),
        Room.findAll(1, 1000, {}),
      ]);

      const childPatients = childResult.child_patients || [];
      const stats = {
        total_patients: childResult.pagination?.total || childPatients.length || 0,
        male_patients: childPatients.filter((p) => String(p.sex || '').toLowerCase() === 'male').length,
        female_patients: childPatients.filter((p) => String(p.sex || '').toLowerCase() === 'female').length,
        other_patients: childPatients.filter((p) => {
          const s = String(p.sex || '').toLowerCase();
          return s && s !== 'male' && s !== 'female';
        }).length,
        patients_with_adl: 0,
        complex_cases: 0,
        simple_cases: childResult.pagination?.total || childPatients.length || 0,
        adult_total: 0,
        child_total: childResult.pagination?.total || childPatients.length || 0,
        department,
        scope: 'department',
      };

      const mapped = childPatients.map((cp) => ({
        id: cp.id,
        name: cp.child_name ?? cp.name ?? null,
        cr_no: cp.cr_number ?? null,
        psy_no: null,
        special_clinic_no: cp.cgc_number ?? null,
        assigned_room: cp.assigned_room ?? null,
        assigned_doctor_id: null,
        assigned_doctor_name: null,
        assigned_doctor_role: null,
        sex: cp.sex ?? null,
        age: null,
        age_group: cp.age_group ?? null,
        created_at: cp.created_at ?? null,
        updated_at: cp.updated_at ?? null,
        has_adl_file: false,
        case_complexity: 'simple',
        patient_type: 'child',
        filled_by_name: cp.filled_by_name ?? null,
        filled_by_role: cp.filled_by_role ?? null,
      }));

      return {
        kind: 'mwo',
        outpatientStats: { data: { stats } },
        adlByStatus: { data: { statusStats: [] } },
        myRecords: { data: { records: mapped.slice(0, 10), patients: mapped.slice(0, 10) } },
        allPatientsForMWO: { data: { patients: mapped, pagination: childResult.pagination } },
        allRoomsForMWO: { data: { rooms: (roomsResult.rooms || []).map((r) => r.toJSON()), pagination: roomsResult.pagination } },
      };
    }

    const outpatientStatsRaw = await Patient.getStats(null);
    const statusStatsRows = await ADLFile.getFilesByStatus();

    const [myRecordsPage, allPatientsSample, roomsResult] = await Promise.all([
      Patient.findAll(1, 10, {}),
      Patient.findAll(1, 100, {}),
      Room.findAll(1, 1000, {}),
    ]);

    return {
      kind: 'mwo',
      outpatientStats: { data: { stats: { ...outpatientStatsRaw, department, scope: 'department' } } },
      adlByStatus: { data: { statusStats: statusStatsRows || [] } },
      myRecords: { data: { records: myRecordsPage.patients || [], patients: myRecordsPage.patients || [] } },
      allPatientsForMWO: { data: { patients: allPatientsSample.patients || [], pagination: allPatientsSample.pagination } },
      allRoomsForMWO: { data: { rooms: (roomsResult.rooms || []).map((r) => r.toJSON()), pagination: roomsResult.pagination } },
    };
  }

  static async buildDoctorDashboard(period, userId, isChildDepartment, department) {
    if (isChildDepartment) {
      const childResult = await ChildPatientRegistration.findAll(1, 500, {});
      const childPatients = (childResult.child_patients || []).map((cp) => ({
        id: cp.id,
        name: cp.child_name ?? cp.name ?? null,
        cr_no: cp.cr_number ?? null,
        psy_no: null,
        special_clinic_no: cp.cgc_number ?? null,
        assigned_room: cp.assigned_room ?? null,
        assigned_doctor_id: null,
        assigned_doctor_name: null,
        assigned_doctor_role: null,
        sex: cp.sex ?? null,
        age: null,
        age_group: cp.age_group ?? null,
        created_at: cp.created_at ?? null,
        updated_at: cp.updated_at ?? null,
        has_adl_file: false,
        case_complexity: 'simple',
        patient_type: 'child',
        filled_by_name: cp.filled_by_name ?? null,
        filled_by_role: cp.filled_by_role ?? null,
      }));

      return {
        kind: 'clinician',
        roleTier: 'doctor',
        period,
        department,
        totalPatients: childResult.pagination?.total || childPatients.length || 0,
        totalAdultPatients: 0,
        allAssignedPatients: { data: { patients: childPatients, pagination: childResult.pagination } },
        decisionStats: { data: { decisionStats: [] } },
        visitTrends: { data: { trends: [] } },
        myProformas: { data: { proformas: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } } },
        complexCases: { data: { proformas: [], pagination: { page: 1, limit: 5, total: 0, pages: 0 } } },
        activeADLFiles: { data: { activeFiles: [] } },
      };
    }

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
      department,
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
