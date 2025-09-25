import { useState, useEffect } from "react";
import axios from "axios";

interface ImageItem {
  originalName: string;
  currentSrc: string;
  currentFilename: string;
  recommendations: string[];
}

export default function Edit() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [edits, setEdits] = useState({ brightness: 1, contrast: 1, vibrancy: 1, grayscale: 0 });

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get<string[]>("http://localhost:5000/api/images");
        const fetchedImageNames = response.data;

        const imagesWithRecommendations = await Promise.all(
          fetchedImageNames.map(async (name) => {
            try {
              const analysisResponse = await axios.get<{ filename: string; recommendations: string[] }>(`http://localhost:5000/api/analyze/${name}`);
              return {
                originalName: name,
                currentSrc: `http://localhost:5000/uploads/${name}`,
                currentFilename: name,
                recommendations: analysisResponse.data.recommendations,
              };
            } catch (analysisErr) {
              console.error(`Error fetching recommendations for ${name}:`, analysisErr);
              return {
                originalName: name,
                currentSrc: `http://localhost:5000/uploads/${name}`,
                currentFilename: name,
                recommendations: ["Failed to get recommendations"],
              };
            }
          })
        );
        setImages(imagesWithRecommendations);
        if (imagesWithRecommendations.length > 0) {
          setSelectedImage(imagesWithRecommendations[0]);
        }
      } catch (err) {
        setError("Failed to fetch images.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleApplyRecommendation = (recommendationType: string) => {
    if (!selectedImage) return;

    let newEdits = { ...edits };

    switch (recommendationType) {
      case "brightness":
        const brightnessRec = selectedImage.recommendations.find(rec => rec.includes("brightness"));
        if (brightnessRec?.includes("underexposed")) {
          newEdits.brightness = 1.2;
        } else if (brightnessRec?.includes("overexposed")) {
          newEdits.brightness = 0.8;
        }
        break;
      case "contrast":
        newEdits.contrast = 1.2;
        break;
      // Vibrancy/Saturation is not implemented as a slider yet.
      default:
        console.error("Unknown recommendation type:", recommendationType);
        return;
    }
    setEdits(newEdits);
  };

  const handleSaveChanges = async () => {
    if (!selectedImage) return;

    try {
      const response = await axios.post<{ filename: string }>(
        "http://localhost:5000/api/edit/apply-all",
        { filename: selectedImage.currentFilename, edits }
      );
      const newEditedFilename = response.data.filename;

      setImages(prevImages =>
        prevImages.map(img =>
          img.originalName === selectedImage.originalName
            ? { ...img, currentSrc: `http://localhost:5000/edited_images/${newEditedFilename}`, currentFilename: newEditedFilename }
            : img
        )
      );
      setSelectedImage(prev => prev ? { ...prev, currentSrc: `http://localhost:5000/edited_images/${newEditedFilename}`, currentFilename: newEditedFilename } : null);
      setEdits({ brightness: 1, contrast: 1, vibrancy: 1, grayscale: 0 });

    } catch (err) {
      console.error("Error saving changes:", err);
      alert("Failed to save changes.");
    }
  };

  if (loading) {
    return <h1 className="text-xl">Loading images...</h1>;
  }

  if (error) {
    return <h1 className="text-xl text-red-500">Error: {error}</h1>;
  }

  const imageStyle = {
    filter: `brightness(${edits.brightness}) contrast(${edits.contrast}) grayscale(${edits.grayscale})`,
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Thumbnails Gallery (Left) */}
      <div className="w-48 bg-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Images</h2>
        <div className="flex flex-col space-y-2">
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative flex-shrink-0 border-2 rounded-lg overflow-hidden shadow-sm cursor-pointer ${selectedImage?.originalName === image.originalName ? 'border-blue-500' : 'border-gray-300'}`}
              onClick={() => {
                setSelectedImage(image);
                setEdits({ brightness: 1, contrast: 1, vibrancy: 1, grayscale: 0 });
              }}
            >
              <img
                src={image.currentSrc}
                alt={image.originalName}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold">
                {image.originalName}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area (Center) */}
      <div className="flex-grow p-6 flex flex-col">
        <h1 className="text-3xl font-bold mb-6">🖌️ Edit Images</h1>

        {images.length === 0 ? (
          <p className="text-gray-600">No images uploaded yet. Go to the Upload page to add some!</p>
        ) : (
          <div className="flex flex-col h-full">
            {/* Main Image Display */}
            <div className="flex-grow flex items-center justify-center bg-gray-200 rounded-lg mb-6 p-4" style={{ height: '70vh' }}>
              {selectedImage ? (
                <img
                  src={selectedImage.currentSrc}
                  alt={selectedImage.originalName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  style={imageStyle}
                />
              ) : (
                <p className="text-gray-500">Select an image to start editing</p>
              )}
            </div>

            {/* AI Recommendations for Selected Image */}
            {selectedImage && selectedImage.recommendations.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">AI Recommendations for {selectedImage.originalName}:</h3>
                <ul className="list-disc list-inside text-xs text-gray-600">
                  {selectedImage.recommendations.map((rec, i) => (
                    <li key={i} className="flex justify-between items-center mb-1">
                      <span>{rec}</span>
                      {rec.includes("brightness") && (
                        <button
                          onClick={() => handleApplyRecommendation("brightness")}
                          className="ml-2 bg-blue-500 text-white px-2 py-0.5 text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          Apply
                        </button>
                      )}
                      {rec.includes("contrast") && (
                        <button
                          onClick={() => handleApplyRecommendation("contrast")}
                          className="ml-2 bg-blue-500 text-white px-2 py-0.5 text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          Apply
                        </button>
                      )}
                      {rec.includes("vibrancy") && (
                        <button
                          onClick={() => handleApplyRecommendation("vibrancy")}
                          className="ml-2 bg-blue-500 text-white px-2 py-0.5 text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          Apply
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustment Bar (Right) */}
      <div className="w-80 bg-white p-4 shadow-lg flex-shrink-0 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Adjustments</h2>
        {selectedImage ? (
          <div className="space-y-4">
            <div className="mb-4">
              <label htmlFor="brightness" className="block text-sm font-medium text-gray-700">Brightness</label>
              <input
                type="range"
                id="brightness"
                min="0.5"
                max="1.5"
                step="0.01"
                value={edits.brightness}
                onChange={(e) => setEdits({ ...edits, brightness: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="contrast" className="block text-sm font-medium text-gray-700">Contrast</label>
              <input
                type="range"
                id="contrast"
                min="0.5"
                max="1.5"
                step="0.01"
                value={edits.contrast}
                onChange={(e) => setEdits({ ...edits, contrast: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="grayscale" className="block text-sm font-medium text-gray-700">Grayscale</label>
              <input
                type="range"
                id="grayscale"
                min="0"
                max="1"
                step="0.01"
                value={edits.grayscale}
                onChange={(e) => setEdits({ ...edits, grayscale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <button
              onClick={handleSaveChanges}
              className="w-full bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select an image to enable adjustments.</p>
        )}
      </div>
    </div>
  );
}
