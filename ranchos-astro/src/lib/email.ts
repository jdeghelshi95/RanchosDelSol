import type { ReservationWithCar } from './queries';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'reservations@ranchosdelsol.com';

  if (!apiKey) {
    console.log('[Email] No SENDGRID_API_KEY set — email would have been sent to:', payload.to);
    console.log('[Email] Subject:', payload.subject);
    return true; // Gracefully skip in dev
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: fromEmail, name: 'Ranchos del Sol' },
        subject: payload.subject,
        content: [{ type: 'text/html', value: payload.html }],
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Email] Failed to send:', err);
    return false;
  }
}

export async function sendReservationConfirmation(reservation: ReservationWithCar): Promise<boolean> {
  const startDate = new Date(reservation.start_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const endDate = new Date(reservation.end_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const days = Math.ceil(
    (new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Confirmation – Ranchos del Sol</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;color:#ffffff;font-weight:700;">🌊 Ranchos del Sol</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Costa del Sol, El Salvador</p>
          </td>
        </tr>

        <!-- Confirmation Badge -->
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#ecfdf5;border:2px solid #10b981;border-radius:50px;padding:10px 24px;">
              <span style="color:#059669;font-weight:700;font-size:14px;">✓ Reservation Confirmed — #${reservation.id}</span>
            </div>
            <h2 style="margin:20px 0 8px;font-family:Georgia,serif;font-size:24px;color:#0e7490;">Your Car is Reserved!</h2>
            <p style="margin:0;color:#64748b;font-size:15px;">Hi ${reservation.customer_name}, your reservation has been received and is being processed.</p>
          </td>
        </tr>

        <!-- Car Details -->
        <tr>
          <td style="padding:28px 40px;">
            <div style="background:#f8fafc;border-radius:12px;padding:24px;border-left:4px solid #0891b2;">
              <h3 style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#0e7490;">🚗 Vehicle Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;width:40%;">Vehicle</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${reservation.car_year} ${reservation.car_make} ${reservation.car_model}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">Pickup Date</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">Return Date</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${endDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">Duration</td>
                  <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${days} day${days !== 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">Total Amount</td>
                  <td style="padding:6px 0;color:#0891b2;font-size:16px;font-weight:700;">$${Number(reservation.total_amount).toFixed(2)} USD</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">Payment Status</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:${reservation.payment_status === 'paid' ? '#059669' : '#d97706'};">
                    ${reservation.payment_status === 'paid' ? '✓ Paid' : reservation.payment_status === 'deposit_paid' ? '⏳ Deposit Paid' : '⏳ Pending Payment'}
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- Pickup Instructions -->
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="background:#fffbeb;border-radius:12px;padding:24px;border-left:4px solid #f59e0b;">
              <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:18px;color:#92400e;">📍 Pickup Instructions</h3>
              <p style="margin:0 0 10px;color:#78350f;font-size:14px;line-height:1.6;">
                <strong>Location:</strong> Ranchos del Sol, Costa del Sol, La Paz, El Salvador
              </p>
              <p style="margin:0 0 10px;color:#78350f;font-size:14px;line-height:1.6;">
                <strong>What to bring:</strong> Valid driver's license, passport or national ID, and the credit card used for payment.
              </p>
              <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">
                <strong>Check-in time:</strong> 8:00 AM – 6:00 PM. Please contact us if you need after-hours pickup.
              </p>
            </div>
          </td>
        </tr>

        <!-- Cancellation Policy -->
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="background:#fef2f2;border-radius:12px;padding:24px;border-left:4px solid #ef4444;">
              <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:18px;color:#991b1b;">📋 Cancellation Policy</h3>
              <ul style="margin:0;padding-left:18px;color:#7f1d1d;font-size:14px;line-height:1.8;">
                <li><strong>72+ hours before pickup:</strong> Full refund</li>
                <li><strong>24–72 hours before pickup:</strong> 50% refund</li>
                <li><strong>Less than 24 hours:</strong> No refund</li>
                <li><strong>No-show:</strong> Full charge applies</li>
              </ul>
            </div>
          </td>
        </tr>

        <!-- Contact -->
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0 0 16px;color:#64748b;font-size:14px;">Questions? We're here to help!</p>
            <a href="tel:+50300000000" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:600;font-size:14px;margin:0 6px;">📞 Call Us</a>
            <a href="mailto:info@ranchosdelsol.com" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:600;font-size:14px;margin:0 6px;">✉️ Email Us</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0e7490;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;">
              © ${new Date().getFullYear()} Ranchos del Sol · Costa del Sol, El Salvador<br>
              <a href="https://ranchosdelsol.com" style="color:rgba(255,255,255,0.9);">ranchosdelsol.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: reservation.customer_email,
    subject: `✅ Reservation Confirmed – ${reservation.car_year} ${reservation.car_make} ${reservation.car_model} | Ranchos del Sol`,
    html,
  });
}

export async function sendAdminNotification(reservation: ReservationWithCar): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || 'info@ranchosdelsol.com';
  const html = `
    <h2>New Reservation #${reservation.id}</h2>
    <p><strong>Customer:</strong> ${reservation.customer_name} (${reservation.customer_email})</p>
    <p><strong>Vehicle:</strong> ${reservation.car_year} ${reservation.car_make} ${reservation.car_model}</p>
    <p><strong>Dates:</strong> ${reservation.start_date} → ${reservation.end_date}</p>
    <p><strong>Total:</strong> $${Number(reservation.total_amount).toFixed(2)}</p>
    <p><strong>Phone:</strong> ${reservation.customer_phone || 'N/A'}</p>
    <p><a href="https://ranchosdelsol.com/admin/reservations/${reservation.id}">View in Admin Panel</a></p>
  `;
  return sendEmail({ to: adminEmail, subject: `New Car Rental Reservation #${reservation.id}`, html });
}
