/**
 * Backend patient report API — single endpoint for Excel export and print-ready HTML.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getBaseUrl() {
  return import.meta.env.VITE_API_URL || '/api';
}

function parseFilenameFromDisposition(header) {
  if (!header) return null;
  const match = /filename="([^"]+)"/i.exec(header);
  return match ? match[1] : null;
}

async function parseErrorResponse(res) {
  try {
    const data = await res.json();
    return data?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Download patient report as Excel (.xlsx).
 */
export async function downloadPatientReportExcel(patientId) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/patients/${patientId}/report?format=xlsx`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const blob = await res.blob();
  const filename =
    parseFilenameFromDisposition(res.headers.get('Content-Disposition')) ||
    `patient_${patientId}_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, filename);
  return filename;
}

/**
 * Open print-ready HTML report from backend (triggers browser print dialog).
 */
export async function openPatientReportPrint(patientId) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/patients/${patientId}/report?format=html`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const html = await res.text();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow pop-ups to print');
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Bulk export patients to Excel via backend.
 */
export async function downloadBulkPatientReportExcel({ dateFrom = null, dateTo = null, patientIds = null } = {}) {
  const baseUrl = getBaseUrl();
  const body = { format: 'xlsx' };
  if (dateFrom) body.date_from = dateFrom;
  if (dateTo) body.date_to = dateTo;
  if (patientIds?.length) body.patient_ids = patientIds;

  const res = await fetch(`${baseUrl}/patients/reports/bulk`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const blob = await res.blob();
  const filename =
    parseFilenameFromDisposition(res.headers.get('Content-Disposition')) ||
    `patients_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, filename);
  return filename;
}
