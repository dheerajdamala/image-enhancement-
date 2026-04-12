import axios from 'axios';

if (!import.meta.env.VITE_API_URL) {
    console.warn('[api.js] VITE_API_URL is not set. Falling back to http://localhost:5000');
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

/**
 * @param {File} imageFile
 * @param {object} tuningParams   - { sharpness, noise, color, contrast }
 * @param {string} outputFormat   - 'png' | 'jpeg' | 'webp'
 * @param {number} outputQuality  - 0–100 (used for jpeg / webp)
 * @param {number} targetSizeKb   - 0 = disabled; >0 = target file size in KB
 */
export const processImage = async (imageFile, tuningParams = {}, outputFormat = 'png', outputQuality = 90, targetSizeKb = 0) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('format', outputFormat);
    formData.append('quality', outputQuality);
    formData.append('target_size_kb', targetSizeKb);

    Object.keys(tuningParams).forEach(key => {
        formData.append(key, tuningParams[key]);
    });

    try {
        const response = await api.post('/process-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error processing image', error);
        throw error;
    }
};

