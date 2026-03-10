import { db, ensureDb } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  category: 'sedan' | 'suv' | 'truck' | 'van' | 'convertible' | 'economy';
  daily_rate: number;
  description: string | null;
  features: string | null;
  seats: number;
  transmission: 'automatic' | 'manual';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  available: number;
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

// Helper to cast libsql row to typed object
function row<T>(r: Record<string, unknown>): T {
  return r as unknown as T;
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export async function getCars(availableOnly = false): Promise<Car[]> {
  await ensureDb();
  const sql = availableOnly
    ? 'SELECT * FROM cars WHERE available = 1 ORDER BY make, model'
    : 'SELECT * FROM cars ORDER BY make, model';
  const result = await db.execute(sql);
  return result.rows.map(r => row<Car>(r as Record<string, unknown>));
}

export async function getCarById(id: number): Promise<Car | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM cars WHERE id = ?', args: [id] });
  return result.rows[0] ? row<Car>(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function getCarWithPhotos(id: number): Promise<CarWithPhotos | undefined> {
  const car = await getCarById(id);
  if (!car) return undefined;
  const photosResult = await db.execute({
    sql: 'SELECT * FROM car_photos WHERE car_id = ? ORDER BY is_primary DESC, id ASC',
    args: [id],
  });
  const photos = photosResult.rows.map(r => row<CarPhoto>(r as Record<string, unknown>));
  const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || null;
  return { ...car, photos, primaryPhoto };
}

export async function getCarsWithPrimaryPhoto(availableOnly = false): Promise<CarWithPhotos[]> {
  await ensureDb();
  const cars = await getCars(availableOnly);
  return Promise.all(
    cars.map(async car => {
      const photosResult = await db.execute({
        sql: 'SELECT * FROM car_photos WHERE car_id = ? ORDER BY is_primary DESC, id ASC',
        args: [car.id],
      });
      const photos = photosResult.rows.map(r => row<CarPhoto>(r as Record<string, unknown>));
      const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || null;
      return { ...car, photos, primaryPhoto };
    })
  );
}

export async function createCar(data: Omit<Car, 'id' | 'created_at' | 'updated_at'>): Promise<Car> {
  await ensureDb();
  const result = await db.execute({
    sql: `INSERT INTO cars (make, model, year, category, daily_rate, description, features, seats, transmission, fuel_type, available)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.make, data.model, data.year, data.category, data.daily_rate, data.description ?? null,
           data.features ?? null, data.seats, data.transmission, data.fuel_type, data.available],
  });
  return (await getCarById(Number(result.lastInsertRowid)))!;
}

export async function updateCar(id: number, data: Partial<Omit<Car, 'id' | 'created_at' | 'updated_at'>>): Promise<Car | undefined> {
  const keys = Object.keys(data);
  if (!keys.length) return getCarById(id);
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as Record<string, unknown>)[k]);
  await db.execute({
    sql: `UPDATE cars SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
    args: [...values, id],
  });
  return getCarById(id);
}

export async function deleteCar(id: number): Promise<void> {
  await db.execute({ sql: 'DELETE FROM cars WHERE id = ?', args: [id] });
}

// ─── Car Photos ───────────────────────────────────────────────────────────────

export async function addCarPhoto(carId: number, url: string, fileKey: string, isPrimary = false): Promise<CarPhoto> {
  if (isPrimary) {
    await db.execute({ sql: 'UPDATE car_photos SET is_primary = 0 WHERE car_id = ?', args: [carId] });
  }
  const result = await db.execute({
    sql: 'INSERT INTO car_photos (car_id, url, file_key, is_primary) VALUES (?, ?, ?, ?)',
    args: [carId, url, fileKey, isPrimary ? 1 : 0],
  });
  const photoResult = await db.execute({
    sql: 'SELECT * FROM car_photos WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });
  return row<CarPhoto>(photoResult.rows[0] as Record<string, unknown>);
}

export async function deleteCarPhoto(id: number): Promise<void> {
  await db.execute({ sql: 'DELETE FROM car_photos WHERE id = ?', args: [id] });
}

export async function setPrimaryPhoto(carId: number, photoId: number): Promise<void> {
  await db.execute({ sql: 'UPDATE car_photos SET is_primary = 0 WHERE car_id = ?', args: [carId] });
  await db.execute({ sql: 'UPDATE car_photos SET is_primary = 1 WHERE id = ? AND car_id = ?', args: [photoId, carId] });
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function getReservations(): Promise<ReservationWithCar[]> {
  await ensureDb();
  const result = await db.execute(`
    SELECT r.*, c.make as car_make, c.model as car_model, c.year as car_year
    FROM reservations r
    JOIN cars c ON r.car_id = c.id
    ORDER BY r.created_at DESC
  `);
  return result.rows.map(r => row<ReservationWithCar>(r as Record<string, unknown>));
}

export async function getReservationById(id: number): Promise<ReservationWithCar | undefined> {
  const result = await db.execute({
    sql: `SELECT r.*, c.make as car_make, c.model as car_model, c.year as car_year
          FROM reservations r
          JOIN cars c ON r.car_id = c.id
          WHERE r.id = ?`,
    args: [id],
  });
  return result.rows[0] ? row<ReservationWithCar>(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createReservation(data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Promise<Reservation> {
  const result = await db.execute({
    sql: `INSERT INTO reservations (car_id, customer_name, customer_email, customer_phone, start_date, end_date, total_amount, deposit_amount, status, stripe_payment_intent_id, stripe_session_id, payment_status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.car_id, data.customer_name, data.customer_email, data.customer_phone ?? null,
      data.start_date, data.end_date, data.total_amount, data.deposit_amount ?? null,
      data.status, data.stripe_payment_intent_id ?? null, data.stripe_session_id ?? null,
      data.payment_status, data.notes ?? null,
    ],
  });
  const res = await db.execute({ sql: 'SELECT * FROM reservations WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return row<Reservation>(res.rows[0] as Record<string, unknown>);
}

export async function updateReservation(id: number, data: Partial<Omit<Reservation, 'id' | 'created_at'>>): Promise<Reservation | undefined> {
  const keys = Object.keys(data);
  if (!keys.length) {
    const res = await db.execute({ sql: 'SELECT * FROM reservations WHERE id = ?', args: [id] });
    return res.rows[0] ? row<Reservation>(res.rows[0] as Record<string, unknown>) : undefined;
  }
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as Record<string, unknown>)[k]);
  await db.execute({
    sql: `UPDATE reservations SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
    args: [...values, id],
  });
  const res = await db.execute({ sql: 'SELECT * FROM reservations WHERE id = ?', args: [id] });
  return res.rows[0] ? row<Reservation>(res.rows[0] as Record<string, unknown>) : undefined;
}

export async function checkCarAvailability(carId: number, startDate: string, endDate: string, excludeReservationId?: number): Promise<boolean> {
  const sql = excludeReservationId
    ? `SELECT COUNT(*) as count FROM reservations WHERE car_id = ? AND status NOT IN ('cancelled','completed') AND id != ? AND NOT (end_date <= ? OR start_date >= ?)`
    : `SELECT COUNT(*) as count FROM reservations WHERE car_id = ? AND status NOT IN ('cancelled','completed') AND NOT (end_date <= ? OR start_date >= ?)`;
  const args = excludeReservationId
    ? [carId, excludeReservationId, startDate, endDate]
    : [carId, startDate, endDate];
  const result = await db.execute({ sql, args });
  return Number((result.rows[0] as Record<string, unknown>)['count']) === 0;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  await ensureDb();
  const [totalCarsRes, availableCarsRes, totalResRes, activeResRes, revenueRes, recentRes] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM cars'),
    db.execute('SELECT COUNT(*) as c FROM cars WHERE available = 1'),
    db.execute('SELECT COUNT(*) as c FROM reservations'),
    db.execute("SELECT COUNT(*) as c FROM reservations WHERE status IN ('pending','confirmed','active')"),
    db.execute("SELECT COALESCE(SUM(total_amount), 0) as r FROM reservations WHERE status NOT IN ('cancelled')"),
    db.execute(`SELECT r.*, c.make as car_make, c.model as car_model FROM reservations r JOIN cars c ON r.car_id = c.id ORDER BY r.created_at DESC LIMIT 5`),
  ]);
  return {
    totalCars: Number((totalCarsRes.rows[0] as Record<string, unknown>)['c']),
    availableCars: Number((availableCarsRes.rows[0] as Record<string, unknown>)['c']),
    totalReservations: Number((totalResRes.rows[0] as Record<string, unknown>)['c']),
    activeReservations: Number((activeResRes.rows[0] as Record<string, unknown>)['c']),
    revenue: Number((revenueRes.rows[0] as Record<string, unknown>)['r']),
    recentReservations: recentRes.rows,
  };
}
