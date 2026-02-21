import ReplaceRule from "../../models/ReplaceRule";

interface ParsedRule {
  original: string;
  replacement: string;
}

class ReplaceUtil {
  /**
   * 解析替换规则文本，静默跳过错误格式
   * @param rulesText 多行文本规则，格式：原文->替换内容
   * @returns 解析后的规则数组
   */
  static parseRules(rulesText: string): ParsedRule[] {
    if (!rulesText || !rulesText.trim()) {
      return [];
    }

    const rules: ParsedRule[] = [];
    const lines = rulesText.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过空行
      if (!trimmed) continue;

      // 跳过不包含 -> 的行
      if (!trimmed.includes("->")) continue;

      const parts = trimmed.split("->");

      // 跳过格式错误的行（多个 -> 或其他问题）
      if (parts.length !== 2) continue;

      const original = parts[0].trim();
      const replacement = parts[1].trim();

      // 跳过原文为空的规则
      if (!original) continue;

      rules.push({ original, replacement });
    }

    return rules;
  }

  /**
   * 从数据库记录构建解析后的规则列表
   * @param replaceRules 数据库中的替换规则记录
   * @returns 解析后的规则数组
   */
  static buildParsedRules(replaceRules: ReplaceRule[]): ParsedRule[] {
    const allRules: ParsedRule[] = [];

    for (const rule of replaceRules) {
      if (!rule.isEnabled) continue;
      const parsed = this.parseRules(rule.rules);
      allRules.push(...parsed);
    }

    return allRules;
  }

  /**
   * 应用替换规则到文本
   * @param text 原始文本
   * @param rules 解析后的规则数组
   * @returns 替换后的文本
   */
  static applyRules(text: string, rules: ParsedRule[]): string {
    if (!text || rules.length === 0) {
      return text;
    }

    let result = text;

    for (const rule of rules) {
      try {
        // 转义特殊字符，创建全局正则
        const escaped = rule.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "g");
        result = result.replace(regex, rule.replacement);
      } catch (error) {
        // 静默跳过正则错误
        console.warn("Replace rule error:", error);
        continue;
      }
    }

    return result;
  }

  /**
   * 构建用于 parserRegex 的字符串（如果 kookit 支持）
   * 注意：这个方法的具体格式需要根据 kookit 库的实际 API 调整
   * @param rules 解析后的规则数组
   * @returns parserRegex 配置字符串
   */
  static buildParserRegex(rules: ParsedRule[]): string {
    if (rules.length === 0) {
      return "";
    }

    // 假设格式：原文1===>替换1|||原文2===>替换2
    // 实际格式需要查看 kookit 文档
    return rules
      .map((rule) => {
        const escaped = rule.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return `${escaped}===>${rule.replacement}`;
      })
      .join("|||");
  }

  /**
   * 验证规则文本格式
   * @param rulesText 规则文本
   * @returns 有效规则数量
   */
  static validateRules(rulesText: string): number {
    return this.parseRules(rulesText).length;
  }

  /**
   * 反向查找：根据替换后的词找到原始词
   * 用于搜索功能，当用户搜索替换后的词时，同时搜索原始词
   * @param searchTerm 用户搜索的词（可能是替换后的词）
   * @param rules 解析后的规则数组
   * @returns 原始词数组（如果存在替换规则）
   */
  static reverseSearch(searchTerm: string, rules: ParsedRule[]): string[] {
    const originalTerms: string[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    for (const rule of rules) {
      // 检查搜索词是否包含替换后的内容
      if (rule.replacement.toLowerCase().includes(lowerSearchTerm) ||
          lowerSearchTerm.includes(rule.replacement.toLowerCase())) {
        // 如果替换后的词与搜索词匹配，添加原始词
        if (rule.replacement.toLowerCase() === lowerSearchTerm) {
          originalTerms.push(rule.original);
        }
      }
      // 也检查精确匹配
      if (rule.replacement === searchTerm) {
        if (!originalTerms.includes(rule.original)) {
          originalTerms.push(rule.original);
        }
      }
    }

    return originalTerms;
  }

  /**
   * 对搜索结果应用替换规则（用于显示）
   * @param text 原始搜索结果文本
   * @param rules 解析后的规则数组
   * @returns 替换后的文本
   */
  static applyRulesToSearchResult(text: string, rules: ParsedRule[]): string {
    return this.applyRules(text, rules);
  }
}

export default ReplaceUtil;
