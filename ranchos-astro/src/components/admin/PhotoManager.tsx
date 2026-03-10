import { useState, useRef } from 'react';

interface Photo {
  id: number;
  url: string;
  file_key: string;
  is_primary: number;
}

interface Props {
  carId: number;
  carName: string;
  initialPhotos: Photo[];
}

export default function PhotoManager({ carId, carName, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    let uploaded = 0;
    const newPhotos: Photo[] = [];

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('carId', String(carId));
        formData.append('photo', file);
        formData.append('isPrimary', String(photos.length === 0 && newPhotos.length === 0));

        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const photo = await res.json();
        newPhotos.push(photo);
        uploaded++;
        setUploadProgress(Math.round((uploaded / fileArray.length) * 100));
      } catch (err: any) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const res = await fetch('/api/photos/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, fileKey: photo.file_key }),
      });

      if (!res.ok) throw new Error('Failed to delete photo');
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetPrimary = async (photo: Photo) => {
    try {
      const res = await fetch(`/api/photos/set-primary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, photoId: photo.id }),
      });

      if (!res.ok) throw new Error('Failed to set primary photo');
      setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === photo.id ? 1 : 0 })));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragOver ? 'border-ocean bg-ocean/5' : 'border-sand-dark hover:border-ocean hover:bg-sand/30'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        {uploading ? (
          <div>
            <div className="w-16 h-16 bg-ocean/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-ocean animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="font-semibold text-ocean-dark">Uploading... {uploadProgress}%</p>
            <div className="w-48 h-2 bg-sand rounded-full mx-auto mt-3">
              <div className="h-2 bg-ocean rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 bg-sand rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sand-dark" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="font-semibold text-ocean-dark mb-1">Drop photos here or click to upload</p>
            <p className="text-gray-beach text-sm">JPEG, PNG, WebP · Max 5MB per file · Multiple files supported</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div>
          <h3 className="font-semibold text-ocean-dark mb-4">{photos.length} Photo{photos.length !== 1 ? 's' : ''}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-sand aspect-video">
                <img src={photo.url} alt="Car photo" className="w-full h-full object-cover"/>

                {/* Primary Badge */}
                {photo.is_primary === 1 && (
                  <div className="absolute top-2 left-2 bg-ocean text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ★ Primary
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {photo.is_primary !== 1 && (
                    <button
                      onClick={() => handleSetPrimary(photo)}
                      className="bg-ocean text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-ocean-dark transition-colors"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo)}
                    className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-beach">
          <p>No photos yet. Upload some above.</p>
        </div>
      )}

      {/* Done Button */}
      <div className="flex gap-4 pt-4 border-t border-sand">
        <a href="/admin/cars" className="btn-primary flex-1 justify-center py-3.5">
          ✓ Done — Back to Fleet
        </a>
        <a href={`/cars/${carId}`} target="_blank" className="btn-secondary px-6 py-3.5">
          Preview ↗
        </a>
      </div>
    </div>
  );
}
