'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { upload } from '@vercel/blob/client';
import { MAHARASHTRA_DISTRICTS } from '../lib/districts';

const RealMap = dynamic(() => import('../components/RealMap'), {
  ssr: false,
  loading: () => <div className="loading-hint">Loading map…</div>
});

// Uploads files straight from the browser to Vercel Blob (bypasses the
// 4.5MB Vercel Function body limit that phone photos routinely exceed).
async function uploadPhotosToBlob(files, folder) {
  const safeFolder = (folder || 'general').replace(/[^a-z0-9-_ ]/gi, '-');
  const results = await Promise.all(
    Array.from(files).map(async (file) => {
      const key = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name || 'photo'}`;
      const blob = await upload(key, file, {
        access: 'public',
        handleUploadUrl: '/api/upload'
      });
      return {
        id: 'photo_' + Math.random().toString(36).slice(2, 10),
        url: blob.url,
        name: file.name || 'photo',
        createdAt: new Date().toISOString()
      };
    })
  );
  return results;
}

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'visited', label: 'Visited' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'planner', label: 'Planner' }
];

export default function Home() {
  const [view, setView] = useState('overview');
  const [entries, setEntries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyNameState] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [visitedFilter, setVisitedFilter] = useState('all');
  const [wishlistFilter, setWishlistFilter] = useState('all');
  const [entryModal, setEntryModal] = useState(null); // 'visited' | 'wishlist' | null
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [openAlbum, setOpenAlbum] = useState(null); // entry id

  useEffect(() => {
    const n = localStorage.getItem('ft-my-name');
    if (n) setMyNameState(n);
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [er, tr, ca] = await Promise.all([
        fetch('/api/entries').then((r) => r.json()),
        fetch('/api/trips').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json())
      ]);
      setEntries(er.entries || []);
      setTrips(tr.trips || []);
      setCategories(ca.categories || []);
    } catch (e) {
      showToast('Could not reach the server — check your connection.');
    }
    setLoading(false);
  }

  async function addCategory(name) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.categories) setCategories(data.categories);
    return data;
  }

  function showToast(msg, duration = 6000) {
    console.log('[Fort Trails]', msg);
    setToastMsg(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToastMsg(''), duration);
  }

  function saveMyName() {
    const name = prompt('Your name (shown on things you add):');
    if (name && name.trim()) {
      localStorage.setItem('ft-my-name', name.trim());
      setMyNameState(name.trim());
      showToast('Saved — welcome, ' + name.trim());
    }
  }

  async function upvote(id) {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote' })
    });
    const data = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? data.entry : e)));
  }

  async function deleteEntry(id) {
    if (!confirm('Remove this entry for everyone?')) return;
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function addPhotosToEntry(id, photos) {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addPhotos', photos })
    });
    const data = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? data.entry : e)));
  }

  async function removePhoto(entryId, photoId) {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'removePhoto', photoId })
    });
    const data = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === entryId ? data.entry : e)));
  }

  async function deleteTrip(id) {
    if (!confirm('Delete this trip plan?')) return;
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  const visited = entries.filter((e) => e.status === 'visited');
  const wishlist = entries.filter((e) => e.status === 'wishlist');
  const regions = [...new Set(entries.map((e) => e.region).filter(Boolean))];
  const regionOptions = [...new Set([...MAHARASHTRA_DISTRICTS, ...categories])].sort((a, b) => a.localeCompare(b));
  const avgRating = visited.length
    ? (visited.reduce((s, e) => s + (e.rating || 0), 0) / visited.length).toFixed(1)
    : '—';

  const albumEntry = openAlbum ? entries.find((e) => e.id === openAlbum) : null;

  return (
    <div id="app">
      <nav className="rail">
        <div className="brand">
          <h1>Fort Trails</h1>
          <div className="sub">Sahyadri &amp; beyond, logged</div>
        </div>
        {NAV.map((n) => (
          <div
            key={n.id}
            className={'nav-item' + (view === n.id ? ' active' : '')}
            onClick={() => setView(n.id)}
          >
            {n.label}
          </div>
        ))}
        <div className="rail-foot">
          <button className="who" onClick={saveMyName}>
            <span className="dot">{myName ? myName[0].toUpperCase() : '?'}</span>
            <span>{myName || 'Set your name'}</span>
          </button>
          <div style={{ color: 'var(--stone-dark)', marginBottom: 8 }}>Shared with your crew</div>
          <button
            className="who"
            style={{ fontSize: 11.5, color: 'var(--stone-dark)' }}
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      <main>
        {loading ? (
          <div className="loading-hint">Loading the crew&rsquo;s trail log…</div>
        ) : (
          <>
            {view === 'overview' && (
              <OverviewView
                entries={entries}
                trips={trips}
                avgRating={avgRating}
                onLog={() => setEntryModal('visited')}
                onFocusEntry={(e) => setView(e.status === 'visited' ? 'visited' : 'wishlist')}
                onOpenAlbum={(id) => setOpenAlbum(id)}
              />
            )}

            {view === 'visited' && (
              <ListView
                title="Visited"
                desc="Every fort and place the crew has already ticked off."
                items={visited}
                filter={visitedFilter}
                setFilter={setVisitedFilter}
                regions={regions}
                onAdd={() => setEntryModal('visited')}
                addLabel="+ Log a visit"
                renderExtra={(e) => <div className="stars">{'★'.repeat(e.rating || 0)}{'☆'.repeat(5 - (e.rating || 0))}</div>}
                onDelete={deleteEntry}
              />
            )}

            {view === 'wishlist' && (
              <ListView
                title="Wishlist"
                desc="Where to go next — vote to help decide."
                items={[...wishlist].sort((a, b) => (b.votes || 0) - (a.votes || 0))}
                filter={wishlistFilter}
                setFilter={setWishlistFilter}
                regions={regions}
                onAdd={() => setEntryModal('wishlist')}
                addLabel="+ Add place"
                renderExtra={(e) => (
                  <button className="vote-btn" onClick={() => upvote(e.id)}>
                    ▲ {e.votes || 0} votes
                  </button>
                )}
                onDelete={deleteEntry}
              />
            )}

            {view === 'gallery' && (
              <GalleryView
                entries={entries}
                onOpenAlbum={(id) => setOpenAlbum(id)}
              />
            )}

            {view === 'planner' && (
              <PlannerView
                trips={trips}
                setTrips={setTrips}
                onNewTrip={() => setTripModalOpen(true)}
                onDeleteTrip={deleteTrip}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {entryModal && (
        <EntryModal
          mode={entryModal}
          myName={myName}
          regionOptions={regionOptions}
          onAddCategory={addCategory}
          onClose={() => setEntryModal(null)}
          onSaved={(entry) => {
            setEntries((prev) => [...prev, entry]);
            setEntryModal(null);
            showToast(entry.status === 'visited' ? 'Visit logged' : 'Added to wishlist');
          }}
          showToast={showToast}
        />
      )}

      {tripModalOpen && (
        <TripModal
          onClose={() => setTripModalOpen(false)}
          onSaved={(trip) => {
            setTrips((prev) => [...prev, trip]);
            setTripModalOpen(false);
            showToast('Trip plan created');
          }}
        />
      )}

      {albumEntry && (
        <AlbumModal
          entry={albumEntry}
          myName={myName}
          onClose={() => setOpenAlbum(null)}
          onAddPhotos={(photos) => addPhotosToEntry(albumEntry.id, photos)}
          onRemovePhoto={(photoId) => removePhoto(albumEntry.id, photoId)}
          showToast={showToast}
        />
      )}

      <div className={'toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewView({ entries, trips, avgRating, onLog, onFocusEntry, onOpenAlbum }) {
  const visited = entries.filter((e) => e.status === 'visited');
  const wishlist = entries.filter((e) => e.status === 'wishlist');
  const recent = [...entries].slice(-6).reverse();
  const recentPhotos = getRecentPhotos(entries, 8);
  const upcomingTrip = [...trips]
    .filter((t) => t.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((t) => t.date >= new Date().toISOString().slice(0, 10));

  return (
    <div>
      <div className="view-head">
        <div>
          <h2>Overview</h2>
          <div className="desc">Everything the crew has logged, at a glance.</div>
        </div>
        <button className="btn rust" onClick={onLog}>+ Log a visit</button>
      </div>

      <div className="stat-strip">
        <div className="stat"><div className="num">{visited.length}</div><div className="lbl">Forts &amp; places visited</div></div>
        <div className="stat"><div className="num">{wishlist.length}</div><div className="lbl">On the wishlist</div></div>
        <div className="stat"><div className="num">{trips.length}</div><div className="lbl">Trips planned</div></div>
        <div className="stat"><div className="num">{avgRating}</div><div className="lbl">Average crew rating</div></div>
      </div>

      {upcomingTrip && (
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            marginBottom: 28,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
              Next planned trip
            </div>
            <div style={{ fontFamily: "'Zilla Slab', serif", fontSize: 19, fontWeight: 600 }}>{upcomingTrip.name}</div>
          </div>
          <div className="date-badge" style={{ borderColor: 'var(--rust)', color: 'var(--rust)' }}>
            {formatDate(upcomingTrip.date)}
          </div>
        </div>
      )}

      <div className="map-wrap">
        <RealMap entries={entries} onFocusEntry={onFocusEntry} />
        <div className="map-legend">
          <span><i className="dot-lg" style={{ background: '#A8471F' }}></i> Visited</span>
          <span><i className="dot-lg" style={{ background: '#55613F' }}></i> Wishlist</span>
        </div>
      </div>

      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Recent albums</h3>
      {recentPhotos.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 32 }}>
          <h4>No photos yet</h4>
          <div>Upload photos while logging a visit and they&rsquo;ll show up here.</div>
        </div>
      ) : (
        <div className="lightbox-grid" style={{ marginBottom: 32 }}>
          {recentPhotos.map((p) => (
            <div className="ph" key={p.id} onClick={() => onOpenAlbum(p.entryId)} style={{ cursor: 'pointer' }}>
              <img src={p.url} alt={p.entryName} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(34,35,31,0.8))',
                  color: 'var(--paper)',
                  fontSize: 11.5,
                  padding: '18px 8px 6px 8px'
                }}
              >
                {p.entryName}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Recently logged</h3>
      <div className="grid">
        {recent.length === 0 ? (
          <EmptyState title="No trips logged yet" sub="Log your first fort visit to see it here." />
        ) : (
          recent.map((e) => <Card key={e.id} e={e} />)
        )}
      </div>
    </div>
  );
}

function getRecentPhotos(entries, limit) {
  const all = [];
  entries.forEach((e) => {
    (e.photos || []).forEach((p) => {
      all.push({ ...p, entryId: e.id, entryName: e.name });
    });
  });
  all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return all.slice(0, limit);
}

/* ---------------- List view (Visited / Wishlist) ---------------- */
function ListView({ title, desc, items, filter, setFilter, regions, onAdd, addLabel, renderExtra, onDelete }) {
  const filtered = filter === 'all' ? items : items.filter((e) => e.region === filter);
  return (
    <div>
      <div className="view-head">
        <div>
          <h2>{title}</h2>
          <div className="desc">{desc}</div>
        </div>
        <button className="btn rust" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="filter-row">
        <div className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All regions</div>
        {regions.map((r) => (
          <div key={r} className={'chip' + (filter === r ? ' active' : '')} onClick={() => setFilter(r)}>{r}</div>
        ))}
      </div>
      <div className="grid">
        {filtered.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} yet`} sub="Once you add one, it shows up here." />
        ) : (
          filtered.map((e) => <Card key={e.id} e={e} renderExtra={renderExtra} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}

function Card({ e, renderExtra, onDelete }) {
  const cover = e.photos && e.photos.length ? e.photos[0].url : null;
  return (
    <div className="card">
      <div className={'thumb' + (cover ? '' : ' empty')} style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
        <div className={'badge' + (e.status === 'wishlist' ? ' wishlist' : '')}>
          {e.status === 'wishlist' ? 'Wishlist' : 'Visited'}
        </div>
        {e.photos && e.photos.length > 1 && <div className="photo-count">{e.photos.length} photos</div>}
      </div>
      <div className="card-body">
        <h3>{e.name}</h3>
        <div className="card-meta">
          <span>📍 {e.region || 'Unknown region'}</span>
          {e.status === 'visited' && e.date && <span>📅 {formatDate(e.date)}</span>}
          {e.status === 'visited' && e.companions && <span>👥 {e.companions}</span>}
          {e.status === 'wishlist' && <span>⛰️ {e.difficulty}</span>}
        </div>
        {e.notes && <div className="card-notes">{e.notes}</div>}
        <div className="card-foot">
          {renderExtra ? renderExtra(e) : <span />}
          {onDelete && (
            <button className="icon-btn" onClick={() => onDelete(e.id)} title="Remove">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, sub }) {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <div>{sub}</div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------- Gallery (albums per place) ---------------- */
function GalleryView({ entries, onOpenAlbum }) {
  const withPhotos = entries.filter((e) => e.photos && e.photos.length > 0);
  return (
    <div>
      <div className="view-head">
        <div>
          <h2>Gallery</h2>
          <div className="desc">Every place gets its own album — like a folder per fort. Open one to browse or add more photos.</div>
        </div>
      </div>
      {withPhotos.length === 0 ? (
        <EmptyState title="No albums yet" sub="Upload photos while logging a visit, or open a place later to add some." />
      ) : (
        <div className="album-grid">
          {withPhotos.map((e) => (
            <div className="album-card" key={e.id} onClick={() => onOpenAlbum(e.id)}>
              <div className="album-stack">
                {e.photos[1] && <img className="stack-2" src={e.photos[1].url} alt="" />}
                <img className="stack-1" src={e.photos[0].url} alt={e.name} />
              </div>
              <div className="album-info">
                <h4>{e.name}</h4>
                <div className="count">{e.photos.length} photo{e.photos.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumModal({ entry, myName, onClose, onAddPhotos, onRemovePhoto, showToast }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const photos = await uploadPhotosToBlob(files, entry.name);
      onAddPhotos(photos);
      showToast('Photos added to the album');
    } catch (e) {
      console.error('[Fort Trails] photo upload failed:', e);
      showToast(e.message || 'Upload failed — check your connection');
    }
    setUploading(false);
  }

  return (
    <div className="overlay" onClick={(e) => e.target.classList.contains('overlay') && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <h3>{entry.name}</h3>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
          {entry.region} {entry.date ? '· ' + formatDate(entry.date) : ''}
        </div>

        <div
          className="dropzone"
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          {uploading ? 'Uploading…' : 'Click or drag photos here to add them to this album'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="lightbox-grid" style={{ marginTop: 16 }}>
          {(entry.photos || []).map((p) => (
            <div className="ph" key={p.id}>
              <img src={p.url} alt="" />
              <button className="rm" onClick={() => onRemovePhoto(p.id)} title="Remove photo">✕</button>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Planner ---------------- */
function PlannerView({ trips, setTrips, onNewTrip, onDeleteTrip, showToast }) {
  return (
    <div>
      <div className="view-head">
        <div>
          <h2>Planner</h2>
          <div className="desc">Build the agenda for the next trip — itinerary, checklist, notes.</div>
        </div>
        <button className="btn rust" onClick={onNewTrip}>+ New trip plan</button>
      </div>

      {trips.length === 0 ? (
        <EmptyState title="No trips planned yet" sub="Create a trip plan to start building an itinerary and checklist." />
      ) : (
        [...trips].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((t) => (
          <TripCard key={t.id} trip={t} setTrips={setTrips} onDelete={() => onDeleteTrip(t.id)} showToast={showToast} />
        ))
      )}
    </div>
  );
}

function TripCard({ trip, setTrips, onDelete, showToast }) {
  const [time, setTime] = useState('');
  const [itinText, setItinText] = useState('');
  const [checkText, setCheckText] = useState('');

  async function patchTrip(body) {
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? data.trip : t)));
  }

  async function addItin() {
    if (!itinText.trim()) return;
    await patchTrip({ action: 'addItinerary', time: time || '—', text: itinText.trim() });
    setTime('');
    setItinText('');
  }

  async function addCheck() {
    if (!checkText.trim()) return;
    await patchTrip({ action: 'addChecklist', text: checkText.trim() });
    setCheckText('');
  }

  async function toggleCheck(idx) {
    await patchTrip({ action: 'toggleChecklist', index: idx });
  }

  return (
    <div className="trip-card">
      <div className="trip-head">
        <div>
          <h3>{trip.name}</h3>
          {trip.notes && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, maxWidth: 480 }}>{trip.notes}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {trip.date && <div className="date-badge">{formatDate(trip.date)}</div>}
          <button className="icon-btn" onClick={onDelete} title="Delete trip">✕</button>
        </div>
      </div>
      <div className="trip-cols">
        <div className="trip-section">
          <h4>Itinerary</h4>
          {trip.itinerary.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>No stops yet.</div>}
          {trip.itinerary.map((i, idx) => (
            <div className="itin-row" key={idx}>
              <div className="time">{i.time}</div>
              <div>{i.text}</div>
            </div>
          ))}
          <div className="add-line-form">
            <input className="time-input" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
            <input placeholder="What's happening" value={itinText} onChange={(e) => setItinText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItin()} />
            <button className="btn small ghost" onClick={addItin}>Add</button>
          </div>
        </div>
        <div className="trip-section">
          <h4>Checklist</h4>
          {trip.checklist.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>No items yet.</div>}
          {trip.checklist.map((c, idx) => (
            <div className={'check-row' + (c.done ? ' done' : '')} key={idx}>
              <input type="checkbox" checked={c.done} onChange={() => toggleCheck(idx)} />
              <span>{c.text}</span>
            </div>
          ))}
          <div className="add-line-form">
            <input placeholder="Add checklist item" value={checkText} onChange={(e) => setCheckText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCheck()} />
            <button className="btn small ghost" onClick={addCheck}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Trip modal ---------------- */
function TripModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, notes })
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned an unexpected response (status ${res.status})`);
      }
      if (!res.ok || data.error) {
        throw new Error(data.error || `Save failed (status ${res.status})`);
      }
      if (data.trip) onSaved(data.trip);
    } catch (e) {
      alert(e.message || 'Something went wrong — please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target.classList.contains('overlay') && onClose()}>
      <div className="modal">
        <h3>New trip plan</h3>
        <div className="field">
          <label>Trip name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monsoon trek — Rajgad" />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting point, transport, contacts..." />
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn rust" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create plan'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Entry modal (with photo upload) ---------------- */
function EntryModal({ mode, myName, regionOptions, onAddCategory, onClose, onSaved, showToast }) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [date, setDate] = useState('');
  const [companions, setCompanions] = useState('');
  const [rating, setRating] = useState('3');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  function handleRegionChange(e) {
    const val = e.target.value;
    if (val === '__new__') {
      const custom = prompt('New region / district name:');
      if (custom && custom.trim()) {
        onAddCategory(custom.trim());
        setRegion(custom.trim());
      }
      return;
    }
    setRegion(val);
  }

  async function autoLocate() {
    if (!name.trim()) {
      showToast('Enter the name first, then auto-locate');
      return;
    }
    setLocating(true);
    try {
      const q = `${name.trim()}${region ? ', ' + region : ''}, Maharashtra, India`;
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        setLat(String(data.lat));
        setLng(String(data.lng));
        showToast('Location found');
      }
    } catch (e) {
      showToast('Lookup failed — try again');
    }
    setLocating(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        showToast('Using your current location');
      },
      () => {
        setLocating(false);
        showToast('Could not get your location');
      }
    );
  }

  function handleFiles(fileList) {
    const arr = Array.from(fileList || []);
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  async function save() {
    if (!name.trim()) {
      showToast('Give it a name first');
      return;
    }
    setSaving(true);

    try {
      let photos = [];
      if (files.length) {
        try {
          photos = await uploadPhotosToBlob(files, name.trim());
        } catch (e) {
          console.error('[Fort Trails] photo upload failed:', e);
          showToast((e.message || 'Photo upload failed') + ' — saving without photos');
        }
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: mode,
          name,
          region,
          difficulty,
          date: mode === 'visited' ? date : '',
          companions: mode === 'visited' ? companions : '',
          rating: mode === 'visited' ? rating : 0,
          notes,
          addedBy: myName || 'Someone',
          photos,
          lat: lat.trim() ? parseFloat(lat) : null,
          lng: lng.trim() ? parseFloat(lng) : null
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned an unexpected response (status ${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Save failed (status ${res.status})`);
      }

      if (data.entry) onSaved(data.entry);
    } catch (e) {
      showToast(e.message || 'Something went wrong — please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target.classList.contains('overlay') && onClose()}>
      <div className="modal">
        <h3>{mode === 'visited' ? 'Log a visit' : 'Add to wishlist'}</h3>

        <div className="field">
          <label>Name of fort / place</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rajgad Fort" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Region</label>
            <select value={region} onChange={handleRegionChange}>
              <option value="">Select a district…</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="__new__">+ Add new category…</option>
            </select>
          </div>
          <div className="field">
            <label>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>Easy</option>
              <option>Moderate</option>
              <option>Hard</option>
              <option>Technical</option>
            </select>
          </div>
        </div>

        {mode === 'visited' && (
          <div className="field-row">
            <div className="field">
              <label>Date visited</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Went with</label>
              <input value={companions} onChange={(e) => setCompanions(e.target.value)} placeholder="e.g. Aditya, Sneha" />
            </div>
          </div>
        )}

        {mode === 'visited' && (
          <div className="field">
            <label>Your rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">★★★★★</option>
              <option value="4">★★★★☆</option>
              <option value="3">★★★☆☆</option>
              <option value="2">★★☆☆☆</option>
              <option value="1">★☆☆☆☆</option>
            </select>
          </div>
        )}

        <div className="field">
          <label>Coordinates (optional — plots this on the real map)</label>
          <div className="field-row">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude, e.g. 18.2551"
              inputMode="decimal"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude, e.g. 73.6753"
              inputMode="decimal"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn small ghost" onClick={autoLocate} disabled={locating}>
              {locating ? 'Looking…' : '🔍 Auto-locate from name'}
            </button>
            <button type="button" className="btn small ghost" onClick={useMyLocation} disabled={locating}>
              📍 Use my current location
            </button>
          </div>
        </div>

        <div className="field">
          <label>Photos</label>
          <div
            className="dropzone"
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            Click or drag photos here — this becomes the album for this place
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {previews.length > 0 && (
            <div className="preview-row">
              {previews.map((src, i) => (
                <img key={i} src={src} className="preview-thumb" alt="" />
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Trail notes, tips, the story..." />
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn rust" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
