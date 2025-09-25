import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import type { DropResult } from "react-beautiful-dnd";

interface UploadedImage {
  file: File;
  preview: string;
  uploaded: boolean;
  progress: number;
}

export default function Upload() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
      progress: 0,
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const uploadFile = async (image: UploadedImage, index: number) => {
    const formData = new FormData();
    formData.append("file", image.file);

    try {
      await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total ?? 1;
          const percent = Math.round((progressEvent.loaded * 100) / total);

          setImages(prev => {
            const newImgs = [...prev];
            newImgs[index].progress = percent;

            const sum = newImgs.reduce((acc, img) => acc + img.progress, 0);
            setTotalProgress(Math.round(sum / newImgs.length));

            return newImgs;
          });
        },
      });

      setImages(prev => {
        const newImgs = [...prev];
        newImgs[index].uploaded = true;
        newImgs[index].progress = 100;
        const sum = newImgs.reduce((acc, img) => acc + img.progress, 0);
        setTotalProgress(Math.round(sum / newImgs.length));
        return newImgs;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const uploadAll = () => {
    images.forEach((img, idx) => uploadFile(img, idx));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Drag & Drop Reordering
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newImages = Array.from(images);
    const [moved] = newImages.splice(result.source.index, 1);
    newImages.splice(result.destination.index, 0, moved);

    setImages(newImages);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center md:text-left">
        📤 Upload Images
      </h1>

      {/* Drag & Drop Area */}
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
      >
        <input {...getInputProps()} />
        <p className="text-gray-500 text-lg font-medium mb-2">
          Drag & drop your images here, or click to select files
        </p>
        <p className="text-gray-400 text-sm">(Supports JPG, PNG, GIF, etc.)</p>
      </div>

      {/* Upload All Button */}
      <div className="flex justify-center md:justify-start mb-6">
        <button
          onClick={uploadAll}
          disabled={images.length === 0}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 ease-in-out"
        >
          Upload All ({images.length})
        </button>
      </div>

      {/* Total Progress Bar */}
      {images.length > 0 && (
        <div className="w-full h-4 bg-gray-200 rounded-full mb-6 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${totalProgress}%` }}
          >
            {totalProgress > 0 && `${totalProgress}%`}
          </div>
        </div>
      )}

      {/* Gallery with Drag & Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="images" direction="horizontal">
          {(provided) => (
            <div
              className="flex flex-wrap gap-4 justify-center md:justify-start"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {images.map((img, idx) => (
                <Draggable key={img.file.name} draggableId={img.file.name} index={idx}>
                  {(provided) => (
                    <div
                      className="relative w-40 h-40 bg-white rounded-lg shadow-lg overflow-hidden group transform hover:scale-105 transition-all duration-200 ease-in-out"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <img
                        src={img.preview}
                        alt={img.file.name}
                        className="w-full h-full object-cover rounded-lg"
                      />

                      {/* Remove Button */}
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out z-10 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                      >
                        ×
                      </button>

                      {/* Individual Progress Bar */}
                      {!img.uploaded && img.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
                          <div
                            className="h-full bg-blue-500 transition-all duration-200 ease-in-out"
                            style={{ width: `${img.progress}%` }}
                          ></div>
                        </div>
                      )}

                      {/* Uploaded Checkmark or Filename */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate flex items-center justify-between">
                        <span className="flex-grow truncate">{img.file.name}</span>
                        {img.uploaded && (
                          <span className="ml-1 text-green-400">✅</span>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
