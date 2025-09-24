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
        className="border-2 border-dashed border-gray-400 rounded-lg p-6 md:p-8 mb-6 text-center cursor-pointer hover:bg-gray-50 transition"
      >
        <input {...getInputProps()} />
        <p className="text-gray-600 text-sm md:text-base">
          Drag & drop images here, or click to select files
        </p>
      </div>

      {/* Upload All Button */}
      <div className="flex justify-center md:justify-start mb-4">
        <button
          onClick={uploadAll}
          disabled={images.length === 0}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Upload All
        </button>
      </div>

      {/* Total Progress Bar */}
      {images.length > 0 && (
        <div className="w-full h-3 bg-gray-200 rounded mb-6">
          <div
            className="h-3 bg-green-500 rounded transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      )}

      {/* Gallery with Drag & Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="images" direction="horizontal">
          {(provided) => (
            <div
              className="flex flex-wrap gap-4"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {images.map((img, idx) => (
                <Draggable key={idx} draggableId={idx.toString()} index={idx}>
                  {(provided) => (
                    <div
                      className="relative w-36 h-36"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <img
                        src={img.preview}
                        alt={img.file.name}
                        className="w-full h-full object-cover rounded"
                      />

                      {/* Remove Button */}
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>

                      {/* Individual Progress Bar */}
                      {!img.uploaded && (
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded transition-all"
                          style={{ width: `${img.progress}%` }}
                        />
                      )}

                      {/* Uploaded Checkmark */}
                      {img.uploaded && (
                        <span className="absolute top-0 left-0 bg-green-500 text-white px-1 text-xs rounded">
                          ✅
                        </span>
                      )}
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
