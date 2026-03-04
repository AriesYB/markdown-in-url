import { useState, useRef } from 'react';

/**
 * 上传管理 Hook
 * 用于管理多个文件上传的状态
 */
export function useUploadManager() {
  const uploadsRef = useRef(new Map());
  const [uploads, setUploads] = useState([]);
  const idCounterRef = useRef(0);

  const addUpload = (fileName) => {
    const id = ++idCounterRef.current;
    const upload = {
      id,
      fileName,
      status: 'uploading',
      progress: { loaded: 0, total: 100 },
      completed: false,
    };
    uploadsRef.current.set(id, upload);
    setUploads(Array.from(uploadsRef.current.values()));
    return id;
  };

  const updateUploadProgress = (id, loaded, total) => {
    const upload = uploadsRef.current.get(id);
    if (upload) {
      upload.progress = { loaded, total };
      setUploads(Array.from(uploadsRef.current.values()));
    }
  };

  const completeUpload = (id, success, error = null) => {
    const upload = uploadsRef.current.get(id);
    if (upload) {
      upload.status = success ? 'success' : 'error';
      upload.error = error;
      upload.completed = true;
      setUploads(Array.from(uploadsRef.current.values()));

      // 3秒后移除已完成的上传
      setTimeout(() => {
        uploadsRef.current.delete(id);
        setUploads(Array.from(uploadsRef.current.values()));
      }, 3000);
    }
  };

  const cancelUpload = (id) => {
    const upload = uploadsRef.current.get(id);
    if (upload && upload.xhr) {
      upload.xhr.abort();
    }
    uploadsRef.current.delete(id);
    setUploads(Array.from(uploadsRef.current.values()));
  };

  const setUploadXhr = (id, xhr) => {
    const upload = uploadsRef.current.get(id);
    if (upload) {
      upload.xhr = xhr;
    }
  };

  return {
    uploads,
    addUpload,
    updateUploadProgress,
    completeUpload,
    cancelUpload,
    setUploadXhr,
  };
}
