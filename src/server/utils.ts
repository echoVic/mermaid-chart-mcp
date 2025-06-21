/**
 * 工具函数模块
 * 包含输入校验、文件名清理等功能
 */

/**
 * 输入校验函数
 */
export function validateInput(params: {
  mermaidCode?: string;
  title?: string;
  theme?: string;
}): string | null {
  const { mermaidCode, title, theme } = params;

  // 验证Mermaid代码
  if (mermaidCode !== undefined) {
    if (typeof mermaidCode !== 'string') {
      return 'mermaidCode 必须是字符串';
    }
    if (mermaidCode.length === 0) {
      return 'mermaidCode 不能为空';
    }
    if (mermaidCode.length > 50000) {
      return 'mermaidCode 长度不能超过50000字符';
    }
    // 检查是否包含潜在的恶意内容
    if (/<script|javascript:|data:|vbscript:/i.test(mermaidCode)) {
      return 'mermaidCode 包含不安全的内容';
    }
  }

  // 验证标题
  if (title !== undefined) {
    if (typeof title !== 'string') {
      return 'title 必须是字符串';
    }
    if (title.length > 100) {
      return 'title 长度不能超过100字符';
    }
    // 过滤特殊字符
    if (/<|>|&|"|'|`/.test(title)) {
      return 'title 包含不允许的特殊字符';
    }
  }

  // 验证主题
  if (theme !== undefined) {
    if (typeof theme !== 'string') {
      return 'theme 必须是字符串';
    }
    const allowedThemes = ['default', 'dark', 'forest', 'neutral'];
    if (!allowedThemes.includes(theme)) {
      return `theme 必须是以下值之一: ${allowedThemes.join(', ')}`;
    }
  }

  return null;
}

/**
 * 清理文件名，移除不安全的字符
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')  // 保留中文、英文、数字、下划线、短横线
    .replace(/_{2,}/g, '_')  // 多个下划线替换为一个
    .substring(0, 50);  // 限制长度
}

/**
 * 生成安全的随机ID
 */
export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 检查字符串是否为有效的JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 转义HTML特殊字符
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
} 