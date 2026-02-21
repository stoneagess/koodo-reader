import React from "react";
import "./replaceList.css";
import { ReplaceListProps, ReplaceListState } from "./interface";
import { Trans } from "react-i18next";
import DatabaseService from "../../../utils/storage/databaseService";
import ReplaceRule from "../../../models/ReplaceRule";
import ReplaceUtil from "../../../utils/reader/replaceUtil";

class ReplaceList extends React.Component<ReplaceListProps, ReplaceListState> {
  constructor(props: ReplaceListProps) {
    super(props);
    this.state = {
      scope: "current",
      rulesText: "",
      isDirty: false,
      savedRulesText: "",
    };
  }

  async componentDidMount() {
    await this.loadReplaceRules();
  }

  async componentWillReceiveProps(nextProps: ReplaceListProps) {
    // 当切换书籍时重新加载规则
    if (nextProps.currentBook.key !== this.props.currentBook.key) {
      await this.loadReplaceRules();
    }
  }

  // 加载当前书籍的替换规则
  loadReplaceRules = async () => {
    try {
      // 先尝试加载书籍专属规则
      const bookRules: ReplaceRule[] = await DatabaseService.getAllRecords(
        "replaceRules"
      ).then((rules: ReplaceRule[]) =>
        rules.filter(
          (r) => r.bookKey === this.props.currentBook.key && r.scope === "current"
        )
      );

      if (bookRules.length > 0) {
        const rule = bookRules[0];
        this.setState({
          scope: "current",
          rulesText: rule.rules,
          savedRulesText: rule.rules,
          isDirty: false,
        });
        return;
      }

      // 如果没有书籍专属规则，尝试加载全局规则
      const globalRules: ReplaceRule[] = await DatabaseService.getAllRecords(
        "replaceRules"
      ).then((rules: ReplaceRule[]) => rules.filter((r) => r.scope === "all"));

      if (globalRules.length > 0) {
        const rule = globalRules[0];
        this.setState({
          scope: "all",
          rulesText: rule.rules,
          savedRulesText: rule.rules,
          isDirty: false,
        });
      } else {
        // 没有任何规则，使用空白
        this.setState({
          scope: "current",
          rulesText: "",
          savedRulesText: "",
          isDirty: false,
        });
      }
    } catch (error) {
      console.error("Failed to load replace rules:", error);
    }
  };

  // 保存替换规则
  handleConfirm = async () => {
    const { scope, rulesText } = this.state;

    try {
      // 验证规则（静默处理错误，只返回有效规则数）
      const validRulesCount = ReplaceUtil.validateRules(rulesText);

      // 查找现有规则
      const allRules: ReplaceRule[] = await DatabaseService.getAllRecords(
        "replaceRules"
      );

      let existingRule: ReplaceRule | undefined;

      if (scope === "current") {
        existingRule = allRules.find(
          (r) => r.bookKey === this.props.currentBook.key && r.scope === "current"
        );
      } else {
        existingRule = allRules.find((r) => r.scope === "all");
      }

      const now = new Date().getTime();

      if (existingRule) {
        // 更新现有规则
        existingRule.rules = rulesText;
        existingRule.updateTime = now;
        existingRule.isEnabled = validRulesCount > 0;
        await DatabaseService.updateRecord(existingRule, "replaceRules");
      } else {
        // 创建新规则
        const newRule = new ReplaceRule(
          new Date().getTime() + "",
          scope === "current" ? this.props.currentBook.key : "",
          scope,
          rulesText,
          validRulesCount > 0,
          now,
          now
        );
        await DatabaseService.saveRecord(newRule, "replaceRules");
      }

      this.setState({
        savedRulesText: rulesText,
        isDirty: false,
      });

      // 重新渲染书籍以应用新规则
      if (this.props.renderBookFunc) {
        this.props.renderBookFunc();
      } else {
        console.warn("renderBookFunc is not available");
      }
    } catch (error) {
      console.error("Failed to save replace rules:", error);
    }
  };

  // 取消修改
  handleCancel = () => {
    this.setState({
      rulesText: this.state.savedRulesText,
      isDirty: false,
    });
  };

  // 处理规则文本变化
  handleRulesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      rulesText: event.target.value,
      isDirty: event.target.value !== this.state.savedRulesText,
    });
  };

  // 处理作用域变化
  handleScopeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      scope: event.target.value,
      isDirty: true,
    });
  };

  render() {
    const { scope, rulesText, isDirty } = this.state;

    return (
      <div className="replace-list-container">
        <div className="replace-scope-selector">
          <div className="replace-scope-option">
            <input
              type="radio"
              id="scope-current"
              name="scope"
              value="current"
              checked={scope === "current"}
              onChange={this.handleScopeChange}
            />
            <label htmlFor="scope-current">
              <Trans>Current Book Only</Trans>
            </label>
          </div>
          <div className="replace-scope-option">
            <input
              type="radio"
              id="scope-all"
              name="scope"
              value="all"
              checked={scope === "all"}
              onChange={this.handleScopeChange}
            />
            <label htmlFor="scope-all">
              <Trans>All Books</Trans>
            </label>
          </div>
        </div>

        <div className="replace-rules-section">
          <label className="replace-rules-label">
            <Trans>Replacement Rules</Trans>
          </label>
          <span className="replace-rules-hint">
            <Trans>Rules Hint</Trans>
          </span>
          <textarea
            className="replace-rules-textarea"
            value={rulesText}
            onChange={this.handleRulesChange}
            placeholder={this.props.t("Rules Placeholder")}
          />
        </div>

        <div className="replace-save-status">
          <span
            className={`replace-status-indicator ${isDirty ? "unsaved" : "saved"}`}
          ></span>
          <span className="replace-status-text">
            {isDirty ? (
              <Trans>Unsaved Changes</Trans>
            ) : (
              <Trans>All Changes Saved</Trans>
            )}
          </span>
        </div>

        <div className="replace-button-group">
          <button
            className="replace-btn replace-btn-cancel"
            onClick={this.handleCancel}
            disabled={!isDirty}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            className="replace-btn replace-btn-confirm"
            onClick={this.handleConfirm}
          >
            <Trans>Confirm</Trans>
          </button>
        </div>
      </div>
    );
  }
}

export default ReplaceList;
