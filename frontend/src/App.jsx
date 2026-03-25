import React, { useState } from 'react';
import Upload from './components/Upload';
import Result from './components/Result';
import Metrics from './components/Metrics';
import { processImage } from './services/api';
import { ImagePlus, RefreshCw, LayoutList, CheckCircle2, Circle } from 'lucide-react';

function App() {
    const [loading, setLoading] = useState(false);
    const [pipelineStep, setPipelineStep] = useState('');
    const [error, setError] = useState(null);

    // Batch processing state
    const [images, setImages] = useState([]); // { id, originalFile, originalUrl, result, status }
    const [activeImageId, setActiveImageId] = useState(null);

    // Tuning Parameters
    const [tuning, setTuning] = useState({
        sharpness: -1,
        noise: -1,
        color: -1,
        contrast: -1
    });

    const handleUpload = async (files) => {
        // files is an array of files or cropped blobs
        const newImages = files.map(f => ({
            id: Math.random().toString(36).substring(7),
            originalFile: f,
            originalUrl: URL.createObjectURL(f),
            result: null,
            status: 'pending' // pending, processing, completed, error
        }));

        setImages(prev => [...prev, ...newImages]);
        if (!activeImageId) setActiveImageId(newImages[0].id);

        // Process them sequentially
        for (const img of newImages) {
            await processSingleImage(img.id, img.originalFile, img.originalUrl, tuning);
        }
    };

    const processSingleImage = async (id, file, url, currentTuning) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing' } : img));
        setLoading(true);
        setPipelineStep('Uploading image to server...');
        setError(null);

        try {
            // Simulate Pipeline Visualization
            setTimeout(() => setPipelineStep('Analyzing Blur and Noise...'), 800);
            setTimeout(() => setPipelineStep('Applying Digital Filters...'), 1600);
            setTimeout(() => setPipelineStep('Calculating Final Metrics...'), 2400);

            const data = await processImage(file, currentTuning);

            setImages(prev => prev.map(img => img.id === id ? {
                ...img,
                status: 'completed',
                result: data
            } : img));
        } catch (err) {
            setError(err.response?.data?.error || "Error processing image.");
            setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error' } : img));
        } finally {
            setLoading(false);
            setPipelineStep('');
        }
    };

    const handleApplyTuning = (newTuning) => {
        setTuning(newTuning);

        // Re-process the active image with new tuning
        const activeImg = images.find(img => img.id === activeImageId);
        if (activeImg) {
            processSingleImage(activeImg.id, activeImg.originalFile, activeImg.originalUrl, newTuning);
        }
    };

    const handleReset = () => {
        setImages([]);
        setActiveImageId(null);
        setError(null);
        setTuning({ sharpness: -1, noise: -1, color: -1, contrast: -1 });
    };

    const activeImage = images.find(img => img.id === activeImageId);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 pb-20">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
                        <ImagePlus className="w-6 h-6" />
                        <span className="hidden sm:inline">PixelPerfect Pro</span>
                    </div>
                    <div className="text-sm font-medium text-slate-500 flex items-center gap-4">
                        {images.length > 0 && (
                            <button onClick={handleReset} className="flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors">
                                <RefreshCw className="w-4 h-4" /> Clear All
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">

                {/* Left Sidebar: Batch List */}
                {images.length > 0 && (
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                                <LayoutList className="w-5 h-5 text-indigo-500" /> Batch Queue
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setActiveImageId(img.id)}
                                        className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${activeImageId === img.id ? 'bg-indigo-50 border border-indigo-200 text-indigo-800' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}
                                    >
                                        <img src={img.originalUrl} alt="thumb" className="w-10 h-10 object-cover rounded shadow-sm opacity-90" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">Image {idx + 1}</p>
                                            <p className="text-xs opacity-70 capitalize">{img.status}</p>
                                        </div>
                                        {img.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                                            img.status === 'processing' ? <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" /> :
                                                img.status === 'error' ? <Circle className="w-4 h-4 text-red-500" /> :
                                                    <Circle className="w-4 h-4 text-slate-300" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {!activeImage && images.length === 0 && (
                        <div className="max-w-2xl mx-auto mb-12 text-center pt-10">
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                                Pro <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Enhancement</span> Studio
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mx-auto mb-8">
                                Batch processing, ROI cropping, manual tuning controls, and dynamic AI-driven quality assessment.
                            </p>
                            <Upload onUpload={handleUpload} />
                        </div>
                    )}

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center justify-center font-medium">
                            {error}
                        </div>
                    )}

                    {activeImage && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                            {activeImage.status === 'processing' ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-96 flex flex-col items-center justify-center">
                                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">Processing Image...</h3>
                                    <p className="text-indigo-600 font-medium animate-pulse">{pipelineStep}</p>
                                </div>
                            ) : activeImage.result ? (
                                <>
                                    <Result
                                        originalImage={activeImage.originalUrl}
                                        enhancedImage={activeImage.result.enhanced_image}
                                        analysis={activeImage.result.analysis}
                                        tuning={tuning}
                                        onApplyTuning={handleApplyTuning}
                                    />
                                    <Metrics metrics={activeImage.result.metrics} />
                                </>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 h-96 flex items-center justify-center">
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
