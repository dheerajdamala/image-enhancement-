import React from 'react';
import { Activity, Contrast, Layers } from 'lucide-react';

export default function Metrics({ metrics }) {

    const calculateImprovement = (before, after) => {
        if (!before) return 0;
        return (((after - before) / before) * 100).toFixed(1);
    };

    const sharpnessImpr = calculateImprovement(metrics.sharpness_before, metrics.sharpness_after);
    const contrastImpr = calculateImprovement(metrics.contrast_before, metrics.contrast_after);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 ease-out">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-500" />
                Image Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard
                    title="Sharpness (Laplacian Variance)"
                    icon={<Layers className="w-5 h-5 text-blue-500" />}
                    before={metrics.sharpness_before.toFixed(1)}
                    after={metrics.sharpness_after.toFixed(1)}
                    improvement={sharpnessImpr}
                    color="blue"
                />

                <MetricCard
                    title="Contrast (Std Deviation)"
                    icon={<Contrast className="w-5 h-5 text-purple-500" />}
                    before={metrics.contrast_before.toFixed(1)}
                    after={metrics.contrast_after.toFixed(1)}
                    improvement={contrastImpr}
                    color="purple"
                />
            </div>
        </div>
    );
}

function MetricCard({ title, icon, before, after, improvement, color }) {
    const isPositive = parseFloat(improvement) >= 0;
    const colorClasses = {
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        purple: "bg-purple-50 border-purple-100 text-purple-700"
    };

    return (
        <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-4 font-medium">
                {icon} {title}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Before</div>
                    <div className="text-xl font-semibold">{before}</div>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-wider opacity-70 mb-1">After</div>
                    <div className="text-xl font-semibold">{after}</div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                <div className="text-sm font-medium opacity-80">Improvement</div>
                <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-slate-600'}`}>
                    {isPositive ? '+' : ''}{improvement}%
                </div>
            </div>
        </div>
    );
}
