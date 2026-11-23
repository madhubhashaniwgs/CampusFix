// Transactional email via the Resend HTTPS API (no SDK dependency).
// When RESEND_API_KEY is absent the service runs in development
// mode: messages are logged without secrets instead of being sent.
// Delivery failures are always swallowed by callers — they must
// never break the business operation that triggered them.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const layout = (title, bodyHtml) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#f5f3ff;padding:24px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px 12px 0 0;padding:20px 24px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">CampusFix</h1>
      <p style="color:#ddd6fe;margin:4px 0 0;font-size:12px;">Campus Issue Management</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #ede9fe;">
      <h2 style="color:#4c1d95;margin:0 0 12px;font-size:16px;">${escapeHtml(title)}</h2>
      ${bodyHtml}
      <p style="color:#9ca3af;font-size:11px;margin-top:24px;">
        You received this email because of activity on your CampusFix account.
      </p>
    </div>
  </div>`;

const button = (href, label) => `
  <a href="${escapeHtml(href)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">${escapeHtml(label)}</a>`;

const row = (label, value) => `
  <tr>
    <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;color:#1f2937;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;

class EmailService {
  constructor() {
    this.enabled = Boolean(process.env.RESEND_API_KEY);
    this.from = process.env.EMAIL_FROM || 'CampusFix <noreply@campusfix.app>';
  }

  isConfigured() {
    return this.enabled;
  }

  async send({ to, subject, html, text }) {
    if (!to) return false;

    if (!this.enabled) {
      // Development/test mode: no real delivery, no secrets logged.
      console.log(
        `[${new Date().toISOString()}] Email (dev mode, not sent) to=${to} subject="${subject}"`
      );
      return true;
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html, text }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        // Never log the API key; the response body may contain
        // provider details but not our secret.
        console.error(
          `[${new Date().toISOString()}] Email send failed: status=${response.status} ${body.slice(0, 200)}`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Email send error: ${error.message}`);
      return false;
    }
  }

  // --- Templates -------------------------------------------------

  issueReported({ ticketId, title, category, priority, issueUrl }) {
    const subject = `Issue reported: ${ticketId}`;
    const html = layout(
      'Issue Reported Successfully',
      `<p style="color:#374151;font-size:14px;">Your maintenance issue has been submitted and is now visible to the CampusFix team.</p>
       <table style="margin:16px 0;border-collapse:collapse;">${row('Ticket', ticketId)}${row('Title', title)}${row('Category', category)}${row('Priority', priority)}</table>
       ${button(issueUrl, 'View My Issues')}`
    );
    const text = `Issue reported: ${ticketId}\n\nTitle: ${title}\nCategory: ${category}\nPriority: ${priority}\n\nView: ${issueUrl}`;
    return { subject, html, text };
  }

  issueAssigned({ ticketId, title, assigneeName, issueUrl }) {
    const subject = `New issue assigned: ${ticketId}`;
    const html = layout(
      'New Issue Assigned To You',
      `<p style="color:#374151;font-size:14px;">Hi ${escapeHtml(assigneeName)}, a new issue has been assigned to you.</p>
       <table style="margin:16px 0;border-collapse:collapse;">${row('Ticket', ticketId)}${row('Title', title)}</table>
       ${button(issueUrl, 'View Issue')}`
    );
    const text = `New issue assigned to you: ${ticketId}\nTitle: ${title}\nView: ${issueUrl}`;
    return { subject, html, text };
  }

  issueStatusChanged({ ticketId, title, status, issueUrl }) {
    const label =
      status === 'resolved' ? 'resolved' : status === 'in_progress' ? 'in progress' : status;
    const subject = `Issue ${label}: ${ticketId}`;
    const html = layout(
      `Issue ${escapeHtml(label)}`,
      `<p style="color:#374151;font-size:14px;">Your reported issue has been updated.</p>
       <table style="margin:16px 0;border-collapse:collapse;">${row('Ticket', ticketId)}${row('Title', title)}${row('New Status', label)}</table>
       ${button(issueUrl, 'View Issue')}`
    );
    const text = `Issue ${label}: ${ticketId}\nTitle: ${title}\nStatus: ${label}\nView: ${issueUrl}`;
    return { subject, html, text };
  }

  staffApproved({ name, loginUrl }) {
    const subject = 'Your CampusFix staff account is approved';
    const html = layout(
      'Staff Account Approved',
      `<p style="color:#374151;font-size:14px;">Hi ${escapeHtml(name)}, your staff account has been approved. You can now log in and start managing assigned issues.</p>
       ${button(loginUrl, 'Log In')}`
    );
    const text = `Hi ${name}, your CampusFix staff account has been approved. Log in: ${loginUrl}`;
    return { subject, html, text };
  }

  staffRejected({ name }) {
    const subject = 'CampusFix staff registration update';
    const html = layout(
      'Staff Registration Update',
      `<p style="color:#374151;font-size:14px;">Hi ${escapeHtml(name)}, your staff registration request was not approved at this time. If you believe this is a mistake, please contact the administrator.</p>`
    );
    const text = `Hi ${name}, your CampusFix staff registration was not approved. Contact the administrator if you have questions.`;
    return { subject, html, text };
  }
}

export default new EmailService();
