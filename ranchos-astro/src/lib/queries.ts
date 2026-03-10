import { db } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  category: 'sedan' | 'suv' | 'truck' | 'van' | 'convertible' | 'economy';
  daily_rate: number;
  description: string | null;
  features: string | null; // JSON array
  seats: number;
  transmission: 'automatic' | 'manual';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  available: number; // 1 = true, 0 = false
  created_at: string;
  updated_at: string;
}

export interface CarPhoto {
  id: number;
  car_id: number;
  url: string;
  file_key: string;
  is_primary: number;
  created_at: string;
}

export interface Reservation {
  id: number;
  car_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  start_date: string;
  end_date: string;
  total_amount: number;
  deposit_amount: number | null;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  payment_status: 'unpaid' | 'deposit_paid' | 'paid';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarWithPhotos extends Car {
  photos: CarPhoto[];
  primaryPhoto: string | null;
}

export interface ReservationWithCar extends Reservation {
  car_make: string;
  car_model: string;
  car_year: number;
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export function getCars(availableOnly = false): Car[] {
  const stmt = availableOnly
    ? db.prepare('SELECT * FROM cars WHERE available = 1 ORDER BY make, model')
    : db.prepare('SELECT * FROM cars ORDER BY make, model');
  return stmt.all() as Car[];
}

export function getCarById(id: number): Car | undefined {
  return db.prepare('SELECT * FROM cars WHERE id = ?').get(id) as Car | undefined;
}

export function getCarWithPhotos(id: number): CarWithPhotos | undefined {
  const car = getCarById(id);
  if (!car) return undefined;
  const photos = db.prepare('SELECT * FROM car_photos WHERE car_id = ? ORDER BY is_primary DESC, id ASC').all(id) as CarPhoto[];
  const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || null;
  return { ...car, photos, primaryPhoto };
}

export function getCarsWithPrimaryPhoto(availableOnly = false): CarWithPhotos[] {
  const cars = getCars(availableOnly);
  return cars.map(car => {
    const photos = db.prepare('SELECT * FROM car_photos WHERE car_id = ? ORDER BY is_primary DESC, id ASC').all(car.id) as CarPhoto[];
    const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || null;
    return { ...car, photos, primaryPhoto };
  });
}

export function createCar(data: Omit<Car, 'id' | 'created_at' | 'updated_at'>): Car {
  const stmt = db.prepare(`
    INSERT INTO cars (make, model, year, category, daily_rate, description, features, seats, transmission, fuel_type, available)
    VALUES (@make, @model, @year, @category, @daily_rate, @description, @features, @seats, @transmission, @fuel_type, @available)
  `);
  const result = stmt.run(data);
  return getCarById(result.lastInsertRowid as number)!;
}

export function updateCar(id: number, data: Partial<Omit<Car, 'id' | 'created_at' | 'updated_at'>>): Car | undefined {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return getCarById(id);
  db.prepare(`UPDATE cars SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
  return getCarById(id);
}

export function deleteCar(id: number): void {
  db.prepare('DELETE FROM cars WHERE id = ?').run(id);
}

// ─── Car Photos ───────────────────────────────────────────────────────────────

export function addCarPhoto(carId: number, url: string, fileKey: string, isPrimary = false): CarPhoto {
  if (isPrimary) {
    db.prepare('UPDATE car_photos SET is_primary = 0 WHERE car_id = ?').run(carId);
  }
  const stmt = db.prepare('INSERT INTO car_photos (car_id, url, file_key, is_primary) VALUES (?, ?, ?, ?)');
  const result = stmt.run(carId, url, fileKey, isPrimary ? 1 : 0);
  return db.prepare('SELECT * FROM car_photos WHERE id = ?').get(result.lastInsertRowid) as CarPhoto;
}

export function deleteCarPhoto(id: number): void {
  db.prepare('DELETE FROM car_photos WHERE id = ?').run(id);
}

export function setPrimaryPhoto(carId: number, photoId: number): void {
  db.prepare('UPDATE car_photos SET is_primary = 0 WHERE car_id = ?').run(carId);
  db.prepare('UPDATE car_photos SET is_primary = 1 WHERE id = ? AND car_id = ?').run(photoId, carId);
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export function getReservations(): ReservationWithCar[] {
  return db.prepare(`
    SELECT r.*, c.make as car_make, c.model as car_model, c.year as car_year
    FROM reservations r
    JOIN cars c ON r.car_id = c.id
    ORDER BY r.created_at DESC
  `).all() as ReservationWithCar[];
}

export function getReservationById(id: number): ReservationWithCar | undefined {
  return db.prepare(`
    SELECT r.*, c.make as car_make, c.model as car_model, c.year as car_year
    FROM reservations r
    JOIN cars c ON r.car_id = c.id
    WHERE r.id = ?
  `).get(id) as ReservationWithCar | undefined;
}

export function createReservation(data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Reservation {
  const stmt = db.prepare(`
    INSERT INTO reservations (car_id, customer_name, customer_email, customer_phone, start_date, end_date, total_amount, deposit_amount, status, stripe_payment_intent_id, stripe_session_id, payment_status, notes)
    VALUES (@car_id, @customer_name, @customer_email, @customer_phone, @start_date, @end_date, @total_amount, @deposit_amount, @status, @stripe_payment_intent_id, @stripe_session_id, @payment_status, @notes)
  `);
  const result = stmt.run(data);
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid) as Reservation;
}

export function updateReservation(id: number, data: Partial<Omit<Reservation, 'id' | 'created_at'>>): Reservation | undefined {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as Reservation;
  db.prepare(`UPDATE reservations SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as Reservation;
}

export function checkCarAvailability(carId: number, startDate: string, endDate: string, excludeReservationId?: number): boolean {
  const query = excludeReservationId
    ? `SELECT COUNT(*) as count FROM reservations 
       WHERE car_id = ? AND status NOT IN ('cancelled','completed')
       AND id != ?
       AND NOT (end_date <= ? OR start_date >= ?)`
    : `SELECT COUNT(*) as count FROM reservations 
       WHERE car_id = ? AND status NOT IN ('cancelled','completed')
       AND NOT (end_date <= ? OR start_date >= ?)`;

  const params = excludeReservationId
    ? [carId, excludeReservationId, startDate, endDate]
    : [carId, startDate, endDate];

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count === 0;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getAdminStats() {
  const totalCars = (db.prepare('SELECT COUNT(*) as c FROM cars').get() as any).c;
  const availableCars = (db.prepare('SELECT COUNT(*) as c FROM cars WHERE available = 1').get() as any).c;
  const totalReservations = (db.prepare('SELECT COUNT(*) as c FROM reservations').get() as any).c;
  const activeReservations = (db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status IN ('pending','confirmed','active')").get() as any).c;
  const revenue = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as r FROM reservations WHERE status NOT IN ('cancelled')").get() as any).r;
  const recentReservations = db.prepare(`
    SELECT r.*, c.make as car_make, c.model as car_model
    FROM reservations r JOIN cars c ON r.car_id = c.id
    ORDER BY r.created_at DESC LIMIT 5
  `).all();
  return { totalCars, availableCars, totalReservations, activeReservations, revenue, recentReservations };
}
