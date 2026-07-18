import { parse } from 'csv-parse/sync';

// Bulk issuance CSV contract: employee_email, full_name, designation, department, start_date are always required; end_date is optional (still-employed holders); salary is required only for SALARY_PROOF.
export interface BulkIssuanceRow {
  employeeEmail: string;
  fullName: string;
  designation: string;
  department: string;
  startDate: string;
  endDate?: string;
  salary?: string;
}

export interface RowError {
  row: number;
  field: string;
  error: string;
}

export const MAX_ROWS = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// All-or-nothing: the entire batch is rejected if any row fails validation, so nothing is ever persisted for a partially-invalid CSV).
export function parseAndValidateCsv(
  buffer: Buffer,
  documentType: 'EXPERIENCE_LETTER' | 'SALARY_PROOF',
):
  | { rows: BulkIssuanceRow[]; errors?: undefined }
  | { rows?: undefined; errors: RowError[] } {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return {
      errors: [
        {
          row: 0,
          field: 'file',
          error: `Could not parse CSV: ${(error as Error).message}`,
        },
      ],
    };
  }

  if (records.length === 0) {
    return {
      errors: [{ row: 0, field: 'file', error: 'CSV has no data rows' }],
    };
  }
  if (records.length > MAX_ROWS) {
    return {
      errors: [
        {
          row: 0,
          field: 'file',
          error: `Maximum ${MAX_ROWS} rows per batch (found ${records.length})`,
        },
      ],
    };
  }

  const errors: RowError[] = [];
  const rows: BulkIssuanceRow[] = [];

  records.forEach((record, index) => {
    const rowNum = index + 2; // +1 for 1-indexing, +1 for the header row
    const employeeEmail = record.employee_email?.trim();
    const fullName = record.full_name?.trim();
    const designation = record.designation?.trim();
    const department = record.department?.trim();
    const startDate = record.start_date?.trim();
    const endDate = record.end_date?.trim() || undefined;
    const salary = record.salary?.trim() || undefined;

    if (!employeeEmail || !EMAIL_RE.test(employeeEmail)) {
      errors.push({
        row: rowNum,
        field: 'employee_email',
        error: 'Missing or invalid email',
      });
    }
    if (!fullName)
      errors.push({ row: rowNum, field: 'full_name', error: 'Required' });
    if (!designation)
      errors.push({ row: rowNum, field: 'designation', error: 'Required' });
    if (!department)
      errors.push({ row: rowNum, field: 'department', error: 'Required' });
    if (!startDate || !DATE_RE.test(startDate)) {
      errors.push({
        row: rowNum,
        field: 'start_date',
        error: 'Missing or invalid date (YYYY-MM-DD)',
      });
    }
    if (endDate && !DATE_RE.test(endDate)) {
      errors.push({
        row: rowNum,
        field: 'end_date',
        error: 'Invalid date (YYYY-MM-DD)',
      });
    }
    if (documentType === 'SALARY_PROOF' && !salary) {
      errors.push({
        row: rowNum,
        field: 'salary',
        error: 'Required for salary proofs',
      });
    }

    if (employeeEmail && fullName && designation && department && startDate) {
      rows.push({
        employeeEmail,
        fullName,
        designation,
        department,
        startDate,
        endDate,
        salary,
      });
    }
  });

  if (errors.length > 0) return { errors };
  return { rows };
}
