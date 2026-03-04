import JSZip from 'jszip';

/**
 * 从 Markdown 内容中提取 base64 图片
 * @param {string} markdown - Markdown 内容
 * @returns {Object} { processedMarkdown, images }
 *   - processedMarkdown: 替换后的 Markdown 内容
 *   - images: 图片数组 [{ name, data, mimeType }]
 */
export function extractBase64Images(markdown) {
  // 匹配 ![alt](data:image/...) 格式的 base64 图片
  const base64ImageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;

  const images = [];
  let processedMarkdown = markdown;
  let imageIndex = 0;

  let match;
  while ((match = base64ImageRegex.exec(markdown)) !== null) {
    const [fullMatch, alt, dataUrl] = match;

    // 解析 data URL
    const [mimeType, base64Data] = dataUrl.split(';base64,');
    const extension = mimeType.split('/')[1] || 'png';

    // 生成图片文件名
    const imageName =
      alt && alt !== '粘贴图片'
        ? `${alt.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${extension}`
        : `image_${imageIndex + 1}.${extension}`;

    // 将 base64 转换为二进制数据
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    images.push({
      name: imageName,
      data: bytes,
      mimeType,
    });

    // 替换 Markdown 中的图片链接为相对路径
    const relativePath = `./images/${imageName}`;
    processedMarkdown = processedMarkdown.replace(
      fullMatch,
      `![${alt}](${relativePath})`,
    );

    imageIndex++;
  }

  return {
    processedMarkdown,
    images,
  };
}

/**
 * 导出 Markdown 为 ZIP 压缩包
 * @param {string} markdown - Markdown 内容
 * @param {string} fileName - 导出的文件名（不含扩展名）
 * @returns {Promise<void>}
 */
export async function exportMarkdownAsZip(markdown, fileName = 'document') {
  const { processedMarkdown, images } = extractBase64Images(markdown);

  const zip = new JSZip();

  // 添加 Markdown 文件
  zip.file(`${fileName}.md`, processedMarkdown);

  // 如果有 base64 图片，添加到 images 文件夹
  if (images.length > 0) {
    const imagesFolder = zip.folder('images');
    images.forEach((image) => {
      imagesFolder.file(image.name, image.data);
    });
  }

  // 生成 ZIP 文件
  const blob = await zip.generateAsync({ type: 'blob' });

  // 下载文件
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 检查 Markdown 是否包含 base64 图片
 * @param {string} markdown - Markdown 内容
 * @returns {boolean}
 */
export function hasBase64Images(markdown) {
  const base64ImageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
  return base64ImageRegex.test(markdown);
}
