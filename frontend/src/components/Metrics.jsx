import React from 'react';
import { Activity, Contrast, Layers, Radio, Signal } from 'lucide-react';

export default function Metrics({ metrics }) {

    const pct = (before, after) => {
        if (!before) return 0;
        return (((after - before) / before) * 100).toFixed(1);
    };

    const snrImpr = pct(metrics.snr_before, metrics.snr_after);

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border)] p-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 ease-out">
            <h2 className="text-2xl font-semibold text-[var(--text)] mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-500" />
                Image Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Sharpness */}
                <MetricCard
                    title="Sharpness"
                    subtitle="Laplacian Variance"
                    icon={<Layers className="w-5 h-5 text-blue-500" />}
                    before={metrics.sharpness_before.toFixed(1)}
                    after={metrics.sharpness_after.toFixed(1)}
                    improvement={pct(metrics.sharpness_before, metrics.sharpness_after)}
                    color="blue"
                />

                {/* Contrast */}
                <MetricCard
                    title="Contrast"
                    subtitle="Std Deviation"
                    icon={<Contrast className="w-5 h-5 text-purple-500" />}
                    before={metrics.contrast_before.toFixed(1)}
                    after={metrics.contrast_after.toFixed(1)}
                    improvement={pct(metrics.contrast_before, metrics.contrast_after)}
                    color="purple"
                />

                {/* SNR */}
                <MetricCard
                    title="SNR"
                    subtitle="Signal-to-Noise Ratio"
                    icon={<Signal className="w-5 h-5 text-emerald-500" />}
                    before={`${metrics.snr_before} dB`}
                    after={`${metrics.snr_after} dB`}
                    improvement={snrImpr}
                    color="emerald"
                />

                {/* PSNR */}
                <SingleValueCard
                    title="PSNR"
                    subtitle="Peak Signal-to-Noise Ratio"
                    icon={<Radio className="w-5 h-5 text-amber-500" />}
                    value={metrics.psnr !== null ? `${metrics.psnr} dB` : '∞'}
                    note={metrics.psnr === null ? 'No change applied' : metrics.psnr >= 40 ? 'Excellent quality' : metrics.psnr >= 30 ? 'Good quality' : 'Moderate change'}
                    color="amber"
                />
            </div>
        </div>
    );
}

function MetricCard({ title, subtitle, icon, before, after, improvement, color }) {
    const isPositive = parseFloat(improvement) >= 0;
    const colorMap = {
        blue: "bg-[var(--bg-card)] border-[var(--border)]",
        purple: "bg-[var(--bg-card)] border-[var(--border)]",
        emerald: "bg-[var(--bg-card)] border-[var(--border)]",
    };

    return (
        <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-1 font-medium text-[var(--text)]">{icon} {title}</div>
            <div className="text-xs text-[var(--text-muted)] mb-4">{subtitle}</div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Before</div>
                    <div className="text-xl font-semibold text-[var(--text)]">{before}</div>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">After</div>
                    <div className="text-xl font-semibold text-[var(--text)]">{after}</div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--text-muted)]">Improvement</div>
                <div className={`text-sm font-bold ${isPositive ? 'text-green-500' : 'text-slate-500'}`}>
                    {isPositive ? '+' : ''}{improvement}%
                </div>
            </div>
        </div>
    );
}

function SingleValueCard({ title, subtitle, icon, value, note, color }) {
    const colorMap = {
        amber: "bg-[var(--bg-card)] border-[var(--border)]",
    };

    return (
        <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-1 font-medium text-[var(--text)]">{icon} {title}</div>
            <div className="text-xs text-[var(--text-muted)] mb-4">{subtitle}</div>
            <div className="text-3xl font-bold mb-2 text-[var(--text)]">{value}</div>
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-muted)]">{note}</p>
            </div>
        </div>
    );
}
