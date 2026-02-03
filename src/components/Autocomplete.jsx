import { useEffect, useRef } from 'react';
import './Autocomplete.css';

export default function Autocomplete({
  items,
  group,
  visible,
  activeIndex,
  onSelect,
  position,
}) {
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (autocompleteRef.current && activeIndex >= 0) {
      const activeElement = autocompleteRef.current.querySelector(
        `[data-index="${activeIndex}"]`,
      );
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!visible || !items || items.length === 0) return null;

  return (
    <div
      className="autocomplete"
      ref={autocompleteRef}
      style={{
        top: `${position.top + 20}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="autocomplete-group">{group}</div>
      {items.map((item, index) => (
        <div
          key={index}
          className={`autocomplete-item ${activeIndex === index ? 'active' : ''}`}
          data-index={index}
          onClick={() => onSelect(index)}
        >
          <span className="autocomplete-item-icon">{item.icon}</span>
          <div className="autocomplete-item-content">
            <div className="autocomplete-item-title">{item.title}</div>
            <div className="autocomplete-item-desc">{item.desc}</div>
          </div>
          <span className="autocomplete-item-preview">
            {item.insert.substring(0, 20)}
            {item.insert.length > 20 ? '...' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
