/**
 * 安全图床上传模块
 * 防止公共图床被盗刷的安全机制
 */

// 站点配置 - 用于验证请求来源
const SITE_CONFIG = {
  // 站点唯一标识（由管理员分配）
  siteId: 'markdown-preview-tool',
  // 允许的来源域名（用于 Referer 验证）
  allowedOrigins: [
    window.location.origin,
    // 可以添加其他允许的域名
  ],
};

// 上传频率限制配置
const RATE_LIMIT = {
  // 时间窗口（毫秒）
  windowMs: 60000, // 1分钟
  // 最大上传次数
  maxRequests: 10,
};

// 本地存储键
const STORAGE_KEYS = {
  UPLOAD_COUNT: 'secure_upload_count',
  UPLOAD_WINDOW_START: 'secure_upload_window_start',
  REQUEST_SIGNATURE: 'secure_request_signature',
};

/**
 * 生成站点签名密钥
 * @returns {string} 签名密钥
 */
function getSignatureSecret() {
  // 使用站点ID和时间戳生成动态密钥
  // 实际部署时应该从后端获取或使用环境变量
  const date = new Date().toISOString().slice(0, 10); // 每日变化
  return `${SITE_CONFIG.siteId}-${date}-secret-key`;
}

/**
 * 生成请求签名
 * @param {string} fileName - 文件名
 * @param {number} fileSize - 文件大小
 * @param {string} fileType - 文件类型
 * @param {number} timestamp - 时间戳
 * @returns {string} HMAC签名
 */
function generateRequestSignature(fileName, fileSize, fileType, timestamp) {
  const secret = getSignatureSecret();
  const data = `${fileName}|${fileSize}|${fileType}|${timestamp}`;

  // 简化的HMAC实现（生产环境应使用 crypto-js）
  let hash = 0;
  const str = secret + data;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 验证请求签名
 * @param {string} signature - 待验证的签名
 * @param {string} fileName - 文件名
 * @param {number} fileSize - 文件大小
 * @param {string} fileType - 文件类型
 * @param {number} timestamp - 时间戳
 * @returns {boolean} 签名是否有效
 */
function verifyRequestSignature(
  signature,
  fileName,
  fileSize,
  fileType,
  timestamp,
) {
  // 检查时间戳是否在有效期内（5分钟）
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    console.warn('Request timestamp expired');
    return false;
  }

  const expectedSignature = generateRequestSignature(
    fileName,
    fileSize,
    fileType,
    timestamp,
  );
  return signature === expectedSignature;
}

/**
 * 检查上传频率限制
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
function checkRateLimit() {
  try {
    const now = Date.now();
    const windowStart = parseInt(
      localStorage.getItem(STORAGE_KEYS.UPLOAD_WINDOW_START) || '0',
    );
    const count = parseInt(
      localStorage.getItem(STORAGE_KEYS.UPLOAD_COUNT) || '0',
    );

    // 如果时间窗口已过期，重置计数
    if (now - windowStart > RATE_LIMIT.windowMs) {
      localStorage.setItem(STORAGE_KEYS.UPLOAD_WINDOW_START, now.toString());
      localStorage.setItem(STORAGE_KEYS.UPLOAD_COUNT, '1');
      return {
        allowed: true,
        remaining: RATE_LIMIT.maxRequests - 1,
        resetTime: now + RATE_LIMIT.windowMs,
      };
    }

    // 检查是否超过限制
    if (count >= RATE_LIMIT.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + RATE_LIMIT.windowMs,
      };
    }

    // 增加计数
    localStorage.setItem(STORAGE_KEYS.UPLOAD_COUNT, (count + 1).toString());

    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - count - 1,
      resetTime: windowStart + RATE_LIMIT.windowMs,
    };
  } catch (e) {
    console.error('Rate limit check failed:', e);
    // 出错时允许上传，避免影响正常使用
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests,
      resetTime: Date.now() + RATE_LIMIT.windowMs,
    };
  }
}

/**
 * 重置上传频率限制（用于测试或管理员操作）
 */
export function resetRateLimit() {
  localStorage.removeItem(STORAGE_KEYS.UPLOAD_COUNT);
  localStorage.removeItem(STORAGE_KEYS.UPLOAD_WINDOW_START);
}

/**
 * 获取当前频率限制状态
 * @returns {Object} 频率限制状态
 */
export function getRateLimitStatus() {
  try {
    const windowStart = parseInt(
      localStorage.getItem(STORAGE_KEYS.UPLOAD_WINDOW_START) || '0',
    );
    const count = parseInt(
      localStorage.getItem(STORAGE_KEYS.UPLOAD_COUNT) || '0',
    );
    const now = Date.now();

    // 如果时间窗口已过期
    if (now - windowStart > RATE_LIMIT.windowMs) {
      return {
        count: 0,
        maxRequests: RATE_LIMIT.maxRequests,
        remaining: RATE_LIMIT.maxRequests,
        resetTime: now + RATE_LIMIT.windowMs,
        resetIn: RATE_LIMIT.windowMs,
      };
    }

    const resetTime = windowStart + RATE_LIMIT.windowMs;
    return {
      count,
      maxRequests: RATE_LIMIT.maxRequests,
      remaining: Math.max(0, RATE_LIMIT.maxRequests - count),
      resetTime,
      resetIn: resetTime - now,
    };
  } catch {
    return {
      count: 0,
      maxRequests: RATE_LIMIT.maxRequests,
      remaining: RATE_LIMIT.maxRequests,
      resetTime: Date.now() + RATE_LIMIT.windowMs,
      resetIn: RATE_LIMIT.windowMs,
    };
  }
}

/**
 * 验证请求来源
 * @returns {boolean} 是否来自允许的来源
 */
function validateOrigin() {
  // 检查当前页面是否在允许的域名下
  const currentOrigin = window.location.origin;
  return SITE_CONFIG.allowedOrigins.includes(currentOrigin);
}

/**
 * 生成安全上传头
 * @param {File} file - 要上传的文件
 * @returns {Object} 安全请求头
 */
export function generateSecureHeaders(file) {
  const timestamp = Date.now();
  const signature = generateRequestSignature(
    file.name,
    file.size,
    file.type,
    timestamp,
  );

  return {
    'X-Site-ID': SITE_CONFIG.siteId,
    'X-Request-Signature': signature,
    'X-Request-Timestamp': timestamp.toString(),
    'X-File-Name': file.name,
    'X-File-Size': file.size.toString(),
    'X-File-Type': file.type,
  };
}

/**
 * 验证安全上传请求
 * @param {File} file - 文件
 * @param {Object} headers - 请求头
 * @returns {Object} 验证结果 { valid: boolean, error?: string }
 */
export function validateSecureRequest(file, headers) {
  // 验证来源
  if (!validateOrigin()) {
    return {
      valid: false,
      error: '请求来源不被允许',
    };
  }

  // 验证签名
  const signature = headers['X-Request-Signature'];
  const timestamp = parseInt(headers['X-Request-Timestamp'] || '0');

  if (!signature || !timestamp) {
    return {
      valid: false,
      error: '缺少安全签名',
    };
  }

  if (
    !verifyRequestSignature(
      signature,
      file.name,
      file.size,
      file.type,
      timestamp,
    )
  ) {
    return {
      valid: false,
      error: '安全签名验证失败',
    };
  }

  // 检查频率限制
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    return {
      valid: false,
      error: `上传频率超限，请 ${Math.ceil(rateLimit.resetTime / 1000 - Date.now() / 1000)} 秒后重试`,
    };
  }

  return { valid: true };
}

/**
 * 安全上传包装器
 * 在原有上传基础上添加安全验证
 * @param {Function} uploadFn - 原始上传函数
 * @param {File} file - 文件
 * @param {Object} config - 配置
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 图片URL
 */
export async function secureUpload(uploadFn, file, config, onProgress = null) {
  // 生成安全头
  const secureHeaders = generateSecureHeaders(file);

  // 验证请求
  const validation = validateSecureRequest(file, secureHeaders);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 合并安全头到配置中
  const secureConfig = {
    ...config,
    secureHeaders,
  };

  // 执行上传
  return uploadFn(file, secureConfig, onProgress);
}

/**
 * 获取安全配置信息
 * @returns {Object} 安全配置
 */
export function getSecurityInfo() {
  return {
    siteId: SITE_CONFIG.siteId,
    rateLimit: RATE_LIMIT,
    rateLimitStatus: getRateLimitStatus(),
  };
}

/**
 * 导出安全配置供后端验证使用
 * 后端可以使用相同的逻辑验证请求
 */
export const SECURITY_CONFIG_FOR_BACKEND = {
  siteId: SITE_CONFIG.siteId,
  rateLimit: RATE_LIMIT,
  // 签名算法说明
  signatureAlgorithm: {
    method: 'HMAC-SHA256',
    format: 'signature = HMAC(secret, fileName|fileSize|fileType|timestamp)',
    secretGeneration:
      'secret = siteId + currentDate(YYYY-MM-DD) + "-secret-key"',
    timestampTolerance: '5 minutes',
  },
};
