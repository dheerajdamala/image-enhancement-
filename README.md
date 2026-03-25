# Adaptive Image Quality Assessment and Enhancement

This is a full-stack web application designed to automatically analyze image quality issues (blur, noise, low brightness) and generate an enhanced image using Digital Image Processing techniques.

## Prerequisites
- Node.js (v16+)
- Python 3.8+
- pip

## Project Structure
- `backend/`: Flask API with OpenCV and NumPy for image processing.
- `frontend/`: React application built with Vite and Tailwind CSS.

## 🚀 Setup Instructions

### 1. Backend Setup
Navigate to the `backend` directory, set up a virtual environment, and install dependencies.

```bash
cd backend
python -m venv venv
# Activate the virtual environment:
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the Flask server
python app.py
```
*The backend server will start on `http://127.0.0.1:5000`.*

### 2. Frontend Setup
Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the development server.

```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```
*The frontend will be available at `http://localhost:5173`.*

## Quality Assessment Logic
The system uses the following rule-based approach:
1. **Blur Detection & Correction**: Uses Variance of Laplacian to detect blur and applies a Laplacian Sharpening Kernel.
2. **Noise Detection & Correction**: Estimates image variations to classify between Gaussian and Salt & Pepper noise, applying Gaussian Blur or Median filtering respectively.
3. **Brightness Detection & Correction**: Analyzes mean pixel intensity and applies Contrast Limited Adaptive Histogram Equalization (CLAHE) if the image is too dark.

## Metrics
The application displays improvements calculated by:
- **Sharpness**: Variance of Laplacian.
- **Contrast**: Standard Deviation of grayscale pixel intensities.
