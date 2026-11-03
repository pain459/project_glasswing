"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Sun,
  Moon as MoonIcon,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Sunrise,
  Sunset,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Telescope,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface SolarData {
  sunrise: string | null;
  sunset: string | null;
  solar_noon: string | null;
  solar_culmination?: string | null;
  daylight_hours: number | null;
  civil_twilight_morning_end: string | null;
  civil_twilight_evening_start: string | null;
  nautical_twilight_morning_end: string | null;
  nautical_twilight_evening_start: string | null;
  astronomical_twilight_morning_end: string | null;
  astronomical_twilight_evening_start: string | null;
  polar_day: boolean;
  polar_night: boolean;
  golden_hour?: {
    morning: { start: string; end: string };
    evening: { start: string; end: string };
  };
  blue_hour?: {
    morning: { start: string; end: string };
    evening: { start: string; end: string };
  };
  current_position?: {
    altitude_deg: number;
    azimuth_deg: number;
    distance_au: number;
    angular_diameter_arcsec?: number;
    is_above_horizon: boolean;
  };
}

interface PlanetData {
  name: string;
  ra_hours?: number;
  dec_deg?: number;
  altitude_deg: number;
  azimuth_deg?: number;
  is_above_horizon: boolean;
  distance_au?: number;
  angular_diameter_arcsec?: number;
  rise?: string | null;
  set?: string | null;
  culmination?: string | null;
}

interface MilkyWayInfo {
  galactic_center_altitude: number;
  galactic_center_azimuth: number;
  is_visible: boolean;
  best_viewing_hour_utc: number;
  seasonal_visibility: string;
  seasonal_description: string;
  optimal_months: string[];
}

interface MeteorShower {
  name: string;
  peak_date: string;
  zhr: number;
  days_from_peak: number;
  near_peak: boolean;
}

interface FactEntry {
  fact: string;
  source: string;
}

interface SkyEvents {
  milky_way: MilkyWayInfo;
  meteor_showers: MeteorShower[];
  active_shower_count: number;
  facts: FactEntry[];
  solar_declination?: {
    solar_declination_deg: number;
    right_ascension_hours: number;
    equation_of_time_minutes: number;
    season: string;
    day_of_year: number;
  };
  sun_constellation?: string;
  moon_constellation?: string;
  moon_distance?: {
    distance_km: number;
    distance_label: string;
    angular_diameter_arcmin: number;
  };
  next_season_event?: {
    event: string;
    datetime_utc: string | null;
    days_away: number | null;
  };
  dark_twilight_classification?: Array<{
    hour_utc: number;
    classification: string;
    code: number;
  }>;
}

interface LunarData {
  moonrise: string | null;
  moonset: string | null;
  lunar_culmination?: string | null;
  phase_name: string;
  phase_fraction: number;
  illuminated_fraction: number;
  illumination_percent: number;
  phase_angle_deg?: number;
  current_position?: {
    altitude_deg: number;
    azimuth_deg?: number;
    distance_km?: number;
    is_above_horizon: boolean;
  };
  upcoming_phases?: Array<{
    phase: string;
    datetime_utc: string;
  }>;
  upcoming_nodes?: Array<{
    type: string;
    datetime_utc: string;
  }>;
}

interface DailySkyData {
  date: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  solar: SolarData;
  lunar: LunarData;
  planets: PlanetData[];
  visible_planets: PlanetData[];
  sky_events?: SkyEvents;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDaylight(hours: number | null): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toLocalISOString(d: Date): string {
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return toLocalISOString(d);
}

function getToday(): string {
  return toLocalISOString(new Date());
}

// ─── Moon Phase SVG (compact, 32px) ─────────────────────────────────

function MoonPhase({ fraction, illumination }: { fraction: number; illumination: number }) {
  const pct = Math.max(0, Math.min(100, illumination));
  const isWaxing = fraction <= 0.5;
  const baseColor = "var(--sky-moon-base)";
  const litColor = "var(--sky-moon-lit)";

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r="14" fill={baseColor} />
      {pct > 0 && (
        <>
          {pct >= 100 ? (
            <circle cx="16" cy="16" r="14" fill={litColor} />
          ) : pct <= 1 ? (
            <circle cx="16" cy="16" r="14" fill={baseColor} />
          ) : isWaxing ? (
            <>
              <path d="M16 2 A14 14 0 0 1 16 30 Z" fill={litColor} opacity={0.9} />
              <ellipse cx="16" cy="16" rx={14 * (1 - pct / 100)} ry="14" fill={baseColor} />
            </>
          ) : (
            <>
              <path d="M16 2 A14 14 0 0 0 16 30 Z" fill={litColor} opacity={0.9} />
              <ellipse cx="16" cy="16" rx={14 * ((100 - pct) / 100)} ry="14" fill={baseColor} />
            </>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Day Arc — Solar & Moon Brightness Spectrum ──────────────────────
// Renders below the solar/lunar grid as a shared block. Two horizontal bars:
// one for solar brightness across 24h, one for moon visibility. Hovering
// shows a tooltip with the exact time and sky condition.

interface ArcMarker {
  pct: number;
  label: string;
}

function minFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function pct(min: number): number {
  return (min / 1440) * 100;
}

function getSkyPhase(min: number, solar: SolarData): string {
  const sr = minFromIso(solar.sunrise);
  const ss = minFromIso(solar.sunset);
  const civilM = minFromIso(solar.civil_twilight_morning_end);
  const civilE = minFromIso(solar.civil_twilight_evening_start);
  const nautM = minFromIso(solar.nautical_twilight_morning_end);
  const nautE = minFromIso(solar.nautical_twilight_evening_start);
  const astroM = minFromIso(solar.astronomical_twilight_morning_end);
  const astroE = minFromIso(solar.astronomical_twilight_evening_start);
  if (sr != null && ss != null && min >= sr && min <= ss) return "Daylight";
  if (civilM != null && sr != null && min >= civilM && min < sr) return "Civil twilight";
  if (civilE != null && ss != null && min > ss && min <= civilE) return "Civil twilight";
  if (nautM != null && civilM != null && min >= nautM && min < civilM) return "Nautical twilight";
  if (nautE != null && civilE != null && min > civilE && min <= nautE) return "Nautical twilight";
  if (astroM != null && nautM != null && min >= astroM && min < nautM) return "Astronomical twilight";
  if (astroE != null && nautE != null && min > nautE && min <= astroE) return "Astronomical twilight";
  return "Night";
}

function ArcTooltip({
  visible,
  left,
  timeStr,
  detail,
}: {
  visible: boolean;
  left: number;
  timeStr: string;
  detail: string;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute bottom-full mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none z-10"
      style={{
        left: `${left}%`,
        transform: "translateX(-50%)",
        background: "var(--sky-card)",
        border: "1px solid var(--sky-border)",
        color: "var(--sky-text)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div className="font-semibold">{timeStr}</div>
      <div style={{ color: "var(--sky-muted)" }}>{detail}</div>
    </div>
  );
}

function SolarArc({ solar }: { solar: SolarData }) {
  const [hover, setHover] = useState<{ visible: boolean; left: number; min: number }>({
    visible: false,
    left: 0,
    min: 0,
  });

  const sr = minFromIso(solar.sunrise);
  const ss = minFromIso(solar.sunset);
  const noon = minFromIso(solar.solar_noon);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const civilM = minFromIso(solar.civil_twilight_morning_end);
  const civilE = minFromIso(solar.civil_twilight_evening_start);
  const nautM = minFromIso(solar.nautical_twilight_morning_end);
  const nautE = minFromIso(solar.nautical_twilight_evening_start);
  const astroM = minFromIso(solar.astronomical_twilight_morning_end);
  const astroE = minFromIso(solar.astronomical_twilight_evening_start);

  const stops: string[] = [];
  if (sr != null && ss != null) {
    stops.push("rgba(15,23,42,1) 0%");
    if (astroM != null) stops.push(`rgba(30,41,59,1) ${pct(astroM)}%`);
    if (nautM != null) stops.push(`rgba(51,65,85,1) ${pct(nautM)}%`);
    if (civilM != null) stops.push(`rgba(120,80,40,1) ${pct(civilM)}%`);
    stops.push(`rgba(245,158,11,1) ${pct(sr)}%`);
    if (noon != null) stops.push(`rgba(253,224,71,1) ${pct(noon)}%`);
    stops.push(`rgba(245,158,11,1) ${pct(ss)}%`);
    if (civilE != null) stops.push(`rgba(120,80,40,1) ${pct(civilE)}%`);
    if (nautE != null) stops.push(`rgba(51,65,85,1) ${pct(nautE)}%`);
    if (astroE != null) stops.push(`rgba(30,41,59,1) ${pct(astroE)}%`);
    stops.push("rgba(15,23,42,1) 100%");
  }
  const gradient = stops.length > 1 ? `linear-gradient(to right, ${stops.join(", ")})` : undefined;

  const markers: ArcMarker[] = [];
  if (sr != null) markers.push({ pct: pct(sr), label: formatTime(solar.sunrise) });
  if (noon != null) markers.push({ pct: pct(noon), label: formatTime(solar.solar_noon) });
  if (ss != null) markers.push({ pct: pct(ss), label: formatTime(solar.sunset) });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const leftPct = (x / rect.width) * 100;
    const min = Math.round((leftPct / 100) * 1440);
    setHover({ visible: true, left: leftPct, min });
  };

  const timeStr = hover.visible
    ? `${String(Math.floor(hover.min / 60)).padStart(2, "0")}:${String(hover.min % 60).padStart(2, "0")}`
    : "";
  const phaseStr = hover.visible ? getSkyPhase(hover.min, solar) : "";

  return (
    <div>
      <div className="relative">
        <div
          className="h-3 rounded-full cursor-crosshair"
          style={{ background: gradient || "var(--sky-arc-track)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover({ visible: false, left: 0, min: 0 })}
        />
        <div className="absolute top-0" style={{ left: `${pct(nowMin)}%` }}>
          <div className="w-0.5 h-3.5 rounded-full mx-auto" style={{ background: "var(--sky-arc-marker)" }} />
        </div>
        <ArcTooltip visible={hover.visible} left={hover.left} timeStr={timeStr} detail={phaseStr} />
      </div>
      <div className="relative mt-2" style={{ height: "28px" }}>
        {markers.map((m, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${m.pct}%` }}>
            <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ background: "var(--sky-accent)" }} />
            <span className="text-[9px] mt-0.5 block" style={{ color: "var(--sky-muted)" }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoonArc({ lunar }: { lunar: LunarData }) {
  const [hover, setHover] = useState<{ visible: boolean; left: number; min: number }>({
    visible: false,
    left: 0,
    min: 0,
  });

  const mr = minFromIso(lunar.moonrise);
  const ms = minFromIso(lunar.moonset);
  const culmination = minFromIso(lunar.lunar_culmination);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const stops: string[] = [];
  if (mr != null && ms != null) {
    if (mr < ms) {
      stops.push("rgba(30,41,59,0.3) 0%");
      stops.push(`rgba(30,41,59,0.3) ${pct(mr)}%`);
      stops.push(`rgba(196,181,253,0.6) ${pct(mr)}%`);
      if (culmination != null) stops.push(`rgba(196,181,253,0.9) ${pct(culmination)}%`);
      stops.push(`rgba(196,181,253,0.6) ${pct(ms)}%`);
      stops.push(`rgba(30,41,59,0.3) ${pct(ms)}%`);
      stops.push("rgba(30,41,59,0.3) 100%");
    } else {
      // Moon sets before rising (crosses midnight)
      stops.push(`rgba(196,181,253,0.6) 0%`);
      stops.push(`rgba(30,41,59,0.3) ${pct(ms)}%`);
      stops.push(`rgba(30,41,59,0.3) ${pct(mr)}%`);
      stops.push(`rgba(196,181,253,0.6) ${pct(mr)}%`);
      stops.push("rgba(196,181,253,0.6) 100%");
    }
  } else if (mr != null) {
    stops.push("rgba(30,41,59,0.3) 0%");
    stops.push(`rgba(196,181,253,0.7) ${pct(mr)}%`);
    stops.push("rgba(196,181,253,0.7) 100%");
  } else if (ms != null) {
    stops.push("rgba(196,181,253,0.7) 0%");
    stops.push(`rgba(30,41,59,0.3) ${pct(ms)}%`);
    stops.push("rgba(30,41,59,0.3) 100%");
  } else {
    stops.push("rgba(30,41,59,0.3) 0%");
    stops.push("rgba(30,41,59,0.3) 100%");
  }

  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;

  const markers: ArcMarker[] = [];
  if (mr != null) markers.push({ pct: pct(mr), label: formatTime(lunar.moonrise) });
  if (ms != null) markers.push({ pct: pct(ms), label: formatTime(lunar.moonset) });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const leftPct = (x / rect.width) * 100;
    const min = Math.round((leftPct / 100) * 1440);
    setHover({ visible: true, left: leftPct, min });
  };

  const timeStr = hover.visible
    ? `${String(Math.floor(hover.min / 60)).padStart(2, "0")}:${String(hover.min % 60).padStart(2, "0")}`
    : "";
  const moonVisible = hover.visible
    ? ((mr != null && ms != null)
        ? (mr < ms ? (hover.min >= mr && hover.min <= ms) : !(hover.min > ms && hover.min < mr))
        : (mr != null && hover.min >= mr) || (ms != null && hover.min < ms))
      ? "Above horizon"
      : "Below horizon"
    : "";

  return (
    <div>
      <div className="relative">
        <div
          className="h-3 rounded-full cursor-crosshair"
          style={{ background: gradient }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover({ visible: false, left: 0, min: 0 })}
        />
        <div className="absolute top-0" style={{ left: `${pct(nowMin)}%` }}>
          <div className="w-0.5 h-3.5 rounded-full mx-auto" style={{ background: "var(--sky-arc-marker)" }} />
        </div>
        <ArcTooltip visible={hover.visible} left={hover.left} timeStr={timeStr} detail={moonVisible} />
      </div>
      <div className="relative mt-2" style={{ height: "28px" }}>
        {markers.map((m, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${m.pct}%` }}>
            <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ background: "#c4b5fd" }} />
            <span className="text-[9px] mt-0.5 block" style={{ color: "var(--sky-muted)" }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Planet Symbols ──────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  Mercury: "\u263F",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u26E2",
  Neptune: "\u2646",
};

// ─── Loading / Error ─────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-5 h-5 border border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="text-xs text-red-400/80">{message}</span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DailySkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getToday());

  const fetchData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sky/daily?date=${dateStr}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  const goPrevDay = () => setCurrentDate(shiftDate(currentDate, -1));
  const goNextDay = () => setCurrentDate(shiftDate(currentDate, 1));
  const goToday = () => setCurrentDate(getToday());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const sunUp = data.solar.current_position?.is_above_horizon ?? false;
  const moonUp = data.lunar.current_position?.is_above_horizon ?? false;
  const isToday = currentDate === getToday();

  return (
    <div className="space-y-4">
      {/* ── Date & Location Header with Navigation ──────────────── */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          <button
            onClick={goPrevDay}
            className="date-btn"
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-[120px]">
            <div className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--sky-accent)" }} />
              <h1 className="text-base font-semibold">
                {isToday ? "Today" : formatDateShort(currentDate)}
              </h1>
            </div>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(e.target.value);
                }
              }}
              className="text-[10px] mt-1 px-1.5 py-0.5 rounded border text-center cursor-pointer"
              style={{
                background: "var(--sky-date-btn-bg)",
                color: "var(--sky-text)",
                borderColor: "var(--sky-date-btn-border)",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {!isToday && (
              <button
                onClick={goToday}
                className="text-[10px] mt-0.5 underline underline-offset-2"
                style={{ color: "var(--sky-accent)" }}
              >
                Back to today
              </button>
            )}
          </div>
          <button
            onClick={goNextDay}
            className="date-btn"
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--sky-muted)" }}>
          <MapPin className="w-3 h-3" />
          <span>{data.location.name}</span>
          <span style={{ color: "var(--sky-footer-text)" }}>&middot;</span>
          <span className="font-mono text-[10px]">
            {data.location.latitude.toFixed(2)}&deg;N {data.location.longitude.toFixed(2)}&deg;E
          </span>
        </div>
      </div>

      {/* ── Solar & Lunar Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Solar */}
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-3.5 h-3.5" style={{ color: sunUp ? "#fbbf24" : "#818cf8" }} />
              <span className="section-label">Solar</span>
              <span className={sunUp ? "status-dot-on" : "status-dot-off"} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Sunrise</span>
              <span className="row-value">{formatTime(data.solar.sunrise)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Sunset</span>
              <span className="row-value">{formatTime(data.solar.sunset)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Solar Noon</span>
              <span className="row-value">{formatTime(data.solar.solar_noon)}</span>
            </div>
            {data.solar.solar_culmination && (
              <div className="flex items-center justify-between py-1.5">
                <span className="row-label">Culmination</span>
                <span className="row-value">{formatTime(data.solar.solar_culmination)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Daylight</span>
              <span className="row-value">{formatDaylight(data.solar.daylight_hours)}</span>
            </div>

            <div className="my-2 sky-divider" />

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Civil Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.civil_twilight_morning_end)} &mdash; {formatTime(data.solar.civil_twilight_evening_start)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Nautical Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.nautical_twilight_morning_end)} &mdash; {formatTime(data.solar.nautical_twilight_evening_start)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Astronomical Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.astronomical_twilight_morning_end)} &mdash; {formatTime(data.solar.astronomical_twilight_evening_start)}
              </span>
            </div>

            {data.solar.golden_hour && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Golden Hour</span>
                  <span className="row-value">
                    {formatTime(data.solar.golden_hour.morning.start)} &mdash; {formatTime(data.solar.golden_hour.morning.end)}
                    <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>AM</span>
                    &nbsp;·&nbsp;
                    {formatTime(data.solar.golden_hour.evening.start)} &mdash; {formatTime(data.solar.golden_hour.evening.end)}
                    <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>PM</span>
                  </span>
                </div>
              </>
            )}

            {data.solar.blue_hour && (
              <>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Blue Hour</span>
                  <span className="row-value">
                    {formatTime(data.solar.blue_hour.morning.start)} &mdash; {formatTime(data.solar.blue_hour.morning.end)}
                    <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>AM</span>
                    &nbsp;·&nbsp;
                    {formatTime(data.solar.blue_hour.evening.start)} &mdash; {formatTime(data.solar.blue_hour.evening.end)}
                    <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>PM</span>
                  </span>
                </div>
              </>
            )}

            {data.solar.current_position && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Altitude</span>
                  <span className="row-value">
                    {data.solar.current_position.altitude_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Azimuth</span>
                  <span className="row-value">
                    {data.solar.current_position.azimuth_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Distance</span>
                  <span className="row-value">
                    {(data.solar.current_position.distance_au * 149_597_870.7 / 1_000_000).toFixed(2)}M km
                  </span>
                </div>
                {data.solar.current_position.angular_diameter_arcsec != null && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="row-label">Angular Size</span>
                    <span className="row-value">
                      {data.solar.current_position.angular_diameter_arcsec.toFixed(1)}″
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Status</span>
                  <span className="flex items-center gap-1.5 row-value">
                    {sunUp ? (
                      <Eye className="w-3 h-3" style={{ color: "#34d399" }} />
                    ) : (
                      <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />
                    )}
                    <span style={{ color: sunUp ? "#34d399" : "var(--sky-muted)" }}>
                      {sunUp ? "Above horizon" : "Below horizon"}
                    </span>
                  </span>
                </div>
              </>
            )}

            {data.sky_events?.solar_declination && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Declination</span>
                  <span className="row-value">
                    {data.sky_events.solar_declination.solar_declination_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Right Ascension</span>
                  <span className="row-value">
                    {data.sky_events.solar_declination.right_ascension_hours.toFixed(2)}h
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Eq. of Time</span>
                  <span className="row-value">
                    {data.sky_events.solar_declination.equation_of_time_minutes >= 0 ? "+" : ""}{data.sky_events.solar_declination.equation_of_time_minutes.toFixed(1)} min
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Season</span>
                  <span className="row-value capitalize">{data.sky_events.solar_declination.season}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Day of Year</span>
                  <span className="row-value">{data.sky_events.solar_declination.day_of_year}</span>
                </div>
              </>
            )}

            {data.sky_events?.sun_constellation && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Sun Constellation</span>
                  <span className="row-value">{data.sky_events.sun_constellation}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lunar */}
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MoonIcon className="w-3.5 h-3.5" style={{ color: moonUp ? "#c4b5fd" : "var(--sky-muted)" }} />
              <span className="section-label">Lunar</span>
              <span className={moonUp ? "status-dot-on" : "status-dot-off"} />
            </div>

            {/* Moon phase row */}
            <div className="flex items-center gap-3 mb-2">
              <MoonPhase
                fraction={data.lunar.phase_fraction}
                illumination={data.lunar.illumination_percent}
              />
              <div>
                <p className="text-xs font-medium row-value">
                  {data.lunar.phase_name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                  {data.lunar.illumination_percent.toFixed(0)}% illuminated
                  {data.lunar.phase_angle_deg != null && (
                    <span className="ml-1" style={{ color: "var(--sky-footer-text)" }}>
                      · {data.lunar.phase_angle_deg.toFixed(1)}° phase
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="my-2 sky-divider" />

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Moonrise</span>
              <span className="row-value">{formatTime(data.lunar.moonrise)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Moonset</span>
              <span className="row-value">{formatTime(data.lunar.moonset)}</span>
            </div>
            {data.lunar.lunar_culmination && (
              <div className="flex items-center justify-between py-1.5">
                <span className="row-label">Culmination</span>
                <span className="row-value">{formatTime(data.lunar.lunar_culmination)}</span>
              </div>
            )}

            {data.lunar.current_position && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Altitude</span>
                  <span className="row-value">
                    {data.lunar.current_position.altitude_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Azimuth</span>
                  <span className="row-value">
                    {data.lunar.current_position.azimuth_deg != null
                      ? `${data.lunar.current_position.azimuth_deg.toFixed(1)}°`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Distance</span>
                  <span className="row-value">
                    {data.lunar.current_position.distance_km != null
                      ? `${(data.lunar.current_position.distance_km / 1000).toFixed(0)}k km`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Status</span>
                  <span className="flex items-center gap-1.5 row-value">
                    {moonUp ? (
                      <Eye className="w-3 h-3" style={{ color: "#34d399" }} />
                    ) : (
                      <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />
                    )}
                    <span style={{ color: moonUp ? "#34d399" : "var(--sky-muted)" }}>
                      {moonUp ? "Above horizon" : "Below horizon"}
                    </span>
                  </span>
                </div>
              </>
            )}

            {data.sky_events?.moon_constellation && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Constellation</span>
                  <span className="row-value">{data.sky_events.moon_constellation}</span>
                </div>
              </>
            )}

            {data.sky_events?.moon_distance && (
              <>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Angular Size</span>
                  <span className="row-value">
                    {data.sky_events.moon_distance.angular_diameter_arcmin.toFixed(1)}′
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Distance</span>
                  <span className="row-value">
                    {(data.sky_events.moon_distance.distance_km / 1000).toFixed(0)}k km
                    {data.sky_events.moon_distance.distance_label !== "normal" && (
                      <span
                        className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-semibold uppercase"
                        style={{
                          background:
                            data.sky_events.moon_distance.distance_label === "supermoon"
                              ? "rgba(251,191,36,0.15)"
                              : "rgba(96,165,250,0.15)",
                          color:
                            data.sky_events.moon_distance.distance_label === "supermoon"
                              ? "#fbbf24"
                              : "#60a5fa",
                        }}
                      >
                        {data.sky_events.moon_distance.distance_label}
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Day Arc — Solar & Moon Brightness ───────────────────── */}
      <div className="sky-card">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-3.5 h-3.5" style={{ color: sunUp ? "#fbbf24" : "var(--sky-muted)" }} />
            <MoonIcon className="w-3.5 h-3.5" style={{ color: "#c4b5fd" }} />
            <span className="section-label">Day Arc</span>
          </div>

          {/* Solar arc */}
          <div className="mb-1">
            <span className="text-[10px] font-medium" style={{ color: "var(--sky-muted)" }}>
              Solar brightness
            </span>
          </div>
          <SolarArc solar={data.solar} />

          {/* Moon arc */}
          <div className="mt-4 mb-1">
            <span className="text-[10px] font-medium" style={{ color: "var(--sky-muted)" }}>
              Moon visibility
            </span>
          </div>
          <MoonArc lunar={data.lunar} />

          {/* Legend */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--sky-divider)" }}>
            <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
              <Sunrise className="w-3 h-3 inline mr-1 -mt-0.5" />
              Sunrise
            </span>
            <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
              Solar noon
            </span>
            <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
              <Sunset className="w-3 h-3 inline mr-1 -mt-0.5" />
              Sunset
            </span>
          </div>
        </div>
      </div>

      {/* ── Upcoming Moon Phases ────────────────────────────────── */}
      {data.lunar.upcoming_phases && data.lunar.upcoming_phases.length > 0 && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MoonIcon className="w-3.5 h-3.5" style={{ color: "#c4b5fd" }} />
              <span className="section-label">Upcoming Moon Phases</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.lunar.upcoming_phases.map((phase, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 text-center border"
                  style={{
                    background: "var(--sky-planet-bg)",
                    borderColor: "var(--sky-planet-border)",
                  }}
                >
                  <p className="text-[10px] font-medium row-value">{phase.phase}</p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--sky-muted)" }}>
                    {new Date(phase.datetime_utc).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>
                    {new Date(phase.datetime_utc).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Upcoming Moon Nodes ─────────────────────────────────── */}
      {data.lunar.upcoming_nodes && data.lunar.upcoming_nodes.length > 0 && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MoonIcon className="w-3.5 h-3.5" style={{ color: "#c4b5fd" }} />
              <span className="section-label">Moon Nodes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {data.lunar.upcoming_nodes.map((node, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 text-center border"
                  style={{
                    background: "var(--sky-planet-bg)",
                    borderColor: "var(--sky-planet-border)",
                  }}
                >
                  <p className="text-[10px] font-medium row-value">{node.type}</p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--sky-muted)" }}>
                    {new Date(node.datetime_utc).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>
                    {new Date(node.datetime_utc).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-2 text-center" style={{ color: "var(--sky-footer-text)" }}>
              Moon crosses the ecliptic — eclipse windows
            </p>
          </div>
        </div>
      )}

      {/* ── Planets ─────────────────────────────────────────────── */}
      <div className="sky-card">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Telescope className="w-3.5 h-3.5" style={{ color: "var(--sky-muted)" }} />
            <span className="section-label">Planets</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {data.planets.map((planet) => (
              <div
                key={planet.name}
                className="rounded-lg p-2.5 text-center border transition-colors"
                style={{
                  background: planet.is_above_horizon
                    ? "var(--sky-visible-bg)"
                    : "var(--sky-planet-bg)",
                  borderColor: planet.is_above_horizon
                    ? "var(--sky-visible-border)"
                    : "var(--sky-planet-border)",
                  opacity: planet.is_above_horizon ? 1 : 0.4,
                }}
              >
                <span className="text-sm leading-none">
                  {PLANET_SYMBOLS[planet.name] || "\u25CF"}
                </span>
                <p className="text-[10px] font-medium mt-1.5" style={{ color: "var(--sky-muted)" }}>
                  {planet.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-footer-text)" }}>
                  {planet.altitude_deg.toFixed(0)}&deg;
                </p>
                {planet.distance_au != null && (
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--sky-footer-text)" }}>
                    {planet.distance_au.toFixed(2)} AU
                  </p>
                )}
                <div className="mt-1">
                  <span className={planet.is_above_horizon ? "status-dot-on" : "status-dot-off"} />
                </div>
              </div>
            ))}
          </div>

          {/* Planet detail rows */}
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--sky-divider)" }}>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {data.planets.map((planet) => (
                <div key={`detail-${planet.name}`} className="text-center">
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.ra_hours != null ? `${planet.ra_hours.toFixed(1)}h` : "—"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.dec_deg != null ? `${planet.dec_deg >= 0 ? "+" : ""}${planet.dec_deg.toFixed(1)}°` : "—"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.azimuth_deg != null ? `${planet.azimuth_deg.toFixed(0)}°` : "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-1 text-center uppercase tracking-wider" style={{ color: "var(--sky-detail-text)" }}>
              RA · Dec · Az
            </p>
          </div>

          {/* Planet rise/set/culmination times */}
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--sky-divider)" }}>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {data.planets.map((planet) => (
                <div key={`rise-${planet.name}`} className="text-center">
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.rise ? formatTime(planet.rise) : "—"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.set ? formatTime(planet.set) : "—"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--sky-detail-text)" }}>
                    {planet.culmination ? formatTime(planet.culmination) : "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-1 text-center uppercase tracking-wider" style={{ color: "var(--sky-detail-text)" }}>
              Rise · Set · Culmination
            </p>
          </div>
        </div>
      </div>

      {/* ── Astronomical Darkness ─────────────────────────────────── */}
      {data.solar.astronomical_twilight_evening_start && data.solar.astronomical_twilight_morning_end && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <EyeOff className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />
              <span className="section-label">Astronomical Darkness</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Dark Sky Window</span>
              <span className="row-value">
                {formatTime(data.solar.astronomical_twilight_evening_start)} &mdash; {formatTime(data.solar.astronomical_twilight_morning_end)}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--sky-footer-text)" }}>
              Period when the sky is fully dark (Sun &gt;18° below horizon)
            </p>
          </div>
        </div>
      )}

      {/* ── Season Events ───────────────────────────────────────── */}
      {data.sky_events?.next_season_event && data.sky_events.next_season_event.datetime_utc && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
              <span className="section-label">Next Season Event</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Event</span>
              <span className="row-value capitalize">{data.sky_events.next_season_event.event}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Date</span>
              <span className="row-value">
                {new Date(data.sky_events.next_season_event.datetime_utc).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Time</span>
              <span className="row-value">
                {new Date(data.sky_events.next_season_event.datetime_utc).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Days Away</span>
              <span className="row-value">{data.sky_events.next_season_event.days_away}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Dark/Twilight Classification ────────────────────────── */}
      {data.sky_events?.dark_twilight_classification && data.sky_events.dark_twilight_classification.length > 0 && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <EyeOff className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />
              <span className="section-label">Sky Brightness</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {data.sky_events.dark_twilight_classification.map((cls, idx) => (
                  <div
                    key={idx}
                    className="rounded p-2 text-center border"
                    style={{
                      background: "var(--sky-planet-bg)",
                      borderColor: "var(--sky-planet-border)",
                    }}
                  >
                    <p className="text-[10px] font-medium" style={{ color: "var(--sky-brightness-text)" }}>
                      {String(cls.hour_utc).padStart(2, "0")}:00
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--sky-brightness-label)" }}>
                      {cls.classification === "Night" ? "Dark" : cls.classification}
                    </p>
                  </div>
                ))}
            </div>
            <p className="text-[9px] mt-2 text-center" style={{ color: "var(--sky-footer-text)" }}>
              Hourly sky brightness classification (UTC)
            </p>
          </div>
        </div>
      )}

      {/* ── Milky Way Events ────────────────────────────────────── */}
      {data.sky_events?.milky_way && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />
              <span className="section-label">Milky Way</span>
              <span className={data.sky_events.milky_way.is_visible ? "status-dot-on" : "status-dot-off"} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Galactic Center Alt.</span>
              <span className="row-value">
                {data.sky_events.milky_way.galactic_center_altitude.toFixed(1)}&deg;
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Azimuth</span>
              <span className="row-value">
                {data.sky_events.milky_way.galactic_center_azimuth.toFixed(1)}&deg;
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Best Viewing (UTC)</span>
              <span className="row-value">
                {String(data.sky_events.milky_way.best_viewing_hour_utc).padStart(2, "0")}:00
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Seasonal Visibility</span>
              <span
                className="row-value text-[11px] capitalize"
                style={{
                  color:
                    data.sky_events.milky_way.seasonal_visibility === "excellent"
                      ? "#34d399"
                      : data.sky_events.milky_way.seasonal_visibility === "good"
                      ? "#fbbf24"
                      : "#f87171",
                }}
              >
                {data.sky_events.milky_way.seasonal_visibility}
              </span>
            </div>

            <div className="my-2 sky-divider" />

            <p className="text-[11px] leading-relaxed" style={{ color: "var(--sky-muted)" }}>
              {data.sky_events.milky_way.seasonal_description}
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--sky-footer-text)" }}>
              Optimal months: {data.sky_events.milky_way.optimal_months.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Sky Events (Meteor Showers) ─────────────────────────── */}
      {data.sky_events && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
              <span className="section-label">Sky Events</span>
              {data.sky_events.active_shower_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--sky-shower-bg)", color: "#8b5cf6" }}>
                  {data.sky_events.active_shower_count} active
                </span>
              )}
            </div>

            {data.sky_events.meteor_showers.length === 0 ? (
              <p className="text-[11px] py-3 text-center" style={{ color: "var(--sky-muted)" }}>
                No major meteor showers active on this date.
              </p>
            ) : (
              <div className="space-y-2">
                {data.sky_events.meteor_showers.map((shower) => (
                  <div
                    key={shower.name}
                    className="rounded-lg p-3 border"
                    style={{
                      background: "var(--sky-shower-bg)",
                      borderColor: "var(--sky-shower-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium row-value">
                          {shower.name}
                          {shower.near_peak && (
                            <span
                              className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: "#8b5cf6", color: "#fff" }}
                            >
                              PEAK
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                          Peak: {shower.peak_date} &middot; ZHR ~{shower.zhr}/hr
                        </p>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
                        {shower.days_from_peak === 0
                          ? "Peak night"
                          : `${shower.days_from_peak}d from peak`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Astronomical Facts ──────────────────────────────────── */}
      {data.sky_events?.facts && data.sky_events.facts.length > 0 && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-3.5 h-3.5" style={{ color: "var(--sky-accent)" }} />
              <span className="section-label">Astronomical Facts</span>
            </div>

            <div className="space-y-2">
              {data.sky_events.facts.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 border"
                  style={{
                    background: "var(--sky-fact-bg)",
                    borderColor: "var(--sky-fact-border)",
                  }}
                >
                  <p className="text-[11px] leading-relaxed row-value">
                    {entry.fact}
                  </p>
                  <p className="text-[9px] mt-1.5 uppercase tracking-wider" style={{ color: "var(--sky-footer-text)" }}>
                    {entry.source === "date-specific" ? "\u2728 Date-specific" : entry.source === "proximity" ? "\u25CE Nearby date" : "\u2605 General"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
          Skyfield &middot; DE440S &middot; Pathfinder
        </p>
      </div>
    </div>
  );
}
