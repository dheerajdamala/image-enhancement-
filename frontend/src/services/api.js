import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

export const processImage = async (imageFile, tuningParams = {}) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    // Add tuning params if they exist (sharpness, noise, color, contrast)
    Object.keys(tuningParams).forEach(key => {
        formData.append(key, tuningParams[key]);
    });

    try {
        const response = await api.post('/process-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error processing image", error);
        throw error;
    }
};
