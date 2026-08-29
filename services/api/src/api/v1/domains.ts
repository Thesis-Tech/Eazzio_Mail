import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { DomainService } from '../../application/domain-service.js';
import { PostgresDomainRepository } from '@eazzio/infra-adapters';
import { defaultDb } from '../../config/index.js';

export const domainsRouter: Router = Router();

const domainRepo = new PostgresDomainRepository(defaultDb);
const domainService = new DomainService(domainRepo);

domainsRouter.use(requireAuth);

const registerDomainSchema = z.object({
  domainName: z.string().min(3).max(255),
  organizationId: z.string().uuid().optional().nullable(),
});

// POST /v1/domains - Register new domain & generate DKIM keys
domainsRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = registerDomainSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid domain registration payload',
          details: parsed.error.issues,
        },
      });
    }

    const domainDetails = await domainService.registerDomain(
      parsed.data.domainName,
      parsed.data.organizationId,
    );

    res.status(201).json({
      data: domainDetails,
      message: `Domain ${domainDetails.domainName} registered successfully. Configure DNS records to complete verification.`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/domains - List domains
domainsRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : null;
    const domains = await domainService.listDomains(organizationId);
    res.json({ data: domains });
  } catch (err) {
    next(err);
  }
});

// GET /v1/domains/:id - Get domain details + DNS records
domainsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const domain = await domainService.getDomainById(req.params.id);
    res.json({ data: domain });
  } catch (err) {
    next(err);
  }
});

// POST /v1/domains/:id/verify - Perform live DNS verification check
domainsRouter.post('/:id/verify', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await domainService.verifyDomainDns(req.params.id);
    res.json({
      data: result,
      message: `DNS verification completed with status: ${result.verificationStatus}`,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/domains/:id - Delete custom domain
domainsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await domainService.deleteDomain(req.params.id);
    res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (err) {
    next(err);
  }
});
