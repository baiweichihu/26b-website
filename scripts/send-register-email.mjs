import fs from 'node:fs/promises';
import path from 'node:path';
import { MailtrapClient } from 'mailtrap';

const cwd = process.cwd();

const TEMPLATE_FILES = {
  approved: path.join(
    cwd,
    'database',
    'identity-refactor',
    'email-templates',
    'register-approved.md'
  ),
  rejected: path.join(
    cwd,
    'database',
    'identity-refactor',
    'email-templates',
    'register-rejected.md'
  ),
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function applyTemplate(rawTemplate, variables) {
  return rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return variables[key] ?? '';
  });
}

function splitSubjectAndBody(templateText) {
  const lines = templateText.split(/\r?\n/);
  const subjectLine = lines.find((line) => line.startsWith('主题：')) || '';
  const subject = subjectLine.replace(/^主题：\s*/, '').trim();

  let bodyLines = lines;
  const subjectIndex = lines.findIndex((line) => line.startsWith('主题：'));
  if (subjectIndex >= 0) {
    bodyLines = lines.slice(subjectIndex + 1);
  }

  const separatorIndex = bodyLines.findIndex((line) => line.trim() === '---');
  if (separatorIndex >= 0) {
    bodyLines = bodyLines.slice(0, separatorIndex);
  }

  const body = bodyLines.join('\n').trim();
  return { subject, body };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const status = (args.status || '').toLowerCase();
  const recipientEmail = args.to;
  const applicantName = args.name || '申请人';
  const rejectReason = args.reason || '';

  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('参数错误：--status 仅支持 approved 或 rejected');
  }
  if (!recipientEmail) {
    throw new Error('参数错误：缺少 --to 邮箱地址');
  }

  const token = process.env.MAILTRAP_API_TOKEN;
  if (!token) {
    throw new Error('缺少环境变量 MAILTRAP_API_TOKEN');
  }

  const senderEmail = process.env.MAILTRAP_SENDER_EMAIL || 'hello@demomailtrap.co';
  const senderName = process.env.MAILTRAP_SENDER_NAME || '少26B网站管理团队';

  const templatePath = TEMPLATE_FILES[status];
  const rawTemplate = await fs.readFile(templatePath, 'utf-8');

  const rejectReasonBlock = rejectReason.trim()
    ? `拒绝原因：${rejectReason.trim()}`
    : '';

  const rendered = applyTemplate(rawTemplate, {
    applicant_name: applicantName,
    reject_reason: rejectReason.trim(),
    reject_reason_block: rejectReasonBlock,
  });

  const { subject, body } = splitSubjectAndBody(rendered);
  if (!subject || !body) {
    throw new Error('模板解析失败：请检查主题或正文格式');
  }

  const client = new MailtrapClient({ token });

  const response = await client.send({
    from: {
      email: senderEmail,
      name: senderName,
    },
    to: [{ email: recipientEmail }],
    subject,
    text: body,
    category: status === 'approved' ? 'register-approved' : 'register-rejected',
  });

  console.log('邮件发送成功:', response);
}

main().catch((error) => {
  console.error('邮件发送失败:', error.message || error);
  process.exit(1);
});
