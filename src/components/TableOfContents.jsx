import { useEffect, useRef } from 'react';
import './TableOfContents.css';

export default function TableOfContents({
  headings,
  activeId,
  onHeadingClick,
  isVisible,
}) {
  const tocRef = useRef(null);

  useEffect(() => {
    if (tocRef.current && activeId) {
      const activeElement = tocRef.current.querySelector(
        `[data-target="${activeId}"]`,
      );
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeId]);

  return (
    <div className={`toc ${isVisible ? '' : 'hidden'}`} ref={tocRef}>
      <div className="toc-header">
        <span className="toc-title">目录</span>
        <button className="toc-close" onClick={() => onHeadingClick(null)}>
          &times;
        </button>
      </div>
      <div className="toc-content">
        {headings.length === 0 ? (
          <div
            style={{
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            暂无目录
          </div>
        ) : (
          headings.map((heading) => (
            <a
              key={heading.id}
              className={`toc-item toc-level-${heading.level} ${activeId === heading.id ? 'active' : ''}`}
              data-target={heading.id}
              title={heading.text}
              onClick={(e) => {
                e.preventDefault();
                onHeadingClick(heading.id);
              }}
            >
              {heading.text}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
