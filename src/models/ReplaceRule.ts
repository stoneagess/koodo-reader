class ReplaceRule {
  key: string;
  bookKey: string;
  scope: string;
  rules: string;
  isEnabled: boolean;
  createTime: number;
  updateTime: number;

  constructor(
    key: string,
    bookKey: string,
    scope: string,
    rules: string,
    isEnabled: boolean,
    createTime: number,
    updateTime: number
  ) {
    this.key = key;
    this.bookKey = bookKey;
    this.scope = scope;
    this.rules = rules;
    this.isEnabled = isEnabled;
    this.createTime = createTime;
    this.updateTime = updateTime;
  }
}

export default ReplaceRule;
