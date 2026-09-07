'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

const MAHARASHTRA_CENTER = [19.4, 75.7];

export default function RealMap({ entries, onFocusEntry }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Init map once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: MAHARASHTRA_CENTER,
        zoom: 7,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map);

      mapRef.current = map;
      // trigger a resize in case the container size settled after mount
      setTimeout(() => map.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever entries change
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      if (!mapRef.current) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const withCoords = entries.filter(
        (e) => typeof e.lat === 'number' && typeof e.lng === 'number' && e.lat !== null && e.lng !== null
      );

      const bounds = [];
      withCoords.forEach((e) => {
        const color = e.status === 'visited' ? '#A8471F' : '#55613F';
        const icon = L.divIcon({
          className: 'ft-marker',
          html: `<div style="width:15px;height:15px;border-radius:50%;background:${color};border:2px solid #EFEAE0;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
          iconSize: [15, 15],
          iconAnchor: [7, 7]
        });
        const marker = L.marker([e.lat, e.lng], { icon }).addTo(mapRef.current);
        marker.bindPopup(
          `<strong>${escapeHtml(e.name)}</strong><br/>${escapeHtml(e.region || '')}<br/><span style="font-size:11px;color:#888">${e.status === 'visited' ? 'Visited' : 'Wishlist'}</span>`
        );
        if (onFocusEntry) {
          marker.on('click', () => onFocusEntry(e));
        }
        markersRef.current.push(marker);
        bounds.push([e.lat, e.lng]);
      });

      if (bounds.length) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      } else {
        mapRef.current.setView(MAHARASHTRA_CENTER, 7);
      }
    })();
  }, [entries, onFocusEntry]);

  const anyCoords = entries.some((e) => typeof e.lat === 'number' && e.lat !== null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 3 }} />
      {!anyCoords && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 400
          }}
        >
          <div
            style={{
              background: 'rgba(34,35,31,0.85)',
              color: '#EFEAE0',
              fontSize: 12.5,
              padding: '10px 16px',
              borderRadius: 4,
              maxWidth: 260,
              textAlign: 'center'
            }}
          >
            No pins yet — add latitude/longitude when logging a visit or wishlist place to see it here.
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
