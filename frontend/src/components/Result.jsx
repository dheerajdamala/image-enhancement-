import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Download, Settings2, Sparkles, Check } from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

export default function Result({ originalImage, enhancedImage, analysis, tuning, onApplyTuning }) {

    const [localTuning, setLocalTuning] = useState(tuning);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalTuning(tuning);
        setIsDirty(false);
    }, [tuning]);

    const getBadgeStyle = (issueDetected, isPositive) => {
        if (isPositive) return issueDetected ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = enhancedImage;
        link.download = 'pixelperfect-enhanced.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleChange = (key, val) => {
        setLocalTuning(prev => ({ ...prev, [key]: val }));
        setIsDirty(true);
    };

    const handleApply = () => {
        onApplyTuning(localTuning);
        setIsDirty(false);
    };

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
                            className="px-4 py-1.5 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-colors"
                        >
                            <Download className="w-4 h-4" /> Download Result
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
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${getBadgeStyle(analysis.blur, true)}`}>
                        {analysis.blur ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {analysis.blur ? 'Blur Detected' : 'Sharp Image'}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${getBadgeStyle(analysis.noise_type !== 'none', true)}`}>
                        {analysis.noise_type !== 'none' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {analysis.noise_type === 'gaussian' ? 'Gaussian Noise' :
                            analysis.noise_type === 'salt_pepper' ? 'S&P Noise' : 'No Noise'}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${getBadgeStyle(analysis.brightness === 'low', true)}`}>
                        {analysis.brightness === 'low' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {analysis.brightness === 'low' ? 'Low Brightness' : 'Normal Brightness'}
                    </div>
                </div>
            </div>

            {/* Right Column: Tuning Controls */}
            <div className="w-full xl:w-80 flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
                        <Settings2 className="w-5 h-5 text-slate-500" /> Manual Tuning
                    </h3>

                    <div className="space-y-6">
                        <TuningSlider
                            label="Sharpening"
                            value={localTuning.sharpness}
                            min={0} max={5} step={0.5}
                            onChange={(val) => handleChange('sharpness', val)}
                        />
                        <TuningSlider
                            label="Denoising"
                            value={localTuning.noise}
                            min={0} max={11} step={2}
                            onChange={(val) => handleChange('noise', val)}
                        />
                        <TuningSlider
                            label="Color Correction"
                            value={localTuning.color}
                            min={0} max={1} step={0.1}
                            onChange={(val) => handleChange('color', val)}
                        />
                        <TuningSlider
                            label="Contrast (CLAHE)"
                            value={localTuning.contrast}
                            min={0} max={5} step={0.5}
                            onChange={(val) => handleChange('contrast', val)}
                        />
                    </div>

                    <button
                        onClick={handleApply}
                        disabled={!isDirty}
                        className={`mt-8 w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isDirty
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Check className="w-4 h-4" /> Apply Changes
                    </button>

                    <p className="text-xs text-slate-400 mt-4 leading-relaxed text-center">
                        Adjust sliders and click apply to process the image.
                    </p>
                </div>
            </div>
        </div>
    );
}

function TuningSlider({ label, min, max, step, value, onChange }) {
    // Map -1 backend default to visually starting at 0 to eliminate confusion
    const displayValue = value === -1 ? 0 : value;

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{displayValue}</span>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={displayValue}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-indigo-100 accent-indigo-600"
            />
        </div>
    );
}
