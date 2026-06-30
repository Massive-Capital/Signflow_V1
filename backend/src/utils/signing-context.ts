import type { Request } from 'express';
import { isEmbedRequest, readEmbedParentOrigin } from '../utils/sdk-domain';
import type { SigningEmbedContext } from '../services/signing.service';

export function buildSigningEmbedContext(req: Request): SigningEmbedContext {
  return {
    isEmbed: isEmbedRequest(req),
    parentOrigin: readEmbedParentOrigin(req),
  };
}
