import React, { useState, useEffect, useCallback } from 'react';
import Upload from './components/Upload';
import Result from './components/Result';
import Metrics from './components/Metrics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { processImage } from './services/api';
import JSZip from 'jszip';
import {
    ImagePlus, RefreshCw, LayoutList, CheckCircle2, Circle,
    RotateCcw, Moon, Sun, Download, Info
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageDimensions(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// ── Component ────────────────────────────────────────────
function App() {
    const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const [loading, setLoading] = useState(false);
    const [pipelineStep, setPipelineStep] = useState('');
    const [error, setError] = useState(null);

    // Batch state: { id, originalFile, originalUrl, dims, result, status }
    const [images, setImages] = useState([]);
    const [activeImageId, setActiveImageId] = useState(null);

    const [tuning, setTuning] = useState({ sharpness: -1, noise: -1, color: -1, contrast: -1 });
    const [outputFormat, setOutputFormat] = useState('png');
    const [outputQuality, setOutputQuality] = useState(90);

    // ── Dark mode ──
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    // ── Keyboard shortcuts ──
    const activeIdx = images.findIndex(img => img.id === activeImageId);

    const handleKeyDown = useCallback((e) => {
        // Ignore if user is typing in an input/slider
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        if (e.key === 'ArrowRight' && activeIdx < images.length - 1) {
            setActiveImageId(images[activeIdx + 1].id);
        } else if (e.key === 'ArrowLeft' && activeIdx > 0) {
            setActiveImageId(images[activeIdx - 1].id);
        } else if (e.key === 'd' || e.key === 'D') {
            // Trigger download of active enhanced image
            const active = images[activeIdx];
            if (active?.result?.enhanced_image) {
                const link = document.createElement('a');
                const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
                link.href = active.result.enhanced_image;
                link.download = `pixelperfect-${active.originalFile.name.replace(/\.[^.]+$/, '')}.${ext}`;
                link.click();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            const active = images[activeIdx];
            if (active?.status === 'error') handleRetry(active);
        }
    }, [images, activeIdx, outputFormat]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // ── Upload ──
    const handleUpload = async (files) => {
        const newImages = await Promise.all(files.map(async f => ({
            id: crypto.randomUUID(),
            originalFile: f,
            originalUrl: URL.createObjectURL(f),
            dims: await getImageDimensions(f),
            result: null,
            status: 'pending'
        })));

        setImages(prev => [...prev, ...newImages]);
        if (!activeImageId) setActiveImageId(newImages[0].id);

        for (const img of newImages) {
            await processSingleImage(img.id, img.originalFile, tuning);
        }
    };

    // ── Process single ──
    const processSingleImage = async (id, file, currentTuning) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing' } : img));
        setLoading(true);
        setError(null);

        const steps = [
            { delay: 0, msg: 'Uploading image to server...' },
            { delay: 800, msg: 'Analysing blur & noise...' },
            { delay: 1600, msg: 'Applying adaptive filters...' },
            { delay: 2400, msg: 'Calculating final metrics...' },
        ];
        const timers = steps.map(({ delay, msg }) => setTimeout(() => setPipelineStep(msg), delay));

        try {
            const data = await processImage(file, currentTuning, outputFormat, outputQuality);
            setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'completed', result: data } : img));
        } catch (err) {
            setError(err.response?.data?.error || 'Error processing image.');
            setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error' } : img));
        } finally {
            timers.forEach(clearTimeout);
            setLoading(false);
            setPipelineStep('');
        }
    };

    const handleApplyTuning = (newTuning) => {
        setTuning(newTuning);
        const active = images.find(img => img.id === activeImageId);
        if (active) processSingleImage(active.id, active.originalFile, newTuning);
    };

    const handleOutputChange = ({ format, quality }) => {
        setOutputFormat(format);
        setOutputQuality(quality);
    };

    const handleRetry = (img) => {
        processSingleImage(img.id, img.originalFile, tuning);
        setActiveImageId(img.id);
    };

    const handleReset = () => {
        setImages([]); setActiveImageId(null); setError(null);
        setTuning({ sharpness: -1, noise: -1, color: -1, contrast: -1 });
        setOutputFormat('png'); setOutputQuality(90);
    };

    // ── Download All as ZIP ──
    const handleDownloadAll = async () => {
        const completed = images.filter(img => img.status === 'completed' && img.result?.enhanced_image);
        if (completed.length === 0) return;

        const zip = new JSZip();
        completed.forEach(img => {
            const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
            const base64 = img.result.enhanced_image.split(',')[1];
            const stem = img.originalFile.name.replace(/\.[^.]+$/, '');
            zip.file(`${stem}-enhanced.${ext}`, base64, { base64: true });
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pixelperfect-enhanced.zip';
        link.click();
        URL.revokeObjectURL(url);
    };

    const activeImage = images.find(img => img.id === activeImageId);
    const completedCount = images.filter(i => i.status === 'completed').length;

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-indigo-100 pb-20 transition-colors duration-300">
            {/* ── Header ── */}
            <header className="bg-[var(--header-bg)] border-b border-[var(--border)] sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-indigo-500 font-bold text-xl tracking-tight">
                        <ImagePlus className="w-6 h-6" />
                        <span className="hidden sm:inline">PixelPerfect Pro</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Keyboard shortcut hint */}
                        {images.length > 0 && (
                            <span className="hidden md:flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 select-none">
                                <kbd className="font-mono">←/→</kbd> navigate &nbsp;·&nbsp;
                                <kbd className="font-mono">D</kbd> download &nbsp;·&nbsp;
                                <kbd className="font-mono">R</kbd> retry
                            </span>
                        )}

                        {/* Download All */}
                        {completedCount > 1 && (
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5"
                            >
                                <Download className="w-4 h-4" /> Download All ({completedCount})
                            </button>
                        )}

                        {/* Clear All */}
                        {images.length > 0 && (
                            <button onClick={handleReset}
                                className="flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] hover:text-red-500 transition-colors">
                                <RefreshCw className="w-4 h-4" /> Clear All
                            </button>
                        )}

                        {/* Dark mode toggle */}
                        <button
                            onClick={() => setDark(d => !d)}
                            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">

                {/* Batch Sidebar */}
                {images.length > 0 && (
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <LayoutList className="w-5 h-5 text-indigo-500" /> Batch Queue
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                                {images.map(img => (
                                    <div key={img.id} className="relative group">
                                        <button
                                            onClick={() => setActiveImageId(img.id)}
                                            className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${activeImageId === img.id
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700'
                                                : 'hover:bg-[var(--bg)] border border-transparent text-[var(--text-muted)]'}`}
                                        >
                                            <img src={img.originalUrl} alt="thumb"
                                                className="w-10 h-10 object-cover rounded shadow-sm opacity-90 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" title={img.originalFile.name}>
                                                    {img.originalFile.name}
                                                </p>
                                                {/* Image info chip */}
                                                <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
                                                    <Info className="w-3 h-3" />
                                                    {img.dims ? `${img.dims.w}×${img.dims.h}` : '—'}
                                                    &nbsp;·&nbsp;{formatBytes(img.originalFile.size)}
                                                </p>
                                            </div>
                                            {img.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                            {img.status === 'processing' && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />}
                                            {img.status === 'error' && <Circle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                            {img.status === 'pending' && <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                                        </button>

                                        {/* Retry button */}
                                        {img.status === 'error' && (
                                            <button onClick={() => handleRetry(img)} title="Retry (R)"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded text-red-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    {!activeImage && images.length === 0 && (
                        <div className="max-w-2xl mx-auto mb-12 text-center pt-10">
                            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                                Pro <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Enhancement</span> Studio
                            </h1>
                            <p className="text-lg text-[var(--text-muted)] leading-relaxed max-w-xl mx-auto mb-8">
                                Batch processing, ROI cropping, manual tuning, and AI-driven quality assessment.
                            </p>
                            <Upload onUpload={handleUpload} />
                        </div>
                    )}

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 flex items-center justify-center font-medium">
                            {error}
                        </div>
                    )}

                    {activeImage && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                            {activeImage.status === 'processing' ? (
                                <div className="space-y-4">
                                    <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
                                        <div className="p-4 border-b border-[var(--border)] flex justify-between">
                                            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        </div>
                                        <div className="h-[500px] bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-750 dark:to-slate-800 animate-pulse flex flex-col items-center justify-center gap-4">
                                            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
                                            <p className="text-indigo-500 font-medium">{pipelineStep}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(i => <div key={i} className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />)}
                                    </div>
                                </div>
                            ) : activeImage.result ? (
                                <>
                                    <ErrorBoundary>
                                        <Result
                                            originalImage={activeImage.originalUrl}
                                            enhancedImage={activeImage.result.enhanced_image}
                                            analysis={activeImage.result.analysis}
                                            tuning={tuning}
                                            appliedTuning={activeImage.result.applied_tuning}
                                            onApplyTuning={handleApplyTuning}
                                            outputFormat={outputFormat}
                                            outputQuality={outputQuality}
                                            onOutputChange={handleOutputChange}
                                        />
                                    </ErrorBoundary>
                                    <ErrorBoundary>
                                        <Metrics metrics={activeImage.result.metrics} />
                                    </ErrorBoundary>
                                </>
                            ) : (
                                <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border)] p-12 text-center text-[var(--text-muted)] h-96 flex items-center justify-center">
                                    <p className="animate-pulse">Waiting in queue...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
