const db = require('../config/database');
const ADLFile = require('../models/ADLFile');
const User = require('../models/User');
const Room = require('../models/Room');

function todayISTDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function normalizeBool(v) {
  if (v === true || v === false) return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'n'].includes(s)) return false;
  return null;
}

function normalizeDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizePatientType(v) {
  if (!v) return 'all';
  const s = String(v).trim().toLowerCase();
  if (s === 'adult' || s === 'child' || s === 'all') return s;
  return 'all';
}

function normalizeSexAdult(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === 'm' || s === 'male') return 'M';
  if (s === 'f' || s === 'female') return 'F';
  if (s === 'other' || s === 'o') return 'Other';
  return null;
}

function normalizeSexChild(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === 'm' || s === 'male') return 'Male';
  if (s === 'f' || s === 'female') return 'Female';
  if (s === 'other' || s === 'o') return 'Other';
  return null;
}

function normalizeStringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeIntOrNull(v) {
  if (v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** referred: all | referred | non_referred */
function normalizeReferredFilter(q) {
  const raw = q.referred ?? q.referred_filter ?? null;
  if (raw != null) {
    const s = String(raw).trim().toLowerCase();
    if (s === 'referred' || s === 'non_referred' || s === 'all') return s;
  }
  const referredOnly = normalizeBool(q.referred_only ?? q.referredOnly);
  if (referredOnly === true) return 'referred';
  const nonReferred = normalizeBool(q.non_referred_only ?? q.nonReferredOnly);
  if (nonReferred === true) return 'non_referred';
  return 'all';
}

class DashboardController {
  static async getDashboard(req, res) {
    try {
      const role = req.user?.role || '';
      const allowed = ['Admin', 'Faculty', 'Resident', 'Psychiatric Welfare Officer'];
      if (!allowed.includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Dashboard is not available for this role',
        });
      }

      const data = await DashboardController._buildDashboard(req);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('[DashboardController.getDashboard] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static _parseFilters(req) {
    const q = req.query || {};
    const assignedOnly = normalizeBool(q.assigned_only ?? q.assignedOnly);
    const unassignedOnly = normalizeBool(q.unassigned_only ?? q.unassignedOnly);
    let assigned = 'all';
    if (unassignedOnly === true) assigned = 'unassigned';
    else if (assignedOnly === true) assigned = 'assigned';

    return {
      start_date: normalizeDate(q.start_date || q.startDate),
      end_date: normalizeDate(q.end_date || q.endDate),
      patient_type: normalizePatientType(q.patient_type || q.patientType),
      gender: normalizeStringOrNull(q.gender || q.sex),
      state: normalizeStringOrNull(q.state),
      doctor_id: normalizeIntOrNull(q.doctor_id || q.doctorId),
      room: normalizeStringOrNull(q.room),
      referred: normalizeReferredFilter(q),
      assigned,
    };
  }

  /** Only non-default filters returned to client */
  static _appliedFilters(filters) {
    const out = {};
    if (filters.start_date) out.start_date = filters.start_date;
    if (filters.end_date) out.end_date = filters.end_date;
    if (filters.patient_type && filters.patient_type !== 'all') out.patient_type = filters.patient_type;
    if (filters.gender) out.gender = filters.gender;
    if (filters.state) out.state = filters.state;
    if (filters.doctor_id) out.doctor_id = filters.doctor_id;
    if (filters.room) out.room = filters.room;
    if (filters.referred && filters.referred !== 'all') out.referred = filters.referred;
    if (filters.assigned && filters.assigned !== 'all') out.assigned = filters.assigned;
    return out;
  }

  static async _getJuniorResidentRoom(userId) {
    const today = todayISTDate();
    const r = await db.query(
      `SELECT current_room FROM users
       WHERE id = $1 AND current_room IS NOT NULL AND current_room != ''
         AND DATE(room_assignment_time) = $2`,
      [userId, today]
    );
    return r.rows[0]?.current_room ? String(r.rows[0].current_room).trim() : null;
  }

  static async _resolveScope(req, role, subRole, filters) {
    const userId = req.user.id;
    const scope = { mode: 'department' };

    if (role === 'Resident' && subRole === 'Junior Resident') {
      scope.mode = 'junior_resident';
      scope.doctor_id = userId;
      if (!filters.room) {
        scope.room = await DashboardController._getJuniorResidentRoom(userId);
      }
    } else if (role === 'Resident' && subRole === 'Senior Resident') {
      scope.mode = 'department';
    } else if (role === 'Faculty') {
      scope.mode = 'department';
    } else if (role === 'Admin' || role === 'Psychiatric Welfare Officer') {
      scope.mode = 'department';
    }

    return scope;
  }

  static _referredSql(patientType, filters, alias) {
    const idCol = patientType === 'adult' ? `${alias}.id` : `${alias}.id`;
    const pt = patientType === 'adult' ? 'adult' : 'child';
    if (filters.referred === 'referred') {
      return `AND EXISTS (
        SELECT 1 FROM patient_referrals pr
        WHERE pr.patient_type = '${pt}' AND pr.patient_id = ${idCol}
          AND pr.status IN ('pending', 'seen')
      )`;
    }
    if (filters.referred === 'non_referred') {
      return `AND NOT EXISTS (
        SELECT 1 FROM patient_referrals pr
        WHERE pr.patient_type = '${pt}' AND pr.patient_id = ${idCol}
          AND pr.status IN ('pending', 'seen')
      )`;
    }
    return '';
  }

  static _buildAdultWhere(filters, scope) {
    const where = [];
    const params = [];
    let idx = 1;

    if (scope.mode === 'junior_resident') {
      const doctorParam = `$${idx++}`;
      params.push(scope.doctor_id);
      const parts = [`rp.assigned_doctor_id = ${doctorParam}`];
      if (scope.room) {
        const roomParam = `$${idx++}`;
        params.push(scope.room);
        parts.push(`TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM(${roomParam}::text)`);
      }
      where.push(`(${parts.join(' OR ')})`);
    }

    if (filters.doctor_id) {
      where.push(`rp.assigned_doctor_id = $${idx++}`);
      params.push(filters.doctor_id);
    }
    if (filters.room) {
      where.push(`TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($${idx++}::text)`);
      params.push(filters.room);
    }
    if (filters.state) {
      where.push(`COALESCE(rp.state, '') = $${idx++}`);
      params.push(filters.state);
    }
    const sex = normalizeSexAdult(filters.gender);
    if (sex) {
      if (sex === 'Other') {
        where.push(`(rp.sex NOT IN ('M','F') OR rp.sex IS NULL)`);
      } else {
        where.push(`rp.sex = $${idx++}`);
        params.push(sex);
      }
    }
    if (filters.start_date) {
      where.push(`DATE(rp.created_at AT TIME ZONE 'Asia/Kolkata') >= $${idx++}`);
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      where.push(`DATE(rp.created_at AT TIME ZONE 'Asia/Kolkata') <= $${idx++}`);
      params.push(filters.end_date);
    }
    if (filters.assigned === 'assigned') {
      where.push(`rp.assigned_doctor_id IS NOT NULL`);
    } else if (filters.assigned === 'unassigned') {
      where.push(`rp.assigned_doctor_id IS NULL`);
    }

    const referredClause = DashboardController._referredSql('adult', filters, 'rp');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')} ${referredClause}` : referredClause ? `WHERE 1=1 ${referredClause}` : '';

    return { whereClause, params };
  }

  static _buildChildWhere(filters, scope) {
    const where = [];
    const params = [];
    let idx = 1;

    if (scope.mode === 'junior_resident') {
      const doctorParam = `$${idx++}`;
      params.push(scope.doctor_id);
      const parts = [
        `EXISTS (SELECT 1 FROM followup_visits fv WHERE fv.child_patient_id = cpr.id AND fv.assigned_doctor_id = ${doctorParam})`,
        `EXISTS (SELECT 1 FROM child_clinical_proforma ccp WHERE ccp.child_patient_id = cpr.id AND (ccp.assigned_doctor = ${doctorParam} OR ccp.filled_by = ${doctorParam}))`,
      ];
      if (scope.room) {
        const roomParam = `$${idx++}`;
        params.push(scope.room);
        parts.push(`TRIM(COALESCE(cpr.assigned_room::text, '')) = TRIM(${roomParam}::text)`);
      }
      where.push(`(${parts.join(' OR ')})`);
    }

    if (filters.room) {
      where.push(`TRIM(COALESCE(cpr.assigned_room::text, '')) = TRIM($${idx++}::text)`);
      params.push(filters.room);
    }
    if (filters.state) {
      where.push(`COALESCE(cpr.state, '') = $${idx++}`);
      params.push(filters.state);
    }
    const sex = normalizeSexChild(filters.gender);
    if (sex) {
      where.push(`cpr.sex = $${idx++}`);
      params.push(sex);
    }
    if (filters.start_date) {
      where.push(`DATE(cpr.created_at AT TIME ZONE 'Asia/Kolkata') >= $${idx++}`);
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      where.push(`DATE(cpr.created_at AT TIME ZONE 'Asia/Kolkata') <= $${idx++}`);
      params.push(filters.end_date);
    }
    if (filters.assigned === 'unassigned') {
      where.push(`(
        NOT EXISTS (SELECT 1 FROM followup_visits fv WHERE fv.child_patient_id = cpr.id AND fv.assigned_doctor_id IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM child_clinical_proforma ccp WHERE ccp.child_patient_id = cpr.id AND (ccp.assigned_doctor IS NOT NULL OR ccp.filled_by IS NOT NULL))
      )`);
    } else if (filters.assigned === 'assigned') {
      where.push(`(
        EXISTS (SELECT 1 FROM followup_visits fv WHERE fv.child_patient_id = cpr.id AND fv.assigned_doctor_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM child_clinical_proforma ccp WHERE ccp.child_patient_id = cpr.id AND (ccp.assigned_doctor IS NOT NULL OR ccp.filled_by IS NOT NULL))
      )`);
    }

    const referredClause = DashboardController._referredSql('child', filters, 'cpr');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')} ${referredClause}` : referredClause ? `WHERE 1=1 ${referredClause}` : '';

    return { whereClause, params };
  }

  static async _getReferredCount(role, userId, filters) {
    const where = [`pr.status IN ('pending', 'seen')`];
    const params = [];
    let idx = 1;

    if (role === 'Faculty' || role === 'Resident') {
      where.push(`pr.referred_to_doctor_id = $${idx++}`);
      params.push(userId);
    }
    if (filters.start_date) {
      where.push(`DATE(pr.referred_at AT TIME ZONE 'Asia/Kolkata') >= $${idx++}`);
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      where.push(`DATE(pr.referred_at AT TIME ZONE 'Asia/Kolkata') <= $${idx++}`);
      params.push(filters.end_date);
    }
    if (filters.doctor_id) {
      where.push(`pr.referred_to_doctor_id = $${idx++}`);
      params.push(filters.doctor_id);
    }
    if (filters.room) {
      where.push(`TRIM(COALESCE(
        CASE WHEN pr.patient_type = 'adult' THEN rp.assigned_room ELSE cpr.assigned_room END::text, ''
      )) = TRIM($${idx++}::text)`);
      params.push(filters.room);
    }

    const result = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM patient_referrals pr
       LEFT JOIN registered_patient rp ON pr.patient_type = 'adult' AND pr.patient_id = rp.id
       LEFT JOIN child_patient_registrations cpr ON pr.patient_type = 'child' AND pr.patient_id = cpr.id
       WHERE ${where.join(' AND ')}`,
      params
    );
    return result.rows[0]?.count ?? 0;
  }

  static _mergeChartRows(adultRows, childRows, patientType) {
    const map = new Map();
    const add = (rows) => {
      (rows || []).forEach((r) => {
        const key = String(r.label || 'Unknown');
        map.set(key, (map.get(key) || 0) + (parseInt(r.count, 10) || 0));
      });
    };
    if (patientType === 'adult') add(adultRows);
    else if (patientType === 'child') add(childRows);
    else {
      add(adultRows);
      add(childRows);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }

  static _pickCards(role, subRole, metrics) {
    const {
      adultTotal,
      childTotal,
      totalPatients,
      adultUnassigned,
      referredCount,
      totalIntakeRecords,
      totalStaff,
      totalRooms,
    } = metrics;

    if (role === 'Admin') {
      return {
        total_patients: totalPatients,
        registered_patients: adultTotal,
        total_intake_records: totalIntakeRecords,
        total_staff: totalStaff,
        total_rooms: totalRooms,
      };
    }
    if (role === 'Faculty') {
      return {
        adult_patients: adultTotal,
        child_patients: childTotal,
        referred_patients: referredCount,
      };
    }
    if (role === 'Resident' && subRole === 'Senior Resident') {
      return {
        adult_patients: adultTotal,
        child_patients: childTotal,
        referred_patients: referredCount,
        total_patients: totalPatients,
        unassigned_patients: adultUnassigned,
      };
    }
    if (role === 'Resident' && subRole === 'Junior Resident') {
      return {
        adult_patients: adultTotal,
        child_patients: childTotal,
        referred_patients: referredCount,
        unassigned_patients: adultUnassigned,
      };
    }
    if (role === 'Psychiatric Welfare Officer') {
      return {
        adult_patients: adultTotal,
        child_patients: childTotal,
        referred_patients: referredCount,
      };
    }
    return {};
  }

  static async _getAdminIntakeCount(filters) {
    const where = [];
    const params = [];
    let idx = 1;
    if (filters.start_date) {
      where.push(`DATE(created_at AT TIME ZONE 'Asia/Kolkata') >= $${idx++}`);
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      where.push(`DATE(created_at AT TIME ZONE 'Asia/Kolkata') <= $${idx++}`);
      params.push(filters.end_date);
    }
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const r = await db.query(`SELECT COUNT(*)::int AS count FROM adl_files ${wc}`, params);
    return r.rows[0]?.count ?? 0;
  }

  static async _buildDashboard(req) {
    const role = req.user?.role || '';
    const subRole = req.user?.sub_role || null;
    const userId = req.user?.id;
    const filters = DashboardController._parseFilters(req);
    const scope = await DashboardController._resolveScope(req, role, subRole, filters);

    const includeAdult = filters.patient_type === 'all' || filters.patient_type === 'adult';
    const includeChild = filters.patient_type === 'all' || filters.patient_type === 'child';

    const adultWhere = DashboardController._buildAdultWhere(filters, scope);
    const childWhere = DashboardController._buildChildWhere(filters, scope);

    const [
      adultCounts,
      childCount,
      adultGender,
      childGender,
      adultAge,
      childAge,
      adultStates,
      childStates,
      referredCount,
      adminStaff,
      adminRooms,
    ] = await Promise.all([
      includeAdult
        ? db.query(
            `SELECT COUNT(*)::int AS adult_total,
                    COUNT(*) FILTER (WHERE rp.assigned_doctor_id IS NULL)::int AS adult_unassigned
             FROM registered_patient rp ${adultWhere.whereClause}`,
            adultWhere.params
          )
        : null,
      includeChild
        ? db.query(
            `SELECT COUNT(*)::int AS child_total FROM child_patient_registrations cpr ${childWhere.whereClause}`,
            childWhere.params
          )
        : null,
      includeAdult
        ? db.query(
            `SELECT CASE WHEN rp.sex = 'M' THEN 'Male' WHEN rp.sex = 'F' THEN 'Female' ELSE 'Other' END AS label,
                    COUNT(*)::int AS count
             FROM registered_patient rp ${adultWhere.whereClause}
             GROUP BY 1 ORDER BY count DESC`,
            adultWhere.params
          )
        : null,
      includeChild
        ? db.query(
            `SELECT COALESCE(cpr.sex, 'Other') AS label, COUNT(*)::int AS count
             FROM child_patient_registrations cpr ${childWhere.whereClause}
             GROUP BY 1 ORDER BY count DESC`,
            childWhere.params
          )
        : null,
      includeAdult
        ? db.query(
            `WITH age_groups AS (
               SELECT CASE
                 WHEN rp.age < 18 THEN 'Under 18'
                 WHEN rp.age BETWEEN 18 AND 25 THEN '18-25'
                 WHEN rp.age BETWEEN 26 AND 35 THEN '26-35'
                 WHEN rp.age BETWEEN 36 AND 45 THEN '36-45'
                 WHEN rp.age BETWEEN 46 AND 55 THEN '46-55'
                 WHEN rp.age BETWEEN 56 AND 65 THEN '56-65'
                 WHEN rp.age > 65 THEN '65+'
                 ELSE 'Unknown'
               END AS label
               FROM registered_patient rp ${adultWhere.whereClause}
             )
             SELECT label, COUNT(*)::int AS count FROM age_groups GROUP BY label
             ORDER BY CASE label
               WHEN 'Under 18' THEN 1 WHEN '18-25' THEN 2 WHEN '26-35' THEN 3
               WHEN '36-45' THEN 4 WHEN '46-55' THEN 5 WHEN '56-65' THEN 6
               WHEN '65+' THEN 7 ELSE 8 END`,
            adultWhere.params
          )
        : null,
      includeChild
        ? db.query(
            `SELECT COALESCE(cpr.age_group, 'Unknown') AS label, COUNT(*)::int AS count
             FROM child_patient_registrations cpr ${childWhere.whereClause}
             GROUP BY 1 ORDER BY count DESC`,
            childWhere.params
          )
        : null,
      includeAdult
        ? db.query(
            `SELECT COALESCE(rp.state, 'Unknown') AS label, COUNT(*)::int AS count
             FROM registered_patient rp ${adultWhere.whereClause}
             GROUP BY 1 ORDER BY count DESC LIMIT 50`,
            adultWhere.params
          )
        : null,
      includeChild
        ? db.query(
            `SELECT COALESCE(cpr.state, 'Unknown') AS label, COUNT(*)::int AS count
             FROM child_patient_registrations cpr ${childWhere.whereClause}
             GROUP BY 1 ORDER BY count DESC LIMIT 50`,
            childWhere.params
          )
        : null,
      DashboardController._getReferredCount(role, userId, filters),
      role === 'Admin' ? User.getStats() : null,
      role === 'Admin' ? Room.findAll(1, 1, {}) : null,
    ]);

    const adultTotal = adultCounts?.rows?.[0]?.adult_total ?? 0;
    const adultUnassigned = adultCounts?.rows?.[0]?.adult_unassigned ?? 0;
    const childTotal = childCount?.rows?.[0]?.child_total ?? 0;
    const totalPatients = (includeAdult ? adultTotal : 0) + (includeChild ? childTotal : 0);

    let totalIntakeRecords = 0;
    let totalStaff = 0;
    let totalRooms = 0;
    if (role === 'Admin') {
      totalIntakeRecords = await DashboardController._getAdminIntakeCount(filters);
      totalStaff = Array.isArray(adminStaff)
        ? adminStaff.reduce((sum, r) => {
            const rr = String(r.role || '');
            if (rr === 'Faculty' || rr === 'Resident' || rr === 'Psychiatric Welfare Officer') {
              return sum + (parseInt(r.count, 10) || 0);
            }
            return sum;
          }, 0)
        : 0;
      totalRooms = adminRooms?.pagination?.total ?? 0;
    }

    const cards = DashboardController._pickCards(role, subRole, {
      adultTotal,
      childTotal,
      totalPatients,
      adultUnassigned,
      referredCount,
      totalIntakeRecords,
      totalStaff,
      totalRooms,
    });

    const stateMerged = DashboardController._mergeChartRows(adultStates?.rows, childStates?.rows, filters.patient_type)
      .sort((a, b) => b.count - a.count);

    const appliedFilters = DashboardController._appliedFilters(filters);
    const payload = {
      role,
      cards,
      charts: {
        gender_distribution: DashboardController._mergeChartRows(
          adultGender?.rows,
          childGender?.rows,
          filters.patient_type
        ),
        age_group_distribution: DashboardController._mergeChartRows(
          adultAge?.rows,
          childAge?.rows,
          filters.patient_type
        ),
        state_distribution: stateMerged,
      },
    };

    if (role === 'Resident' && subRole) {
      payload.sub_role = subRole;
    }
    if (Object.keys(appliedFilters).length > 0) {
      payload.filters = appliedFilters;
    }

    return payload;
  }
}

module.exports = DashboardController;
