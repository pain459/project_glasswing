"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Moon as MoonIcon,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Calendar,
  Sunrise,
  Sunset,
  CloudMoon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface SolarData {
  sunrise: string | null;
  sunset: string | null;
  solar_noon: string | null;
  daylight_hours: number | null;
  civil_twilight_morning_end: string | null;
  civil_twilight_evening_start: string | null;
  nautical_twilight_morning_end: string | null;
  nautical_twilight_evening_start: string | null;
  astronomical_twilight_morning_end: string | null;
  astronomical_twilight_evening_start: string | null;
  polar_day: boolean;
  polar_night: boolean;
  current_position?: {
    altitude_deg: number;
    azimuth_deg: number;
    is_above_horizon: boolean;
  };
}

interface LunarData {
  moonrise: string | null;
  moonset: string | null;
  phase_name: string;
  phase_fraction: number;
  illuminated_fraction: number;
  illumination_percent: number;
  current_position?: {
    altitude_deg: number;
    is_above_horizon: boolean;
  };
}

interface PlanetData {
  name: string;
  altitude_deg: number;
  is_above_horizon: boolean;
  distance_au?: number;
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

// ─── Moon Phase Indicator (compact, 32px) ───────────────────────────

function MoonPhase({ fraction, illumination }: { fraction: number; illumination: number }) {
  // Simple SVG moon phase: dark circle with illuminated portion
  const pct = Math.max(0, Math.min(100, illumination));
  const isWaxing = fraction <= 0.5;

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
      {/* Dark base */}
      <circle cx="16" cy="16" r="14" fill="#1e293b" />
      {/* Illuminated arc */}
      {pct > 0 && (
        <>
          {pct >= 100 ? (
            // Full moon
            <circle cx="16" cy="16" r="14" fill="#e2e8f0" />
          ) : pct <= 1 ? (
            // New moon
            <circle cx="16" cy="16" r="14" fill="#1e293b" />
          ) : isWaxing ? (
            // Waxing: light grows from right
            <>
              <path
                d={`M16 2 A14 14 0 0 1 16 30 Z`}
                fill="#e2e8f0"
                opacity={0.9}
              />
              <ellipse
                cx="16"
                cy="16"
                rx={14 * (1 - pct / 100)}
                ry="14"
                fill="#1e293b"
              />
            </>
          ) : (
            // Waning: light shrinks from right
            <>
              <path
                d={`M16 2 A14 14 0 0 0 16 30 Z`}
                fill="#e2e8f0"
                opacity={0.9}
              />
              <ellipse
                cx="16"
                cy="16"
                rx={14 * ((100 - pct) / 100)}
                ry="14"
                fill="#1e293b"
              />
            </>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        on ? "bg-emerald-400" : "bg-gray-600"
      }`}
    />
  );
}

// ─── Card ────────────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  status,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  status?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon
        className={`w-3.5 h-3.5 ${accent || "text-gray-400"}`}
      />
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
        {title}
      </span>
      {status !== undefined && <StatusDot on={status} />}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────

function Row({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-200">{value}</span>
    </div>
  );
}

// ─── Day Arc Timeline ────────────────────────────────────────────────

function DayArc({ solar }: { solar: SolarData }) {
  const sunriseMin = solar.sunrise
    ? new Date(solar.sunrise).getHours() * 60 + new Date(solar.sunrise).getMinutes()
    : 360;
  const sunsetMin = solar.sunset
    ? new Date(solar.sunset).getHours() * 60 + new Date(solar.sunset).getMinutes()
    : 1080;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const range = 1200; // 5am to 9pm = 1200 min
  const offset = 300; // 5am start

  const startPct = Math.max(0, ((sunriseMin - offset) / range) * 100);
  const endPct = Math.min(100, ((sunsetMin - offset) / range) * 100);
  const nowPct = Math.max(0, Math.min(100, ((nowMin - offset) / range) * 100));

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="relative h-1 rounded-full bg-gray-800/60">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500/40 via-orange-400/50 to-amber-500/40"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(endPct - startPct, 0)}%`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-2.5 bg-white/80 rounded-full -ml-0.5"
          style={{ left: `${nowPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-gray-600 flex items-center gap-1">
          <Sunrise className="w-3 h-3" />
          {formatTime(solar.sunrise)}
        </span>
        <span className="text-[10px] text-gray-600 flex items-center gap-1">
          <Sunset className="w-3 h-3" />
          {formatTime(solar.sunset)}
        </span>
      </div>
    </div>
  );
}

// ─── Planet Symbols ──────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "⛢",
  Neptune: "♆",
};

// ─── Loading State ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-5 h-5 border border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────

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

  useEffect(() => {
    fetch("/api/v1/sky/daily")
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const sunUp = data.solar.current_position?.is_above_horizon ?? false;
  const moonUp = data.lunar.current_position?.is_above_horizon ?? false;

  return (
    <div className="space-y-4">
      {/* ── Date & Location Header ──────────────────────────────── */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Calendar className="w-3.5 h-3.5 text-sky-400/70" />
          <h1 className="text-base font-semibold text-gray-100">
            {data.date}
          </h1>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{data.location.name}</span>
          <span className="text-gray-700">·</span>
          <span className="font-mono text-[10px]">
            {data.location.latitude.toFixed(2)}°N {data.location.longitude.toFixed(2)}°E
          </span>
        </div>
      </div>

      {/* ── Solar & Lunar Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Solar */}
        <Card>
          <div className="p-4">
            <SectionHeader
              icon={Sun}
              title="Solar"
              status={sunUp}
              accent={sunUp ? "text-amber-400" : "text-indigo-400"}
            />

            <Row label="Sunrise" value={formatTime(data.solar.sunrise)} />
            <Row label="Sunset" value={formatTime(data.solar.sunset)} />
            <Row label="Solar Noon" value={formatTime(data.solar.solar_noon)} />
            <Row label="Daylight" value={formatDaylight(data.solar.daylight_hours)} />

            <div className="border-t border-white/5 my-2" />

            <Row
              label="Civil Twilight"
              value={`${formatTime(data.solar.civil_twilight_morning_end)} — ${formatTime(data.solar.civil_twilight_evening_start)}`}
            />
            <Row
              label="Nautical Twilight"
              value={`${formatTime(data.solar.nautical_twilight_morning_end)} — ${formatTime(data.solar.nautical_twilight_evening_start)}`}
            />
            <Row
              label="Astronomical Twilight"
              value={`${formatTime(data.solar.astronomical_twilight_morning_end)} — ${formatTime(data.solar.astronomical_twilight_evening_start)}`}
            />

            {data.solar.current_position && (
              <>
                <div className="border-t border-white/5 my-2" />
                <Row
                  label="Altitude"
                  value={`${data.solar.current_position.altitude_deg.toFixed(1)}°`}
                />
                <Row
                  label="Status"
                  value={
                    <span className="flex items-center gap-1.5">
                      {sunUp ? (
                        <Eye className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-600" />
                      )}
                      <span className={sunUp ? "text-emerald-400" : "text-gray-500"}>
                        {sunUp ? "Above horizon" : "Below horizon"}
                      </span>
                    </span>
                  }
                />
              </>
            )}

            <DayArc solar={data.solar} />
          </div>
        </Card>

        {/* Lunar */}
        <Card>
          <div className="p-4">
            <SectionHeader
              icon={MoonIcon}
              title="Lunar"
              status={moonUp}
              accent={moonUp ? "text-violet-300" : "text-gray-500"}
            />

            {/* Moon phase row */}
            <div className="flex items-center gap-3 mb-2">
              <MoonPhase
                fraction={data.lunar.phase_fraction}
                illumination={data.lunar.illumination_percent}
              />
              <div>
                <p className="text-xs font-medium text-gray-200">
                  {data.lunar.phase_name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {data.lunar.illumination_percent.toFixed(0)}% illuminated
                </p>
              </div>
            </div>

            <div className="border-t border-white/5 my-2" />

            <Row label="Moonrise" value={formatTime(data.lunar.moonrise)} />
            <Row label="Moonset" value={formatTime(data.lunar.moonset)} />

            {data.lunar.current_position && (
              <>
                <div className="border-t border-white/5 my-2" />
                <Row
                  label="Altitude"
                  value={`${data.lunar.current_position.altitude_deg.toFixed(1)}°`}
                />
                <Row
                  label="Status"
                  value={
                    <span className="flex items-center gap-1.5">
                      {moonUp ? (
                        <Eye className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-600" />
                      )}
                      <span className={moonUp ? "text-emerald-400" : "text-gray-500"}>
                        {moonUp ? "Above horizon" : "Below horizon"}
                      </span>
                    </span>
                  }
                />
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Planets ─────────────────────────────────────────────── */}
      <Card>
        <div className="p-4">
          <SectionHeader icon={CloudMoon} title="Planets" accent="text-gray-400" />

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {data.planets.map((planet) => (
              <div
                key={planet.name}
                className={`rounded-lg p-2.5 text-center border transition-colors ${
                  planet.is_above_horizon
                    ? "bg-emerald-500/[0.04] border-emerald-500/10"
                    : "bg-white/[0.01] border-white/[0.04] opacity-40"
                }`}
              >
                <span className="text-sm leading-none">
                  {PLANET_SYMBOLS[planet.name] || "●"}
                </span>
                <p className="text-[10px] font-medium text-gray-400 mt-1.5">
                  {planet.name}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {planet.altitude_deg.toFixed(0)}°
                </p>
                <div className="mt-1">
                  <StatusDot on={planet.is_above_horizon} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[10px] text-gray-700">
          Skyfield · DE440S · Pathfinder
        </p>
      </div>
    </div>
  );
}
