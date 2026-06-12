const db = require('../config/database');

class PatientReferral {
  constructor(data) {
    this.id = data.id;
    this.patient_id = data.patient_id;
    this.patient_type = data.patient_type;
    this.referred_by_doctor_id = data.referred_by_doctor_id;
    this.referred_to_doctor_id = data.referred_to_doctor_id;
    this.referral_reason = data.referral_reason;
    this.status = data.status;
    this.referred_at = data.referred_at;
    this.seen_at = data.seen_at;
    this.completed_at = data.completed_at;
    this.notes = data.notes;
    this.revoked_at = data.revoked_at || null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    this.referred_by_name = data.referred_by_name || null;
    this.referred_by_role = data.referred_by_role || null;
    this.referred_by_sub_role = data.referred_by_sub_role || null;
    this.referred_to_name = data.referred_to_name || null;
    this.referred_to_role = data.referred_to_role || null;
    this.referred_to_sub_role = data.referred_to_sub_role || null;
    this.patient_name = data.patient_name || null;
    this.cr_no = data.cr_no || null;
    this.psy_no = data.psy_no || null;
    this.sex = data.sex || null;
    this.age = data.age ?? null;
    this.age_group = data.age_group || null;
    this.assigned_room = data.assigned_room || null;
  }

  toJSON() {
    return {
      id: this.id,
      patient_id: this.patient_id,
      patient_type: this.patient_type,
      referred_by_doctor_id: this.referred_by_doctor_id,
      referred_to_doctor_id: this.referred_to_doctor_id,
      referral_reason: this.referral_reason,
      status: this.status,
      referred_at: this.referred_at,
      seen_at: this.seen_at,
      completed_at: this.completed_at,
      notes: this.notes,
      revoked_at: this.revoked_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      referred_by_name: this.referred_by_name,
      referred_by_role: this.referred_by_role,
      referred_by_sub_role: this.referred_by_sub_role,
      referred_to_name: this.referred_to_name,
      referred_to_role: this.referred_to_role,
      referred_to_sub_role: this.referred_to_sub_role,
      patient_name: this.patient_name,
      cr_no: this.cr_no,
      psy_no: this.psy_no,
      sex: this.sex,
      age: this.age,
      age_group: this.age_group,
      assigned_room: this.assigned_room,
    };
  }

  static async addLog(referralId, doctorId, action, notes = null, client = db) {
    await client.query(
      `INSERT INTO patient_referral_logs (referral_id, doctor_id, action, notes)
       VALUES ($1, $2, $3, $4)`,
      [referralId, doctorId, action, notes]
    );
  }

  static async findById(id) {
    const result = await db.query(
      `SELECT pr.*,
              rb.name AS referred_by_name, rb.role AS referred_by_role, rb.sub_role AS referred_by_sub_role,
              rt.name AS referred_to_name, rt.role AS referred_to_role, rt.sub_role AS referred_to_sub_role
       FROM patient_referrals pr
       JOIN users rb ON rb.id = pr.referred_by_doctor_id
       JOIN users rt ON rt.id = pr.referred_to_doctor_id
       WHERE pr.id = $1`,
      [id]
    );
    return result.rows[0] ? new PatientReferral(result.rows[0]) : null;
  }

  /** Active referral where this doctor is the recipient (pending or seen). */
  static async hasActiveReferralForDoctor(patientId, patientType, doctorId) {
    if (!patientId || !doctorId) return false;
    const result = await db.query(
      `SELECT id FROM patient_referrals
       WHERE patient_id = $1
         AND patient_type = $2
         AND referred_to_doctor_id = $3
         AND status IN ('pending', 'seen')
       LIMIT 1`,
      [patientId, patientType || 'adult', doctorId]
    );
    return Boolean(result.rows[0]);
  }

  static async findPendingDuplicate(patientId, patientType, referredToDoctorId) {
    const result = await db.query(
      `SELECT id FROM patient_referrals
       WHERE patient_id = $1
         AND patient_type = $2
         AND referred_to_doctor_id = $3
         AND status IN ('pending', 'seen')
       LIMIT 1`,
      [patientId, patientType, referredToDoctorId]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const {
      patient_id,
      patient_type,
      referred_by_doctor_id,
      referred_to_doctor_id,
      referral_reason,
      notes,
    } = data;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO patient_referrals
           (patient_id, patient_type, referred_by_doctor_id, referred_to_doctor_id, referral_reason, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          patient_id,
          patient_type,
          referred_by_doctor_id,
          referred_to_doctor_id,
          referral_reason || null,
          notes || null,
        ]
      );

      const referral = insertResult.rows[0];
      await PatientReferral.addLog(
        referral.id,
        referred_by_doctor_id,
        'referred',
        referral_reason || null,
        client
      );

      await client.query('COMMIT');
      return PatientReferral.findById(referral.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static _listBaseQuery() {
    return `
      SELECT pr.*,
             rb.name AS referred_by_name, rb.role AS referred_by_role, rb.sub_role AS referred_by_sub_role,
             rt.name AS referred_to_name, rt.role AS referred_to_role, rt.sub_role AS referred_to_sub_role,
             CASE WHEN pr.patient_type = 'adult' THEN rp.name ELSE cpr.child_name END AS patient_name,
             CASE WHEN pr.patient_type = 'adult' THEN rp.cr_no ELSE cpr.cr_number END AS cr_no,
             CASE WHEN pr.patient_type = 'adult' THEN rp.psy_no ELSE NULL END AS psy_no,
             CASE WHEN pr.patient_type = 'adult' THEN rp.sex ELSE cpr.sex END AS sex,
             CASE WHEN pr.patient_type = 'adult' THEN rp.age ELSE NULL END AS age,
             CASE WHEN pr.patient_type = 'child' THEN cpr.age_group ELSE NULL END AS age_group,
             CASE WHEN pr.patient_type = 'adult' THEN rp.assigned_room ELSE cpr.assigned_room END AS assigned_room
      FROM patient_referrals pr
      JOIN users rb ON rb.id = pr.referred_by_doctor_id
      JOIN users rt ON rt.id = pr.referred_to_doctor_id
      LEFT JOIN registered_patient rp
        ON pr.patient_type = 'adult' AND pr.patient_id = rp.id
      LEFT JOIN child_patient_registrations cpr
        ON pr.patient_type = 'child' AND pr.patient_id = cpr.id
    `;
  }

  static async findForDoctor({
    doctorId,
    view = 'referred_to_me',
    page = 1,
    limit = 10,
    search = null,
    statusFilter = null,
    listFilters = null,
  }) {
    const offset = (page - 1) * limit;
    const params = [doctorId];
    let where = '';

    if (view === 'referred_by_me') {
      where = 'WHERE pr.referred_by_doctor_id = $1';
    } else {
      where = 'WHERE pr.referred_to_doctor_id = $1';
    }

    if (statusFilter === 'active') {
      where += ` AND pr.status IN ('pending', 'seen')`;
    } else if (statusFilter === 'all') {
      // No status filter — show every status including completed, revoked, cancelled
    } else if (statusFilter) {
      params.push(statusFilter);
      where += ` AND pr.status = $${params.length}`;
    } else {
      where += ` AND pr.status IN ('pending', 'seen')`;
    }

    if (listFilters?.state) {
      params.push(listFilters.state);
      where += ` AND COALESCE(
        CASE WHEN pr.patient_type = 'adult' THEN rp.state ELSE cpr.state END, ''
      ) = $${params.length}`;
    }

    if (listFilters?.sex || listFilters?.childSex) {
      const adultSex = listFilters.sex;
      const childSex = listFilters.childSex;
      if (adultSex === 'Other') {
        where += ` AND (
          (pr.patient_type = 'adult' AND (rp.sex NOT IN ('M','F') OR rp.sex IS NULL))
          OR (pr.patient_type = 'child' AND cpr.sex = 'Other')
        )`;
      } else if (adultSex && childSex) {
        params.push(adultSex, childSex);
        where += ` AND (
          (pr.patient_type = 'adult' AND rp.sex = $${params.length - 1})
          OR (pr.patient_type = 'child' AND cpr.sex = $${params.length})
        )`;
      }
    }

    if (listFilters?.created_from) {
      params.push(listFilters.created_from);
      where += ` AND DATE(pr.referred_at AT TIME ZONE 'Asia/Kolkata') >= $${params.length}::date`;
    }
    if (listFilters?.created_to) {
      params.push(listFilters.created_to);
      where += ` AND DATE(pr.referred_at AT TIME ZONE 'Asia/Kolkata') <= $${params.length}::date`;
    }

    if (search && search.trim().length >= 2) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      where += ` AND (
        COALESCE(rp.name, cpr.child_name, '') ILIKE $${idx}
        OR COALESCE(rp.cr_no, cpr.cr_number, '') ILIKE $${idx}
        OR COALESCE(rp.psy_no, '') ILIKE $${idx}
        OR COALESCE(pr.referral_reason, '') ILIKE $${idx}
        OR rb.name ILIKE $${idx}
      )`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM patient_referrals pr
       JOIN users rb ON rb.id = pr.referred_by_doctor_id
       LEFT JOIN registered_patient rp ON pr.patient_type = 'adult' AND pr.patient_id = rp.id
       LEFT JOIN child_patient_registrations cpr ON pr.patient_type = 'child' AND pr.patient_id = cpr.id
       ${where}`,
      params
    );

    params.push(limit, offset);
    const listResult = await db.query(
      `${PatientReferral._listBaseQuery()}
       ${where}
       ORDER BY pr.referred_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const total = countResult.rows[0]?.total || 0;
    return {
      referrals: listResult.rows.map((row) => new PatientReferral(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async markSeen(referralId, doctorId) {
    const referral = await PatientReferral.findById(referralId);
    if (!referral) return null;

    if (referral.referred_to_doctor_id !== doctorId) {
      const err = new Error('Only the receiving doctor can mark this referral as seen');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (referral.status === 'completed' || referral.status === 'cancelled') {
      return referral;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE patient_referrals
         SET status = CASE WHEN status = 'pending' THEN 'seen' ELSE status END,
             seen_at = COALESCE(seen_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [referralId]
      );

      const action = referral.seen_at ? 'viewed' : 'seen';
      await PatientReferral.addLog(referralId, doctorId, action, null, client);

      await client.query('COMMIT');
      return PatientReferral.findById(updateResult.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async markCompleted(referralId, doctorId, notes = null) {
    const referral = await PatientReferral.findById(referralId);
    if (!referral) return null;

    const allowed =
      referral.referred_to_doctor_id === doctorId ||
      referral.referred_by_doctor_id === doctorId;
    if (!allowed) {
      const err = new Error('You are not allowed to complete this referral');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (referral.status === 'completed' || referral.status === 'cancelled') {
      return referral;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE patient_referrals
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             seen_at = COALESCE(seen_at, CURRENT_TIMESTAMP),
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [referralId, notes]
      );

      await PatientReferral.addLog(referralId, doctorId, 'completed', notes, client);

      await client.query('COMMIT');
      return PatientReferral.findById(referralId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokeReferral(referralId, adminId, notes = null) {
    const referral = await PatientReferral.findById(referralId);
    if (!referral) return null;

    if (referral.status === 'completed' || referral.status === 'revoked' || referral.status === 'cancelled') {
      const err = new Error(`Referral is already ${referral.status} and cannot be revoked`);
      err.code = 'CONFLICT';
      throw err;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE patient_referrals
         SET status = 'revoked',
             revoked_at = CURRENT_TIMESTAMP,
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [referralId, notes]
      );

      await PatientReferral.addLog(referralId, adminId, 'revoked', notes, client);

      await client.query('COMMIT');
      return PatientReferral.findById(referralId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getLogs(referralId) {
    const result = await db.query(
      `SELECT l.*, u.name AS doctor_name, u.role AS doctor_role, u.sub_role AS doctor_sub_role
       FROM patient_referral_logs l
       JOIN users u ON u.id = l.doctor_id
       WHERE l.referral_id = $1
       ORDER BY l.created_at ASC`,
      [referralId]
    );
    return result.rows;
  }
}

module.exports = PatientReferral;
