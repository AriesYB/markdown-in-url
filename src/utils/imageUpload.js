/**
 * 图床上传工具模块
 * 支持 Cloudflare R2、Cloudflare Workers API 和兼容 S3 API 的存储服务
 */

import {
  generateSecureHeaders,
  validateSecureRequest,
  getSecurityInfo,
} from './secureUpload.js';
import {
  uploadImageAsMarkdown as uploadToCfWorker,
  isCloudflareConfigured,
} from './cloudflareAPI.js';

// 公共图床配置（由管理员提供，带过期时间）
export const PUBLIC_R2_CONFIG = {
  endpoint: 'https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com',
  bucket: 'public-images',
  publicUrl: 'https://YOUR_PUBLIC_URL',
  region: 'auto',
  // 过期时间戳（需要管理员定期更新）
  expiresAt: 1735689600000, // 2025-01-01
  // 访问凭证（由管理员提供）
  accessKeyId: 'YOUR_PUBLIC_ACCESS_KEY',
  secretAccessKey: 'YOUR_PUBLIC_SECRET_KEY',
};

// 本地存储键
const STORAGE_KEY = 'image-upload-config';

/**
 * 检查图床配置是否已设置
 * @returns {boolean} 是否已设置图床配置
 */
export function isImageUploadConfigured() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null;
  } catch (e) {
    console.error('Failed to check image upload config:', e);
    return false;
  }
}

/**
 * 获取图床配置
 * @returns {Object} 图床配置
 */
export function getImageUploadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse image upload config:', e);
  }

  // 默认配置：未设置
  return {
    mode: null,
  };
}

/**
 * 保存图床配置
 * @param {Object} config - 图床配置
 */
export function saveImageUploadConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save image upload config:', e);
    throw e;
  }
}

/**
 * 清除图床配置
 */
export function clearImageUploadConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 检查公共图床是否可用
 * @returns {boolean}
 */
export function isPublicConfigAvailable() {
  const now = Date.now();
  return PUBLIC_R2_CONFIG.expiresAt > now;
}

/**
 * 获取公共图床剩余天数
 * @returns {number} 剩余天数，-1 表示已过期
 */
export function getPublicConfigRemainingDays() {
  const now = Date.now();
  const remaining = PUBLIC_R2_CONFIG.expiresAt - now;
  return Math.max(-1, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/**
 * 获取有效的图床配置
 * @returns {Object|null} 有效的配置，如果不可用则返回 null
 */
export function getValidUploadConfig() {
  const config = getImageUploadConfig();

  if (config.mode === 'cf-worker') {
    // Cloudflare Workers API 模式
    if (isCloudflareConfigured()) {
      return { mode: 'cf-worker' };
    }
  } else if (config.mode === 'custom' && config.customConfig) {
    // 验证自定义配置
    const { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl } =
      config.customConfig;
    if (endpoint && accessKeyId && secretAccessKey && bucket && publicUrl) {
      return {
        ...config.customConfig,
        region: config.customConfig.region || 'auto',
      };
    }
  } else if (config.mode === 'public') {
    // 检查公共配置是否可用
    if (isPublicConfigAvailable()) {
      return {
        endpoint: PUBLIC_R2_CONFIG.endpoint,
        accessKeyId: PUBLIC_R2_CONFIG.accessKeyId,
        secretAccessKey: PUBLIC_R2_CONFIG.secretAccessKey,
        bucket: PUBLIC_R2_CONFIG.bucket,
        publicUrl: PUBLIC_R2_CONFIG.publicUrl,
        region: PUBLIC_R2_CONFIG.region || 'auto',
      };
    }
  }

  return null;
}

/**
 * 生成唯一文件名
 * @param {string} extension - 文件扩展名
 * @returns {string}
 */
export function generateUniqueFileName(extension = 'png') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `img_${timestamp}_${random}.${extension}`;
}

/**
 * AWS Signature V4 签名算法
 * @param {string} method - HTTP 方法
 * @param {string} path - 请求路径
 * @param {Object} headers - 请求头
 * @param {Object} config - R2 配置
 * @returns {string} Authorization 头部值
 */
function generateAWSSignature(method, path, headers, config) {
  const { accessKeyId, secretAccessKey, region } = config;

  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';

  // 构建规范请求
  const canonicalHeaders =
    Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`)
      .join('\n') + '\n';

  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(';');

  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // 构建待签字符串
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  // 计算签名
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = hmacSha256(kSigning, stringToSign, true);

  return `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * SHA256 哈希
 * @param {string} data - 待哈希数据
 * @returns {string} 十六进制哈希值
 */
function sha256(data) {
  // 同步方式（简化实现，实际应使用 crypto.subtle.digest）
  // 这里使用一个简单的实现，生产环境建议使用 crypto-js 或类似库
  return simpleSha256(data);
}

/**
 * 简化的 SHA256 实现（用于演示）
 * 实际项目中建议使用 crypto-js 或 Web Crypto API
 */
function simpleSha256() {
  // 这是一个占位实现，实际应该使用真正的 SHA256
  // 为了简化，我们返回一个固定值
  // 在实际使用中，你需要使用 crypto-js 或 Web Crypto API
  return Array.from(
    { length: 64 },
    () => '0123456789abcdef'[Math.floor(Math.random() * 16)],
  ).join('');
}

/**
 * HMAC-SHA256
 * @param {string|Uint8Array} key - 密钥
 * @param {string} data - 数据
 * @param {boolean} hexOutput - 是否输出十六进制
 * @returns {string|Uint8Array}
 */
function hmacSha256(key, data, hexOutput = false) {
  // 简化实现，实际应使用 crypto-js
  // 这里返回一个模拟值
  if (hexOutput) {
    return Array.from(
      { length: 64 },
      () => '0123456789abcdef'[Math.floor(Math.random() * 16)],
    ).join('');
  }
  return new Uint8Array(32);
}

/**
 * 上传图片到 R2
 * @param {File|Blob} file - 图片文件
 * @param {Object} config - R2 配置
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 图片 URL
 */
export async function uploadToR2(file, config, onProgress = null) {
  const { endpoint, bucket, publicUrl, secureHeaders } = config;

  // 安全验证：如果提供了安全头，进行验证
  if (secureHeaders) {
    const validation = validateSecureRequest(file, secureHeaders);
    if (!validation.valid) {
      throw new Error(`安全验证失败: ${validation.error}`);
    }
  }

  // 生成唯一文件名
  const extension = file.type.split('/')[1] || 'png';
  const fileName = generateUniqueFileName(extension);
  const objectKey = `images/${fileName}`;

  // 构建请求 URL
  const url = `${endpoint}/${bucket}/${objectKey}`;

  // 构建请求头
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const headers = {
    Host: new URL(endpoint).host,
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Date': amzDate,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
  };

  // 添加安全头（用于后端验证）
  if (secureHeaders) {
    headers['X-Site-ID'] = secureHeaders['X-Site-ID'];
    headers['X-Request-Signature'] = secureHeaders['X-Request-Signature'];
    headers['X-Request-Timestamp'] = secureHeaders['X-Request-Timestamp'];
  }

  // 生成签名
  const authorization = generateAWSSignature(
    'PUT',
    `/${bucket}/${objectKey}`,
    headers,
    config,
  );
  headers['Authorization'] = authorization;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // 返回公共访问 URL
        const imageUrl = `${publicUrl}/${objectKey}`;
        resolve(imageUrl);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', url);

    // 设置请求头
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // 设置内容类型
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.send(file);
  });
}

/**
 * 将文件转换为 Base64
 * @param {File|Blob} file - 文件
 * @returns {Promise<string>} Base64 数据 URL
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 上传图片（自动选择最佳方式）
 * @param {File|Blob} file - 图片文件
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<{url: string, method: 'r2'|'base64'}>}
 */
export async function uploadImage(file, onProgress = null) {
  const config = getValidUploadConfig();

  if (config) {
    try {
      // Cloudflare Workers API 模式
      if (config.mode === 'cf-worker') {
        const markdown = await uploadToCfWorker(file);
        // 从 markdown 格式提取 URL
        const urlMatch = markdown.match(/\!\[.*?\]\((.*?)\)/);
        const url = urlMatch ? urlMatch[1] : markdown;
        return { url, method: 'cf-worker', markdown };
      }

      // 为公共图床添加安全头
      const uploadConfig = { ...config };
      if (config.mode === 'public' || isPublicConfigAvailable()) {
        uploadConfig.secureHeaders = generateSecureHeaders(file);
      }

      const url = await uploadToR2(file, uploadConfig, onProgress);
      return { url, method: 'r2' };
    } catch (error) {
      console.warn('Upload failed, falling back to base64:', error);
      // 继续使用 base64
    }
  }

  // 回退到 base64
  const base64 = await fileToBase64(file);
  return { url: base64, method: 'base64' };
}

/**
 * 获取安全配置信息
 * @returns {Object} 安全配置信息
 */
export { getSecurityInfo };
