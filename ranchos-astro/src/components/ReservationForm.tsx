import { useState, useEffect } from 'react';

interface Props {
  carId: number;
  carName: string;
  dailyRate: number;
}

export default function ReservationForm({ carId, carName, dailyRate }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    startDate: today,
    endDate: tomorrow,
    notes: '',
  });
  const [days, setDays] = useState(1);
  const [total, setTotal] = useState(dailyRate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [reservationId, setReservationId] = useState<number | null>(null);

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const d = Math.max(1, diff);
      setDays(d);
      setTotal(d * dailyRate);
    }
  }, [form.startDate, form.endDate, dailyRate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail || !form.startDate || !form.endDate) {
      setError('Please fill in all required fields.');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError('Return date must be after pickup date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          ...form,
          totalAmount: total,
          depositAmount: Math.min(150, total),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create reservation');

      setReservationId(data.reservationId);

      // If Stripe is configured, redirect to checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 className="font-display text-2xl font-bold text-ocean-dark mb-3">Reservation Confirmed!</h3>
        <p className="text-gray-beach mb-2">
          Thank you, <strong>{form.customerName}</strong>! Your reservation for the <strong>{carName}</strong> has been received.
        </p>
        <p className="text-gray-beach text-sm mb-6">
          A confirmation email has been sent to <strong>{form.customerEmail}</strong> with all the details.
        </p>
        <div className="bg-sand/50 rounded-xl p-5 text-left mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-beach">Reservation #</span><p className="font-semibold text-ocean-dark">{reservationId}</p></div>
            <div><span className="text-gray-beach">Vehicle</span><p className="font-semibold text-ocean-dark">{carName}</p></div>
            <div><span className="text-gray-beach">Pickup</span><p className="font-semibold text-ocean-dark">{new Date(form.startDate).toLocaleDateString()}</p></div>
            <div><span className="text-gray-beach">Return</span><p className="font-semibold text-ocean-dark">{new Date(form.endDate).toLocaleDateString()}</p></div>
            <div><span className="text-gray-beach">Duration</span><p className="font-semibold text-ocean-dark">{days} day{days !== 1 ? 's' : ''}</p></div>
            <div><span className="text-gray-beach">Total</span><p className="font-bold text-coral text-lg">${total.toFixed(2)}</p></div>
          </div>
        </div>
        <a href="/cars" className="btn-secondary inline-flex">Browse More Cars</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Customer Name */}
        <div className="md:col-span-2">
          <label className="label-beach">Full Name *</label>
          <input
            type="text"
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            placeholder="John Doe"
            required
            className="input-beach"
          />
        </div>

        {/* Email */}
        <div>
          <label className="label-beach">Email Address *</label>
          <input
            type="email"
            name="customerEmail"
            value={form.customerEmail}
            onChange={handleChange}
            placeholder="john@example.com"
            required
            className="input-beach"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="label-beach">Phone Number</label>
          <input
            type="tel"
            name="customerPhone"
            value={form.customerPhone}
            onChange={handleChange}
            placeholder="+503 0000-0000"
            className="input-beach"
          />
        </div>

        {/* Dates */}
        <div>
          <label className="label-beach">Pickup Date *</label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            min={today}
            onChange={handleChange}
            required
            className="input-beach"
          />
        </div>

        <div>
          <label className="label-beach">Return Date *</label>
          <input
            type="date"
            name="endDate"
            value={form.endDate}
            min={form.startDate || today}
            onChange={handleChange}
            required
            className="input-beach"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="label-beach">Special Requests (optional)</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any special requirements or notes..."
            rows={3}
            className="input-beach resize-none"
          />
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-sand/50 rounded-xl p-5 mt-5">
        <h4 className="font-semibold text-ocean-dark mb-3">Booking Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-beach">{carName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-beach">${dailyRate.toFixed(2)} × {days} day{days !== 1 ? 's' : ''}</span>
            <span className="font-semibold">${(dailyRate * days).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-beach">Security Deposit</span>
            <span className="font-semibold">$150.00</span>
          </div>
          <div className="border-t border-sand pt-2 flex justify-between">
            <span className="font-bold text-ocean-dark">Total (rental only)</span>
            <span className="font-bold text-coral text-lg">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-coral-light border border-coral/30 rounded-xl text-coral-dark text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center mt-6 py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Confirm Reservation — ${total.toFixed(2)}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-beach mt-4">
        By reserving, you agree to our <a href="/terms" className="text-ocean underline">terms</a> and <a href="/privacy" className="text-ocean underline">cancellation policy</a>.
      </p>
    </form>
  );
}
