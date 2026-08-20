import crypto from 'crypto';

export interface DkimSignParams {
  rawMime: Buffer;
  domainName: string;
  selector: string;
  privateKeyPem: string;
}

export class DkimSigner {
  public static sign(params: DkimSignParams): Buffer {
    const canonicalHeaders = `from:to:subject:date:message-id`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(params.rawMime);
    const signature = sign.sign(params.privateKeyPem, 'base64');

    const dkimHeader = `DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${params.domainName}; s=${params.selector}; h=${canonicalHeaders}; b=${signature}\r\n`;
    return Buffer.concat([Buffer.from(dkimHeader, 'utf-8'), params.rawMime]);
  }
}
