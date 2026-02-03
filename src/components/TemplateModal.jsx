import { templates } from '../data/templates';
import './TemplateModal.css';

export default function TemplateModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>选择模板</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="template-list">
            {templates.map((template, index) => (
              <div
                key={index}
                className="template-item"
                onClick={() => onSelect(index)}
              >
                <h3>{template.name}</h3>
                <p>{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
