import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Crop, X } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function Upload({ onUpload }) {
    const [dragActive, setDragActive] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);

    // Crop state
    const [cropFile, setCropFile] = useState(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files) => {
        const valid = files.filter(f => f.type.startsWith('image/'));
        if (valid.length === 0) {
            alert("Please upload valid image files.");
            return;
        }

        // If single file, offer cropping
        if (valid.length === 1) {
            setCropFile(URL.createObjectURL(valid[0]));
            setPendingFiles(valid);
        } else {
            // Batch upload straight away
            onUpload(valid);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width,
            height
        ));
    };

    const generateCropBlob = async () => {
        if (!completedCrop || !imgRef.current) {
            // If no crop, just upload the original file
            onUpload(pendingFiles);
            cancelCrop();
            return;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY
        );

        canvas.toBlob((blob) => {
            if (!blob) {
                onUpload(pendingFiles);
                return;
            }
            const croppedFile = new File([blob], pendingFiles[0].name, { type: 'image/jpeg' });
            onUpload([croppedFile]);
            cancelCrop();
        }, 'image/jpeg');
    };

    const cancelCrop = () => {
        setCropFile(null);
        setCrop(undefined);
        setCompletedCrop(null);
        setPendingFiles([]);
    };

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-left">
            {!cropFile ? (
                <div className="p-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-indigo-500" />
                        Upload Images
                    </h2>
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ease-in-out ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            id="image-upload"
                            accept="image/*"
                            onChange={handleChange}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-slate-700">Click to upload or drag and drop</p>
                                <p className="text-sm text-slate-500 mt-1">Supports batch upload. Select 1 file for ROI Crop options.</p>
                            </div>
                        </label>
                    </div>
                </div>
            ) : (
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                            <Crop className="w-6 h-6 text-indigo-500" /> Optional ROI Crop
                        </h2>
                        <button onClick={cancelCrop} className="text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-4 max-h-[500px]">
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={cropFile}
                                onLoad={onImageLoad}
                                className="max-h-[450px] object-contain"
                            />
                        </ReactCrop>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                        <p className="text-sm text-slate-500">Drag to crop a specific Region of Interest, or skip to enhance the full image.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { onUpload(pendingFiles); cancelCrop(); }}
                                className="px-5 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                            >
                                Skip Crop
                            </button>
                            <button
                                onClick={generateCropBlob}
                                className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Enhance Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
