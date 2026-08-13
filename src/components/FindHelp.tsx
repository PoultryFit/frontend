import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listVetsFn, type VetRow } from "@/lib/vets.functions";
import { haversineKm } from "@/lib/poultry-calc";
import { Phone, MapPin, Stethoscope, Store, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VetContact = VetRow;

// Fix default marker icons for Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const NAIROBI = { lat: -1.286389, lng: 36.817223 };

type Listed = VetContact & { distance: number };

// react-leaflet's MapContainer `center` prop only sets the *initial* view.
// Without this, a GPS fix that resolves after first paint never actually
// moves the map, "you are here" would sit off-screen at the Nairobi default.
function Recenter({ me }: { me: { lat: number; lng: number } | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (me && !done.current) {
      done.current = true;
      map.flyTo([me.lat, me.lng], 14, { duration: 1.1 });
    }
  }, [me, map]);
  return null;
}

// Opens its own popup the moment it mounts so "you are here" is the first
// thing the farmer sees on the map, before they start looking for vets.
function YouAreHereMarker({ me }: { me: { lat: number; lng: number } }) {
  const ref = useRef<L.CircleMarker>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.openPopup(), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <CircleMarker
      ref={ref}
      center={[me.lat, me.lng]}
      radius={8}
      pathOptions={{ color: "#2e7d55", fillOpacity: 0.6 }}
    >
      <Popup>You are here</Popup>
    </CircleMarker>
  );
}

export function FindHelpModule({ county }: { county: string }) {
  const [filter, setFilter] = useState<"all" | "vet" | "agrovet">("all");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  const fetchVets = useServerFn(listVetsFn);
  const { data: vets = [], isLoading } = useQuery({
    queryKey: ["vets", me ? `${me.lat.toFixed(3)},${me.lng.toFixed(3)}` : "all"],
    queryFn: () => fetchVets({ data: me ? { lat: me.lat, lng: me.lng } : {} }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 4000 },
    );
  }, []);

  const origin = me ?? NAIROBI;

  const list = useMemo<Listed[]>(() => {
    return vets
      .filter((v) => filter === "all" || v.kind === filter)
      .map((v) => ({ ...v, distance: v.distanceKm ?? haversineKm(origin, v) }))
      .sort((a, b) => {
        const aSame = a.county === county ? 0 : 1;
        const bSame = b.county === county ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return a.distance - b.distance;
      });
  }, [vets, filter, origin, county]);

  const vetsList = list.filter((v) => v.kind === "vet");
  const agrovetsList = list.filter((v) => v.kind === "agrovet");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-[480px] w-full [&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content-wrapper]:border [&_.leaflet-popup-content-wrapper]:border-border [&_.leaflet-popup-content-wrapper]:bg-card [&_.leaflet-popup-content-wrapper]:text-foreground [&_.leaflet-popup-content-wrapper]:shadow-lg [&_.leaflet-popup-tip]:bg-card [&_.leaflet-popup-content]:m-0 [&_.leaflet-popup-close-button]:text-muted-foreground">
          <MapContainer center={[origin.lat, origin.lng]} zoom={11} scrollWheelZoom={false}>
            <Recenter me={me} />
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satellite">
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <TileLayer
              attribution="Labels &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              pane="overlayPane"
            />
            {me && <YouAreHereMarker me={me} />}
            {list.map((v) => (
              <Marker key={v.id} position={[v.lat, v.lng]}>
                <Popup>
                  <div className="min-w-[200px] p-3">
                    <div className="flex items-start gap-2.5">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        v.kind === "vet" ? "bg-primary/10 text-primary" : "bg-clay/10 text-clay")}>
                        {v.kind === "vet" ? <Stethoscope className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm leading-tight">{v.name}</p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                          {v.kind === "vet" ? "Veterinary" : "Agrovet"} · {v.county}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { window.location.href = `tel:${v.phone.replace(/\s/g, "")}`; }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {v.phone}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 rounded-xl border border-border bg-card p-1">
          {(["all", "vet", "agrovet"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm capitalize transition",
                filter === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {k === "all" ? "All" : k === "vet" ? "Vets" : "Agrovets"}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] space-y-4 overflow-auto pr-1">
          {filter !== "agrovet" && vetsList.length > 0 && (
            <ResultGroup
              title="Veterinary clinics"
              count={vetsList.length}
              icon={<Stethoscope className="h-3.5 w-3.5" />}
              accent="primary"
              items={vetsList}
              county={county}
            />
          )}
          {filter !== "vet" && agrovetsList.length > 0 && (
            <ResultGroup
              title="Agrovets"
              count={agrovetsList.length}
              icon={<Store className="h-3.5 w-3.5" />}
              accent="clay"
              items={agrovetsList}
              county={county}
            />
          )}
          {isLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading nearby vets…
            </div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  title, count, icon, accent, items, county,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  accent: "primary" | "clay";
  items: Listed[];
  county: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
          accent === "primary" ? "bg-primary/10 text-primary" : "bg-clay/10 text-clay",
        )}>
          {icon} {title}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">
        {items.map((v) => (
          <ResultCard key={v.id} v={v} accent={accent} isLocal={v.county === county} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ v, accent, isLocal }: { v: Listed; accent: "primary" | "clay"; isLocal: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-4 transition hover:shadow-sm",
      accent === "primary" ? "border-border hover:border-primary/40" : "border-border hover:border-clay/40",
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          accent === "primary" ? "bg-primary/10 text-primary" : "bg-clay/10 text-clay")}>
          {v.kind === "vet" ? <Stethoscope className="h-4 w-4" /> : <Store className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">{v.name}</p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isLocal && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Local
                </span>
              )}
              {v.source === "google" && (
                <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Via Google Maps
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {v.county} · {v.distance.toFixed(1)} km
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = `tel:${v.phone.replace(/\s/g, "")}`; }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary">
            <Phone className="h-3 w-3" /> {v.phone}
          </button>
        </div>
      </div>
    </div>
  );
}