import { useState } from 'react';

interface Car {
  id?: number;
  make: string;
  model: string;
  year: number;
  category: string;
  daily_rate: number;
  description: string;
  features: string[];
  seats: number;
  transmission: string;
  fuel_type: string;
  available: boolean;
}

interface Props {
  car?: Car;
  isEdit?: boolean;
}

const FEATURE_SUGGESTIONS = [
  'Air Conditioning', 'GPS Navigation', 'Bluetooth', 'USB Charging', 'Backup Camera',
  'Cruise Control', 'Sunroof', '4WD', 'Leather Seats', 'Apple CarPlay',
  'Android Auto', 'Parking Sensors', 'Lane Assist', 'Heated Seats', 'Roof Rack',
];

export default function CarForm({ car, isEdit = false }: Props) {
  const [form, setForm] = useState<Car>({
    make: car?.make || '',
    model: car?.model || '',
    year: car?.year || new Date().getFullYear(),
    category: car?.category || 'sedan',
    daily_rate: car?.daily_rate || 50,
    description: car?.description || '',
    features: car?.features || [],
    seats: car?.seats || 5,
    transmission: car?.transmission || 'automatic',
    fuel_type: car?.fuel_type || 'gasoline',
    available: car?.available !== false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
        : ['year', 'seats'].includes(name) ? Number(value)
        : name === 'daily_rate' ? parseFloat(value) || 0
        : value,
    }));
    setError('');
  };

  const addFeature = (feature: string) => {
    const f = feature.trim();
    if (f && !form.features.includes(f)) {
      setForm(prev => ({ ...prev, features: [...prev.features, f] }));
    }
    setFeatureInput('');
  };

  const removeFeature = (feature: string) => {
    setForm(prev => ({ ...prev, features: prev.features.filter(f => f !== feature) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.year || !form.category || !form.daily_rate) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/cars/${car!.id}` : '/api/cars';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save car');

      // Redirect to photos page for new cars, or back to list for edits
      if (isEdit) {
        window.location.href = '/admin/cars';
      } else {
        window.location.href = `/admin/cars/${data.id}/photos`;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-sand p-6">
        <h3 className="font-display font-bold text-ocean-dark mb-5">Vehicle Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-beach">Make *</label>
            <input type="text" name="make" value={form.make} onChange={handleChange} placeholder="Toyota" required className="input-beach"/>
          </div>
          <div>
            <label className="label-beach">Model *</label>
            <input type="text" name="model" value={form.model} onChange={handleChange} placeholder="Land Cruiser" required className="input-beach"/>
          </div>
          <div>
            <label className="label-beach">Year *</label>
            <input type="number" name="year" value={form.year} onChange={handleChange} min="2000" max={new Date().getFullYear() + 1} required className="input-beach"/>
          </div>
          <div>
            <label className="label-beach">Category *</label>
            <select name="category" value={form.category} onChange={handleChange} required className="input-beach">
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="truck">Truck</option>
              <option value="van">Van</option>
              <option value="convertible">Convertible</option>
              <option value="economy">Economy</option>
            </select>
          </div>
          <div>
            <label className="label-beach">Daily Rate (USD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-beach font-medium">$</span>
              <input type="number" name="daily_rate" value={form.daily_rate} onChange={handleChange} min="1" step="0.01" required className="input-beach pl-7"/>
            </div>
          </div>
          <div>
            <label className="label-beach">Number of Seats</label>
            <input type="number" name="seats" value={form.seats} onChange={handleChange} min="1" max="15" className="input-beach"/>
          </div>
          <div>
            <label className="label-beach">Transmission</label>
            <select name="transmission" value={form.transmission} onChange={handleChange} className="input-beach">
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="label-beach">Fuel Type</label>
            <select name="fuel_type" value={form.fuel_type} onChange={handleChange} className="input-beach">
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label-beach">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description of the vehicle..." className="input-beach resize-none"/>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl shadow-sm border border-sand p-6">
        <h3 className="font-display font-bold text-ocean-dark mb-5">Features & Amenities</h3>

        {/* Quick add suggestions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FEATURE_SUGGESTIONS.filter(f => !form.features.includes(f)).map(f => (
            <button key={f} type="button" onClick={() => addFeature(f)}
              className="text-xs px-3 py-1.5 rounded-full border border-sand-dark text-gray-beach hover:border-ocean hover:text-ocean transition-all">
              + {f}
            </button>
          ))}
        </div>

        {/* Custom feature input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={featureInput}
            onChange={e => setFeatureInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(featureInput); } }}
            placeholder="Add custom feature..."
            className="input-beach flex-1"
          />
          <button type="button" onClick={() => addFeature(featureInput)} className="btn-secondary px-4">Add</button>
        </div>

        {/* Selected features */}
        {form.features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.features.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 bg-turquoise-light text-ocean-dark text-sm px-3 py-1.5 rounded-full font-medium">
                ✓ {f}
                <button type="button" onClick={() => removeFeature(f)} className="text-ocean hover:text-red-500 transition-colors ml-1">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="bg-white rounded-2xl shadow-sm border border-sand p-6">
        <h3 className="font-display font-bold text-ocean-dark mb-4">Availability</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" name="available" checked={form.available} onChange={handleChange} className="sr-only"/>
            <div className={`w-12 h-6 rounded-full transition-colors ${form.available ? 'bg-ocean' : 'bg-sand-dark'}`}></div>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-6' : ''}`}></div>
          </div>
          <div>
            <span className="font-semibold text-ocean-dark">{form.available ? 'Available for Rental' : 'Not Available'}</span>
            <p className="text-gray-beach text-xs mt-0.5">Toggle to show/hide this vehicle on the public website</p>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="flex gap-4">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3.5 disabled:opacity-60">
          {loading ? 'Saving...' : isEdit ? '✓ Save Changes' : '→ Save & Add Photos'}
        </button>
        <a href="/admin/cars" className="btn-secondary px-6 py-3.5">Cancel</a>
      </div>
    </form>
  );
}
