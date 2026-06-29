import { pool } from '../database/db';
import type { RecipientRow } from '../utils/mappers';
import type { RecipientSigningStatus } from '../types/domain';
import {
  getBuyers,
  getSeller,
  isInvestorSponsorWorkflow,
} from '../utils/investor-sponsor-workflow';

export interface SigningSessionRow {
  id: string;
  token_hash: string;
  document_id: string;
  recipient_id: string;
  investor_recipient_id: string | null;
  expires_at: Date;
  viewed_at: Date | null;
  completed_at: Date | null;
  declined_at: Date | null;
  created_at: Date;
  sent_ip: string | null;
  viewed_ip: string | null;
  signed_ip: string | null;
}

export interface RecipientSigningInfo {
  status: RecipientSigningStatus;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  sentIp?: string;
  viewedIp?: string;
  signedIp?: string;
}

interface CreateSessionInput {
  tokenHash: string;
  documentId: string;
  recipientId: string;
  investorRecipientId?: string;
  expiresAt: Date;
  sentIp?: string;
}

export class SigningRepository {
  async create(input: CreateSessionInput): Promise<SigningSessionRow> {
    const result = await pool.query<SigningSessionRow>(
      `INSERT INTO signing_sessions (token_hash, document_id, recipient_id, investor_recipient_id, expires_at, sent_ip)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.tokenHash,
        input.documentId,
        input.recipientId,
        input.investorRecipientId ?? null,
        input.expiresAt,
        input.sentIp ?? null,
      ],
    );
    return result.rows[0];
  }

  async findValidByTokenHash(tokenHash: string): Promise<SigningSessionRow | null> {
    const result = await pool.query<SigningSessionRow>(
      `SELECT * FROM signing_sessions
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND completed_at IS NULL
         AND declined_at IS NULL`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<SigningSessionRow | null> {
    const result = await pool.query<SigningSessionRow>(
      `SELECT * FROM signing_sessions
       WHERE token_hash = $1
         AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async markViewed(tokenHash: string, viewedIp?: string): Promise<void> {
    if (viewedIp) {
      await pool.query(
        `UPDATE signing_sessions
         SET viewed_at = COALESCE(viewed_at, NOW()),
             viewed_ip = COALESCE(viewed_ip, $2)
         WHERE token_hash = $1`,
        [tokenHash, viewedIp],
      );
      return;
    }

    await pool.query(
      `UPDATE signing_sessions
       SET viewed_at = NOW()
       WHERE token_hash = $1 AND viewed_at IS NULL`,
      [tokenHash],
    );
  }

  async markCompleted(tokenHash: string, signedIp?: string): Promise<SigningSessionRow | null> {
    const result = await pool.query<SigningSessionRow>(
      `UPDATE signing_sessions
       SET completed_at = NOW(),
           signed_ip = COALESCE(signed_ip, $2),
           viewed_at = COALESCE(viewed_at, NOW()),
           viewed_ip = COALESCE(viewed_ip, $2)
       WHERE token_hash = $1
       RETURNING *`,
      [tokenHash, signedIp ?? null],
    );
    return result.rows[0] ?? null;
  }

  async markDeclined(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE signing_sessions SET declined_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  async getSignedRecipientIds(documentId: string): Promise<Set<string>> {
    const result = await pool.query<{ recipient_id: string }>(
      `SELECT recipient_id
       FROM signing_sessions
       WHERE document_id = $1
         AND completed_at IS NOT NULL`,
      [documentId],
    );

    return new Set(result.rows.map((row) => row.recipient_id));
  }

  async hasActiveSessionForRecipient(
    documentId: string,
    recipientId: string,
  ): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM signing_sessions
         WHERE document_id = $1
           AND recipient_id = $2
           AND expires_at > NOW()
           AND completed_at IS NULL
           AND declined_at IS NULL
       ) AS exists`,
      [documentId, recipientId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async allRecipientsSigned(documentId: string): Promise<boolean> {
    const result = await pool.query<{ recipient_count: string; signed_count: string }>(
      `SELECT
         (SELECT COUNT(*)::text FROM document_recipients WHERE document_id = $1) AS recipient_count,
         (SELECT COUNT(*)::text FROM signing_sessions WHERE document_id = $1 AND completed_at IS NOT NULL) AS signed_count`,
      [documentId],
    );

    const recipientCount = Number(result.rows[0]?.recipient_count ?? 0);
    const signedCount = Number(result.rows[0]?.signed_count ?? 0);

    return recipientCount > 0 && recipientCount === signedCount;
  }

  async hasActiveSponsorSessionForInvestor(
    documentId: string,
    sellerRecipientId: string,
    investorRecipientId: string,
  ): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM signing_sessions
         WHERE document_id = $1
           AND recipient_id = $2
           AND investor_recipient_id = $3
           AND expires_at > NOW()
           AND completed_at IS NULL
           AND declined_at IS NULL
       ) AS exists`,
      [documentId, sellerRecipientId, investorRecipientId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async hasCompletedOwnSigningSession(
    documentId: string,
    recipientId: string,
  ): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM signing_sessions
         WHERE document_id = $1
           AND recipient_id = $2
           AND investor_recipient_id IS NULL
           AND completed_at IS NOT NULL
       ) AS exists`,
      [documentId, recipientId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async hasCompletedSponsorSessionForInvestor(
    documentId: string,
    sellerRecipientId: string,
    investorRecipientId: string,
  ): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM signing_sessions
         WHERE document_id = $1
           AND recipient_id = $2
           AND investor_recipient_id = $3
           AND completed_at IS NOT NULL
       ) AS exists`,
      [documentId, sellerRecipientId, investorRecipientId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async isInvestorSponsorWorkflowComplete(
    documentId: string,
    buyerRecipientIds: string[],
    sellerRecipientId: string,
  ): Promise<boolean> {
    if (buyerRecipientIds.length === 0) return false;

    for (const buyerId of buyerRecipientIds) {
      const buyerSigned = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM signing_sessions
           WHERE document_id = $1
             AND recipient_id = $2
             AND investor_recipient_id IS NULL
             AND completed_at IS NOT NULL
         ) AS exists`,
        [documentId, buyerId],
      );

      if (!buyerSigned.rows[0]?.exists) return false;

      const sponsorSigned = await this.hasCompletedSponsorSessionForInvestor(
        documentId,
        sellerRecipientId,
        buyerId,
      );

      if (!sponsorSigned) return false;
    }

    return true;
  }

  async getRecipientIdsWithSessions(documentId: string): Promise<Set<string>> {
    const result = await pool.query<{ recipient_id: string }>(
      `SELECT DISTINCT recipient_id
       FROM signing_sessions
       WHERE document_id = $1`,
      [documentId],
    );

    return new Set(result.rows.map((row) => row.recipient_id));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await pool.query(`DELETE FROM signing_sessions WHERE document_id = $1`, [documentId]);
  }

  async getRecipientSigningInfo(
    documentId: string,
  ): Promise<Map<string, RecipientSigningInfo>> {
    const result = await pool.query<SigningSessionRow>(
      `SELECT *
       FROM signing_sessions
       WHERE document_id = $1
         AND declined_at IS NULL
       ORDER BY created_at DESC`,
      [documentId],
    );

    const sessionsByRecipient = new Map<string, SigningSessionRow[]>();
    for (const session of result.rows) {
      const existing = sessionsByRecipient.get(session.recipient_id) ?? [];
      existing.push(session);
      sessionsByRecipient.set(session.recipient_id, existing);
    }

    const infoByRecipient = new Map<string, RecipientSigningInfo>();
    const now = Date.now();

    for (const [recipientId, sessions] of sessionsByRecipient) {
      const signedSession = sessions.find((session) => session.completed_at);
      if (signedSession?.completed_at) {
        infoByRecipient.set(recipientId, {
          status: 'signed',
          sentAt: signedSession.created_at.toISOString(),
          signedAt: signedSession.completed_at.toISOString(),
          viewedAt: signedSession.viewed_at?.toISOString(),
          sentIp: signedSession.sent_ip ?? undefined,
          viewedIp: signedSession.viewed_ip ?? undefined,
          signedIp: signedSession.signed_ip ?? undefined,
        });
        continue;
      }

      const activeIncomplete = sessions.find(
        (session) =>
          !session.completed_at && session.expires_at.getTime() > now,
      );

      if (activeIncomplete) {
        infoByRecipient.set(recipientId, {
          status: activeIncomplete.viewed_at ? 'viewed' : 'sent',
          sentAt: activeIncomplete.created_at.toISOString(),
          viewedAt: activeIncomplete.viewed_at?.toISOString(),
          sentIp: activeIncomplete.sent_ip ?? undefined,
          viewedIp: activeIncomplete.viewed_ip ?? undefined,
        });
        continue;
      }

      const viewedSession = sessions.find((session) => session.viewed_at);
      const referenceSession = viewedSession ?? sessions[0];
      infoByRecipient.set(recipientId, {
        status: viewedSession ? 'viewed' : 'sent',
        sentAt: referenceSession?.created_at.toISOString(),
        viewedAt: viewedSession?.viewed_at?.toISOString(),
        sentIp: referenceSession?.sent_ip ?? undefined,
        viewedIp: viewedSession?.viewed_ip ?? undefined,
      });
    }

    return infoByRecipient;
  }

  async getRecipientSigningStatuses(
    documentId: string,
  ): Promise<Map<string, RecipientSigningStatus>> {
    const info = await this.getRecipientSigningInfo(documentId);
    return new Map(
      [...info.entries()].map(([recipientId, recipientInfo]) => [
        recipientId,
        recipientInfo.status,
      ]),
    );
  }

  async getDocumentSendEvent(
    documentId: string,
  ): Promise<{ sentAt?: string; sentIp?: string } | undefined> {
    const result = await pool.query<{ created_at: Date; sent_ip: string | null }>(
      `SELECT created_at, sent_ip
       FROM signing_sessions
       WHERE document_id = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [documentId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      sentAt: row.created_at.toISOString(),
      sentIp: row.sent_ip ?? undefined,
    };
  }

  async getDocumentCompletedAt(documentId: string): Promise<string | undefined> {
    const result = await pool.query<{ completed_at: Date | null }>(
      `SELECT MAX(completed_at) AS completed_at
       FROM signing_sessions
       WHERE document_id = $1
         AND completed_at IS NOT NULL`,
      [documentId],
    );

    const completedAt = result.rows[0]?.completed_at;
    return completedAt ? completedAt.toISOString() : undefined;
  }

  async createForDocumentRecipients(
    documentId: string,
    recipientIds: string[],
    expiresAt: Date,
    tokenHashes: string[],
  ): Promise<void> {
    for (let i = 0; i < recipientIds.length; i += 1) {
      await this.create({
        tokenHash: tokenHashes[i],
        documentId,
        recipientId: recipientIds[i],
        expiresAt,
      });
    }
  }

  async isWorkflowComplete(documentId: string): Promise<boolean> {
    const recipientsResult = await pool.query<RecipientRow>(
      `SELECT * FROM document_recipients WHERE document_id = $1`,
      [documentId],
    );
    const recipients = recipientsResult.rows;

    if (isInvestorSponsorWorkflow(recipients)) {
      const seller = getSeller(recipients);
      if (!seller) return false;

      return this.isInvestorSponsorWorkflowComplete(
        documentId,
        getBuyers(recipients).map((buyer) => buyer.id),
        seller.id,
      );
    }

    return this.allRecipientsSigned(documentId);
  }
}

export const signingRepository = new SigningRepository();
