import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Download, Settings2, Sparkles, Check, Sun } from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

export default function Result({ originalImage, enhancedImage, analysis, tuning, appliedTuning, onApplyTuning, outputFormat, outputQuality, onOutputChange }) {

    const [localTuning, setLocalTuning] = useState(tuning);
    const [isDirty, setIsDirty] = useState(false);
    const [downloadFlash, setDownloadFlash] = useState(false);

    useEffect(() => {
        setLocalTuning({
            sharpness: tuning.sharpness === -1 ? (appliedTuning?.sharpness || 0) : tuning.sharpness,
            noise: tuning.noise === -1 ? (appliedTuning?.noise || 0) : tuning.noise,
            color: tuning.color === -1 ? (appliedTuning?.color || 0) : tuning.color,
            contrast: tuning.contrast === -1 ? (appliedTuning?.contrast || 0) : tuning.contrast,
        });
        setIsDirty(false);
    }, [tuning, appliedTuning]);

    // Brightness badge: low=red, high=amber, normal=green
    const brightnessBadge = () => {
        if (analysis.brightness === 'low')
            return { style: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Low Brightness' };
        if (analysis.brightness === 'high')
            return { style: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Sun className="w-3.5 h-3.5" />, label: 'Overexposed' };
        return { style: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Normal Brightness' };
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = enhancedImage;
        const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
        link.download = `pixelperfect-enhanced.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadFlash(true);
        setTimeout(() => setDownloadFlash(false), 2000);
    };

    const handleChange = (key, val) => {
        setLocalTuning(prev => ({ ...prev, [key]: val }));
        setIsDirty(true);
    };

    const handleApply = () => {
        onApplyTuning(localTuning);
        setIsDirty(false);
    };

    const bright = brightnessBadge();

    return (
        <div className="w-full flex flex-col xl:flex-row gap-8 animate-in fade-in duration-500 text-left">
            {/* Left Column: Image Viewer */}
            <div className="flex-1 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-indigo-500/10">
                    <div className="p-4 border-b border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" /> Interactive Comparison
                        </h3>
                        <button
                            onClick={handleDownload}
                            className={`px-4 py-1.5 border rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all ${downloadFlash
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                                }`}
                        >
                            {downloadFlash ? <><Check className="w-4 h-4" /> Downloaded!</> : <><Download className="w-4 h-4" /> Download Result</>}
                        </button>
                    </div>

                    <div className="bg-slate-100 h-[500px] w-full relative">
                        <ReactCompareSlider
                            itemOne={<ReactCompareSliderImage src={originalImage} alt="Original" />}
                            itemTwo={<ReactCompareSliderImage src={enhancedImage} alt="Enhanced" />}
                            className="h-full w-full object-contain"
                        />
                    </div>
                </div>

                {/* Quality Badges */}
                <div className="flex flex-wrap gap-2">
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${analysis.blur ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {analysis.blur ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {analysis.blur ? 'Blur Detected' : 'Sharp Image'}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${analysis.noise_type !== 'none' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {analysis.noise_type !== 'none' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {analysis.noise_type === 'gaussian' ? 'Gaussian Noise' : analysis.noise_type === 'salt_pepper' ? 'S&P Noise' : 'No Noise'}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${bright.style}`}>
                        {bright.icon} {bright.label}
                    </div>
                </div>
            </div>

            {/* Right Column: Tuning Controls */}
            <div className="w-full xl:w-80 flex-shrink-0">
                <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border)] p-6 sticky top-24 space-y-6">
                    <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-slate-500" /> Manual Tuning
                    </h3>

                    <div className="space-y-6">
                        <TuningSlider label="Sharpening" value={localTuning.sharpness} min={0} max={5} step={0.5} onChange={v => handleChange('sharpness', v)} />
                        <TuningSlider label="Denoising" value={localTuning.noise} min={0} max={11} step={2} onChange={v => handleChange('noise', v)} />
                        <TuningSlider label="Color Correction" value={localTuning.color} min={0} max={1} step={0.1} onChange={v => handleChange('color', v)} />
                        <TuningSlider label="Contrast (CLAHE)" value={localTuning.contrast} min={0} max={5} step={0.5} onChange={v => handleChange('contrast', v)} />
                    </div>

                    {/* Output Format */}
                    <div>
                        <div className="text-sm font-medium text-[var(--text)] mb-2">Output Format</div>
                        <div className="flex gap-2 mb-3">
                            {['png', 'jpeg', 'webp'].map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => onOutputChange({ format: fmt, quality: outputQuality })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase border transition-colors ${outputFormat === fmt
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-50 dark:bg-slate-800 text-[var(--text-muted)] border-[var(--border)] hover:border-indigo-300'
                                        }`}
                                >{fmt}</button>
                            ))}
                        </div>
                        {outputFormat !== 'png' && (
                            <div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                                    <span>Quality</span><span className="font-mono text-indigo-600 dark:text-indigo-400">{outputQuality}</span>
                                </div>
                                <input
                                    type="range" min={50} max={100} step={5}
                                    value={outputQuality}
                                    onChange={e => onOutputChange({ format: outputFormat, quality: parseInt(e.target.value) })}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600 dark:accent-indigo-500"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleApply}
                        disabled={!isDirty}
                        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isDirty
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Check className="w-4 h-4" /> Apply Changes
                    </button>
                    <p className="text-xs text-slate-400 leading-relaxed text-center">
                        Adjust sliders and click apply to re-process.
                    </p>
                </div>
            </div>
        </div>
    );
}

function TuningSlider({ label, min, max, step, value, onChange }) {
    // Show value with 1 decimal place to make it robust against float precision issues or arbitrary numbers
    const displayValue = value === -1 ? 0 : Number(value).toFixed(1);
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-[var(--text)]">{label}</label>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded">{displayValue}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value === -1 ? 0 : value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600 dark:accent-indigo-500"
            />
        </div>
    );
}
