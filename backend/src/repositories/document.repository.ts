import { pool } from '../database/db';
import { resolveRadioGroupIds } from '../utils/radio-field';
import type { DocumentStatus } from '../types/domain';
import type { DocumentRow, EmailAttachmentMeta, FieldRow, RecipientRow } from '../utils/mappers';
import { isUuid } from '../utils/uuid';

interface CreateDocumentInput {
  organizationId: string;
  title: string;
  pages?: number;
}

interface UpdateDocumentInput {
  title?: string;
  status?: DocumentStatus;
  pages?: number;
  fileName?: string;
  fileHash?: string;
  signedFileHash?: string;
  sentContentHash?: string;
  sentAt?: Date;
  sentIp?: string;
  sentByName?: string;
  sentByEmail?: string;
  workflowType?: string;
  emailSubject?: string;
  emailMessage?: string;
}

interface RecipientInput {
  id?: string;
  name: string;
  email: string;
  role: string;
  color: string;
  order?: number;
  profileType?: string;
}

interface FieldInput {
  id?: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  recipientId: string;
  required: boolean;
  value?: string;
  options?: string[];
  radioGroupId?: string;
  profileType?: string;
  profileTypes?: string[];
  pageHash?: string;
  templatePage?: number;
}

export class DocumentRepository {
  async listByOrganization(
    organizationId: string,
    filters?: { status?: DocumentStatus; search?: string },
  ): Promise<DocumentRow[]> {
    const conditions = ['organization_id = $1'];
    const params: unknown[] = [organizationId];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      conditions.push(`LOWER(title) LIKE $${params.length}`);
    }

    const result = await pool.query<DocumentRow>(
      `SELECT * FROM documents
       WHERE ${conditions.join(' AND ')}
       ORDER BY updated_at DESC`,
      params,
    );
    return result.rows;
  }

  async findById(id: string): Promise<DocumentRow | null> {
    if (!isUuid(id)) return null;

    const result = await pool.query<DocumentRow>(
      'SELECT * FROM documents WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findRecipients(documentId: string): Promise<RecipientRow[]> {
    const result = await pool.query<RecipientRow>(
      `SELECT * FROM document_recipients
       WHERE document_id = $1
       ORDER BY order_index NULLS LAST, created_at ASC`,
      [documentId],
    );
    return result.rows;
  }

  async findFields(documentId: string): Promise<FieldRow[]> {
    const result = await pool.query<FieldRow>(
      'SELECT * FROM document_fields WHERE document_id = $1 ORDER BY page, created_at',
      [documentId],
    );
    return result.rows;
  }

  async create(input: CreateDocumentInput): Promise<DocumentRow> {
    const result = await pool.query<DocumentRow>(
      `INSERT INTO documents (organization_id, title, pages)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.organizationId, input.title, input.pages ?? 1],
    );
    return result.rows[0];
  }

  async update(id: string, input: UpdateDocumentInput): Promise<DocumentRow> {
    const result = await pool.query<DocumentRow>(
      `UPDATE documents
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           pages = COALESCE($3, pages),
           file_name = COALESCE($4, file_name),
           file_hash = COALESCE($5, file_hash),
           signed_file_hash = COALESCE($6, signed_file_hash),
           sent_content_hash = COALESCE($7, sent_content_hash),
           workflow_type = COALESCE($8, workflow_type),
           email_subject = COALESCE($9, email_subject),
           email_message = COALESCE($10, email_message),
           sent_at = COALESCE($11, sent_at),
           sent_ip = COALESCE($12, sent_ip),
           sent_by_name = COALESCE($13, sent_by_name),
           sent_by_email = COALESCE($14, sent_by_email),
           updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        input.title,
        input.status,
        input.pages,
        input.fileName,
        input.fileHash,
        input.signedFileHash,
        input.sentContentHash,
        input.workflowType,
        input.emailSubject,
        input.emailMessage,
        input.sentAt ?? null,
        input.sentIp ?? null,
        input.sentByName ?? null,
        input.sentByEmail ?? null,
        id,
      ],
    );
    return result.rows[0];
  }

  async setFileMetadata(
    id: string,
    input: { fileName: string; fileHash: string },
  ): Promise<DocumentRow> {
    const result = await pool.query<DocumentRow>(
      `UPDATE documents
       SET file_name = $1,
           file_hash = $2,
           signed_file_hash = NULL,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [input.fileName, input.fileHash, id],
    );
    return result.rows[0];
  }

  async replaceRecipients(documentId: string, recipients: RecipientInput[]): Promise<RecipientRow[]> {
    await pool.query('DELETE FROM document_recipients WHERE document_id = $1', [documentId]);

    const rows: RecipientRow[] = [];
    for (const recipient of recipients) {
      const result = await pool.query<RecipientRow>(
        `INSERT INTO document_recipients (document_id, name, email, role, color, order_index, profile_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          documentId,
          recipient.name,
          recipient.email,
          recipient.role,
          recipient.color,
          recipient.order ?? null,
          recipient.profileType ?? null,
        ],
      );
      rows.push(result.rows[0]);
    }
    return rows;
  }

  async replaceFields(documentId: string, fields: FieldInput[]): Promise<FieldRow[]> {
    await pool.query('DELETE FROM document_fields WHERE document_id = $1', [documentId]);

    const rows: FieldRow[] = [];
    for (const field of fields) {
      const result = await pool.query<FieldRow>(
        `INSERT INTO document_fields
         (document_id, recipient_id, type, label, x, y, width, height, page, required, value, options, radio_group_id, profile_type, profile_types, page_hash, template_page)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          documentId,
          field.recipientId,
          field.type,
          field.label,
          field.x,
          field.y,
          field.width,
          field.height,
          field.page,
          field.required,
          field.value ?? null,
          field.options?.length ? JSON.stringify(field.options) : null,
          field.radioGroupId ?? null,
          field.profileTypes?.length === 1
            ? field.profileTypes[0]
            : field.profileType ?? null,
          field.profileTypes?.length ? JSON.stringify(field.profileTypes) : null,
          field.pageHash ?? null,
          field.templatePage ?? field.page,
        ],
      );
      rows.push(result.rows[0]);
    }
    return rows;
  }

  async updateFieldValues(
    documentId: string,
    fieldValues: Record<string, string>,
  ): Promise<void> {
    const allRows = await this.findFields(documentId);
    const resolvedGroups = resolveRadioGroupIds(
      allRows.map((row) => ({
        id: row.id,
        type: row.type,
        recipientId: row.recipient_id,
        page: row.page,
        x: Number(row.x),
        y: Number(row.y),
        width: Number(row.width),
        height: Number(row.height),
        radioGroupId: row.radio_group_id,
      })),
    );

    for (const [fieldId, value] of Object.entries(fieldValues)) {
      const normalizedValue = value === '' ? null : value;

      await pool.query(
        `UPDATE document_fields SET value = $1
         WHERE id = $2 AND document_id = $3`,
        [normalizedValue, fieldId, documentId],
      );

      if (value !== 'selected') continue;

      const field = allRows.find((row) => row.id === fieldId);
      if (field?.type !== 'radio') continue;

      const groupId = resolvedGroups.get(fieldId);
      if (!groupId) continue;

      const siblingIds = allRows
        .filter(
          (row) =>
            row.type === 'radio' &&
            row.id !== fieldId &&
            resolvedGroups.get(row.id) === groupId,
        )
        .map((row) => row.id);

      if (siblingIds.length === 0) continue;

      await pool.query(
        `UPDATE document_fields
         SET value = NULL
         WHERE document_id = $1
           AND id = ANY($2::uuid[])`,
        [documentId, siblingIds],
      );
    }
  }

  async updateRecipientProfileType(
    documentId: string,
    recipientId: string,
    profileType: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE document_recipients
       SET profile_type = $1
       WHERE document_id = $2 AND id = $3`,
      [profileType, documentId, recipientId],
    );
  }

  async autofillEmptyDateFields(
    documentId: string,
    recipientId: string,
    dateValue: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE document_fields
       SET value = $1
       WHERE document_id = $2
         AND recipient_id = $3
         AND type = 'date'
         AND (value IS NULL OR BTRIM(value) = '')`,
      [dateValue, documentId, recipientId],
    );
  }

  async clearFieldValues(documentId: string): Promise<void> {
    await pool.query(
      `UPDATE document_fields SET value = NULL WHERE document_id = $1`,
      [documentId],
    );
  }

  async clearSignedFileMetadata(documentId: string): Promise<void> {
    await pool.query(
      `UPDATE documents SET signed_file_hash = NULL, updated_at = NOW() WHERE id = $1`,
      [documentId],
    );
  }

  async countByStatus(organizationId: string): Promise<Record<string, number>> {
    const result = await pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM documents
       WHERE organization_id = $1
       GROUP BY status`,
      [organizationId],
    );
    return Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]));
  }

  async getEmailAttachments(documentId: string): Promise<EmailAttachmentMeta[]> {
    const result = await pool.query<{ email_attachments: EmailAttachmentMeta[] | null }>(
      'SELECT email_attachments FROM documents WHERE id = $1',
      [documentId],
    );
    return result.rows[0]?.email_attachments ?? [];
  }

  async setEmailAttachments(
    documentId: string,
    attachments: EmailAttachmentMeta[],
  ): Promise<void> {
    await pool.query(
      `UPDATE documents
       SET email_attachments = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(attachments), documentId],
    );
  }

  async delete(id: string): Promise<boolean> {
    if (!isUuid(id)) return false;

    const result = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const documentRepository = new DocumentRepository();
