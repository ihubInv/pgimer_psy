const PatientReportService = require('../services/patientReportService');
const {
  buildWorkbookFromReport,
  buildBulkWorkbook,
  workbookToBuffer,
  reportFilename,
  bulkFilename,
} = require('../services/patientReportExcel');
const { buildPatientReportHtml, buildPatientSectionReportHtml, VALID_SECTIONS } = require('../services/patientReportHtml');

const HISTORY_SECTIONS = new Set(['clinical-proforma', 'adl', 'prescription']);

class PatientReportController {
  /**
   * GET /api/patients/:id/report?format=xlsx|html|pdf&section=patient-details|clinical-proforma|adl|prescription
   * pdf is an alias for html (print-ready document).
   * section omitted = combined "Print All Cards" report.
   */
  static async getPatientReport(req, res) {
    try {
      const { id } = req.params;
      const format = String(req.query.format || 'xlsx').toLowerCase();
      const section = String(req.query.section || 'all').toLowerCase();

      if (!['xlsx', 'html', 'pdf'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Use xlsx, html, or pdf.',
        });
      }

      if (section !== 'all' && !VALID_SECTIONS.includes(section)) {
        return res.status(400).json({
          success: false,
          message: `Invalid section. Use: ${VALID_SECTIONS.join(', ')}.`,
        });
      }

      if (section !== 'all' && format === 'xlsx') {
        return res.status(400).json({
          success: false,
          message: 'Section filter applies to html or pdf format only.',
        });
      }

      const report = await PatientReportService.buildReport(id, req.user?.role);

      if (HISTORY_SECTIONS.has(section) && !report.includeHistory) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized for this report section.',
        });
      }

      const filename = reportFilename(report, format === 'xlsx' ? 'xlsx' : 'html');

      if (format === 'xlsx') {
        const wb = buildWorkbookFromReport(report);
        const buffer = workbookToBuffer(wb);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      const html =
        section === 'all'
          ? buildPatientReportHtml(report)
          : buildPatientSectionReportHtml(report, section);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.send(html);
    } catch (error) {
      console.error('[getPatientReport] Error:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to generate patient report',
      });
    }
  }

  /**
   * POST /api/patients/reports/bulk
   * Body: { format?: 'xlsx', date_from?, date_to?, patient_ids?: number[] }
   */
  static async bulkPatientReports(req, res) {
    try {
      const format = String(req.body?.format || 'xlsx').toLowerCase();
      if (format !== 'xlsx') {
        return res.status(400).json({
          success: false,
          message: 'Bulk export currently supports format=xlsx only.',
        });
      }

      const dateFrom = req.body?.date_from || req.body?.dateFrom || null;
      const dateTo = req.body?.date_to || req.body?.dateTo || null;
      const patientIds = await PatientReportService.resolvePatientIdsForBulk({
        dateFrom,
        dateTo,
        patientIds: req.body?.patient_ids,
      });

      if (!patientIds.length) {
        return res.status(404).json({
          success: false,
          message: 'No patients found for export.',
        });
      }

      const reports = await PatientReportService.buildBulkReports(patientIds, req.user?.role);
      if (!reports.length) {
        return res.status(404).json({
          success: false,
          message: 'No patient data available for export.',
        });
      }

      const wb = buildBulkWorkbook(reports);
      const buffer = workbookToBuffer(wb);
      const filename = bulkFilename(dateFrom, dateTo);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error) {
      console.error('[bulkPatientReports] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate bulk export',
      });
    }
  }
}

module.exports = PatientReportController;
