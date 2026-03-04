/**
 * Cloudflare Workers API 客户端
 * 用于图床上传和短URL功能
 */

import { decodeData } from './encoding';

// API 基础配置
const API_CONFIG = {
  // 默认 API 地址，用户可以在设置中修改
  baseUrl: 'https://d1.ntrbiss.top',
  // 允许的域名（前端域名，用于Referer验证和生成短链接）
  allowedDomain: 'https://md.ntrbiss.top',
  // 旧域名（用于迁移）
  oldBaseUrl: 'https://md.ntrbiss.top',
};

// 导出 API_CONFIG 供其他模块使用
export { API_CONFIG };

// 本地存储键
const STORAGE_KEY = 'cf-worker-config';

/**
 * 获取 API 配置
 * @returns {Object} API 配置
 */
export function getCloudflareConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // 如果存储的是旧域名，清除并使用新的默认值
      if (config.baseUrl === API_CONFIG.oldBaseUrl) {
        console.log('检测到旧域名配置，自动迁移到新域名');
        localStorage.removeItem(STORAGE_KEY);
        return { baseUrl: API_CONFIG.baseUrl };
      }
      return config;
    }
  } catch (e) {
    console.error('Failed to parse Cloudflare config:', e);
  }
  return { baseUrl: API_CONFIG.baseUrl };
}

/**
 * 保存 API 配置
 * @param {string} baseUrl - API 基础 URL
 */
export function saveCloudflareConfig(baseUrl) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl }));
  } catch (e) {
    console.error('Failed to save Cloudflare config:', e);
    throw e;
  }
}

/**
 * 清除 API 配置
 */
export function clearCloudflareConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 检查 API 是否已配置
 * @returns {boolean}
 */
export function isCloudflareConfigured() {
  const config = getCloudflareConfig();
  // 只要配置存在且 baseUrl 有效，就认为已配置
  return config && config.baseUrl && config.baseUrl.length > 0;
}

/**
 * 测试与 Worker 的连接
 * @returns {Promise<Object>} 测试结果
 */
export async function testConnection() {
  const config = getCloudflareConfig();

  try {
    const response = await fetch(`${config.baseUrl}/`, {
      method: 'GET',
      headers: {
        origin: API_CONFIG.allowedDomain,
        referer: `${API_CONFIG.allowedDomain}/`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `连接失败: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || '连接成功',
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error.message}`,
    };
  }
}

/**
 * 上传图片到 R2 存储
 * @param {File} file - 图片文件
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadImage(file) {
  const config = getCloudflareConfig();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${config.baseUrl}/upload`, {
    method: 'POST',
    headers: {
      origin: API_CONFIG.allowedDomain,
      referer: `${API_CONFIG.allowedDomain}/`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `上传失败: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '上传失败');
  }

  return result;
}

/**
 * 创建短码（字符串压缩）
 * @param {string} data - 已经压缩过的字符串数据
 * @param {number} ttl - 有效期（小时），不传则永久有效
 * @returns {Promise<Object>} 短码结果
 */
export async function createShortCode(data, ttl) {
  const config = getCloudflareConfig();

  const requestBody = { data };
  if (ttl !== undefined && ttl !== null) {
    requestBody.ttl = ttl;
  }

  const response = await fetch(`${config.baseUrl}/shorten`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: API_CONFIG.allowedDomain,
      referer: `${API_CONFIG.allowedDomain}/`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `创建短码失败: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '创建短码失败');
  }

  return result;
}

/**
 * 获取原始数据（通过短码）
 * @param {string} code - 短码
 * @returns {Promise<Object>} 原始数据结果
 */
export async function getOriginalData(code) {
  const config = getCloudflareConfig();

  const response = await fetch(`${config.baseUrl}/shorten/${code}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `获取原始数据失败: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '获取原始数据失败');
  }

  return result;
}

/**
 * 从短链接中提取短码
 * @param {string} shortUrl - 短链接 URL
 * @returns {string|null} 短码
 */
export function extractShortCode(shortUrl) {
  try {
    const url = new URL(shortUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || null;
  } catch (e) {
    console.error('Failed to extract short code:', e);
    return null;
  }
}

/**
 * 创建当前内容的短码
 * @param {string} content - Markdown 内容
 * @param {number} ttl - 有效期（小时）
 * @returns {Promise<string>} 短码
 */
export async function createContentShortCode(content, ttl = 24) {
  const result = await createShortCode(content, ttl);
  return result.code;
}

/**
 * 从短码加载内容
 * @param {string} code - 短码
 * @returns {Promise<string>} Markdown 内容
 */
export async function loadContentFromShortCode(code) {
  const result = await getOriginalData(code);
  // 后端返回的是压缩后的数据，需要先解压缩
  const decoded = decodeData(result.data);
  if (!decoded) {
    throw new Error('解压缩数据失败');
  }
  return decoded;
}

/**
 * 验证图片文件
 * @param {File} file - 图片文件
 * @returns {Object} 验证结果
 */
export function validateImageFile(file) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB (最大 10MB)`,
    };
  }

  return { valid: true };
}

/**
 * 上传图片并返回 Markdown 格式
 * @param {File} file - 图片文件
 * @returns {Promise<string>} Markdown 格式的图片链接
 */
export async function uploadImageAsMarkdown(file) {
  // 验证文件
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 上传图片
  const result = await uploadImage(file);
  return result.markdown;
}
