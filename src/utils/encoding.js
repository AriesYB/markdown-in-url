import LZString from 'lz-string';

/**
 * 使用 LZString 压缩数据为 URL 安全格式
 * @param {string} markdown - Markdown 内容
 * @returns {string|null} 压缩后的字符串
 */
export function encodeData(markdown) {
  try {
    return LZString.compressToEncodedURIComponent(markdown);
  } catch {
    return null;
  }
}

/**
 * 从 URL 安全格式解压数据
 * @param {string} encoded - 压缩后的字符串
 * @returns {string|null} 解压后的 Markdown 内容
 */
export function decodeData(encoded) {
  try {
    return LZString.decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
}

/**
 * HTML 转义
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的 HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
