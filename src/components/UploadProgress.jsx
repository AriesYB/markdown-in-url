import { useTranslation } from 'react-i18next';
import './UploadProgress.css';

export default function UploadProgress({ uploads, onCancelUpload }) {
  // 过滤出还在进行中的上传
  const visibleUploads = uploads.filter((u) => !u.completed);

  if (visibleUploads.length === 0) {
    return null;
  }

  return (
    <div className="upload-progress-container">
      {visibleUploads.map((upload) => (
        <UploadItem
          key={upload.id}
          upload={upload}
          onCancel={() => onCancelUpload(upload.id)}
        />
      ))}
    </div>
  );
}

function UploadItem({ upload, onCancel }) {
  const { t } = useTranslation();
  const { fileName, progress, status, error } = upload;
  const progressPercent = progress
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;

  return (
    <div className={`upload-item ${status}`}>
      <div className="upload-item-header">
        <span className="upload-file-name">{fileName}</span>
        {status === 'uploading' && (
          <button className="upload-cancel" onClick={onCancel}>
            {t('uploadProgress.cancelled')}
          </button>
        )}
        {status === 'success' && (
          <span className="upload-status-icon success">✓</span>
        )}
        {status === 'error' && (
          <span className="upload-status-icon error">✕</span>
        )}
      </div>

      {status === 'uploading' && (
        <div className="upload-progress-bar">
          <div
            className="upload-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <span className="upload-progress-text">{progressPercent}%</span>
        </div>
      )}

      {status === 'error' && error && (
        <div className="upload-error-message">{error}</div>
      )}

      {status === 'success' && (
        <div className="upload-success-message">
          {t('uploadProgress.uploadComplete')}
        </div>
      )}
    </div>
  );
}
